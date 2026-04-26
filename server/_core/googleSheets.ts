/**
 * Google Sheets integration via Google Apps Script Web App.
 * Posts intake data to the Apps Script endpoint which appends a row to the sheet
 * and sends a notification email to the owner.
 */

const APPS_SCRIPT_URL = process.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

export type SheetsPayload = {
  status: string;
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
    // Apps Script requires no-cors from browser; from server we can do a normal fetch
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[GoogleSheets] Non-OK response: ${response.status}`);
    } else {
      console.log("[GoogleSheets] Row logged successfully.");
    }
  } catch (err) {
    // Non-fatal — log but don't throw
    console.error("[GoogleSheets] Failed to log row:", err);
  }
}
