/**
 * Google Sheets integration via Google Apps Script Web App.
 *
 * The Apps Script endpoint supports two operations:
 *  - action: "upsert"  → find an existing row by sessionId and update it in-place,
 *                         or append a new row if no match is found.
 *  - action: "append"  → always append a new row (used for final completed submissions).
 *
 * This prevents duplicate partial rows when saveProgress is called multiple times
 * for the same browser session.
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
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[GoogleSheets] Non-OK response: ${response.status}`);
    } else {
      console.log(`[GoogleSheets] Row ${payload.action === "upsert" ? "upserted" : "appended"} successfully.`);
    }
  } catch (err) {
    // Non-fatal — log but don't throw
    console.error("[GoogleSheets] Failed to log row:", err);
  }
}
