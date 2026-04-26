/**
 * GoHighLevel CRM integration.
 * Creates or updates a contact and creates an opportunity when a new intake is submitted.
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_KEY = process.env.GOHIGHLEVEL_API_KEY_TEMP || process.env.GOHIGHLEVEL_API_KEY_PROD || "";
const GHL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID || "";

type GHLContactPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  tags?: string[];
  customField?: Record<string, string>;
};

async function ghlRequest(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
): Promise<unknown> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.warn("[GoHighLevel] API key or location ID not configured — skipping.");
    return null;
  }

  const res = await fetch(`${GHL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[GoHighLevel] ${method} ${path} failed (${res.status}): ${text}`);
    return null;
  }

  return res.json();
}

export async function upsertGHLContact(data: {
  companyName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  businessStreet?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;
  ein?: string;
  businessEntity?: string;
}): Promise<string | null> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) return null;

  const payload: GHLContactPayload = {
    firstName: data.ownerFirstName,
    lastName: data.ownerLastName,
    email: data.ownerEmail,
    phone: data.ownerPhone,
    companyName: data.companyName,
    address1: data.businessStreet,
    city: data.businessCity,
    state: data.businessState,
    postalCode: data.businessZip,
    tags: ["SaffHire Signup", "New Account Setup"],
    customField: {
      ein: data.ein || "",
      business_entity: data.businessEntity || "",
    },
  };

  try {
    const result = await ghlRequest("POST", `/contacts/?locationId=${GHL_LOCATION_ID}`, payload) as { contact?: { id?: string } } | null;
    const contactId = result?.contact?.id || null;
    if (contactId) {
      console.log(`[GoHighLevel] Contact upserted: ${contactId}`);
    }
    return contactId;
  } catch (err) {
    console.error("[GoHighLevel] Failed to upsert contact:", err);
    return null;
  }
}

export async function createGHLOpportunity(
  contactId: string,
  companyName: string
): Promise<void> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID || !contactId) return;

  try {
    await ghlRequest("POST", `/opportunities/`, {
      locationId: GHL_LOCATION_ID,
      name: `${companyName} — Account Setup`,
      contactId,
      status: "open",
      source: "SaffHire Signup Form",
    });
    console.log(`[GoHighLevel] Opportunity created for contact ${contactId}`);
  } catch (err) {
    console.error("[GoHighLevel] Failed to create opportunity:", err);
  }
}
