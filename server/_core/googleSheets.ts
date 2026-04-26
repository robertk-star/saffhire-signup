/**
 * Google Sheets integration via Google Apps Script Web App.
 *
 * Google Apps Script redirects POST requests (302) to a script.googleusercontent.com URL.
 * Node's fetch does NOT follow cross-origin POST redirects automatically -- it converts them
 * to GET requests which returns a 405. We handle this manually:
 *   1. POST to the Apps Script URL with redirect: "manual"
 *   2. If we get a 302, extract the Location header and GET that URL
 *   3. Parse the JSON response from the redirect target
 *
 * Actions:
 *  - action: "upsert"  -> find an existing row by sessionId and update in-place,
 *                         or append a new row if no match is found.
 *  - action: "append"  -> always append a new row (used for final completed submissions).
 */

const APPS_SCRIPT_URL = process.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

export type SheetsPayload = {
  status: string;
  sessionId?: string;
  action?: "upsert" | "append"; // default: "append"
  companyName?: string;
  ein?: string;
  businessEntity?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerTitle?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactTitle?: string;
  businessStreet?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;
  billingSameAsBusiness?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  adminUsers?: string; // JSON string
  submittedAt?: string;
};

export async function logToGoogleSheets(payload: SheetsPayload): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    console.warn("[GoogleSheets] VITE_GOOGLE_APPS_SCRIPT_URL not configured — skipping sheet log.");
    return;
  }

  try {
    // Step 1: POST to Apps Script with manual redirect handling.
    // Google sends a 302 redirect to script.googleusercontent.com.
    // If we let fetch auto-follow, it converts the POST to a GET which returns 405.
    const postResponse = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
    });

    let finalResponse: Response;

    if (postResponse.status === 302 || postResponse.status === 301) {
      // Step 2: Follow the redirect with GET (what Google expects)
      const redirectUrl = postResponse.headers.get("location");
      if (!redirectUrl) {
        console.warn("[GoogleSheets] Redirect received but no Location header.");
        return;
      }
      finalResponse = await fetch(redirectUrl, { method: "GET" });
    } else {
      finalResponse = postResponse;
    }

    if (!finalResponse.ok) {
      const body = await finalResponse.text().catch(() => "");
      console.warn(`[GoogleSheets] Non-OK response: ${finalResponse.status} -- ${body.slice(0, 200)}`);
    } else {
      const result = await finalResponse.json().catch(() => ({})) as { success?: boolean; error?: string };
      if (result.success) {
        console.log(`[GoogleSheets] Row ${payload.action === "upsert" ? "upserted" : "appended"} successfully.`);
      } else {
        console.warn("[GoogleSheets] Script returned error:", result.error || JSON.stringify(result));
      }
    }
  } catch (err) {
    // Non-fatal -- log but don't throw so form submission still completes
    console.error("[GoogleSheets] Failed to log row:", err);
  }
}
