/**
 * GoHighLevel (GHL) Integration
 * Handles contact creation/updates and tagging for credentialing intakes
 * Uses GHL API v2 (2021-07-28)
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_KEY = process.env.GOHIGHLEVEL_API_KEY_TEMP || "";
const GHL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID || "";
const INTAKE_TAG_NAME = "Intake";
const API_VERSION = "2021-07-28";
const REQUEST_TIMEOUT = 5000; // 5 seconds

/**
 * Helper to make fetch requests with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Create or update a contact in GHL
 * GHL will automatically detect duplicates and update if exists
 */
async function createOrUpdateContact(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
}): Promise<string | null> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.warn("[GHL] Missing credentials for contact creation");
    return null;
  }

  try {
    const payload = {
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      email: input.email || "",
      phone: input.phone || "",
      companyName: input.companyName || "",
      locationId: GHL_LOCATION_ID,
    };

    const response = await fetchWithTimeout(`${GHL_API_BASE}/contacts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: API_VERSION,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GHL] Create/update contact failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const contactId = data.contact?.id || data.id;
    
    if (contactId) {
      console.log(`[GHL] Contact created/updated: ${contactId}`);
      return contactId;
    }
    
    return null;
  } catch (err) {
    console.error("[GHL] Contact creation/update error:", err);
    return null;
  }
}

/**
 * Get a contact by ID to retrieve current tags
 */
async function getContact(contactId: string): Promise<any> {
  if (!GHL_API_KEY) {
    console.warn("[GHL] Missing credentials for get contact");
    return null;
  }

  try {
    const response = await fetchWithTimeout(`${GHL_API_BASE}/contacts/${contactId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: API_VERSION,
      },
    });

    if (!response.ok) {
      console.error(`[GHL] Get contact failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.contact || data;
  } catch (err) {
    console.error("[GHL] Get contact error:", err);
    return null;
  }
}

/**
 * Update a contact with new tags
 */
async function updateContactTags(contactId: string, tags: string[]): Promise<boolean> {
  if (!GHL_API_KEY) {
    console.warn("[GHL] Missing credentials for update contact");
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${GHL_API_BASE}/contacts/${contactId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: API_VERSION,
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GHL] Update tags failed: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`[GHL] Updated contact ${contactId} with tags: ${tags.join(", ")}`);
    return true;
  } catch (err) {
    console.error("[GHL] Update tags error:", err);
    return false;
  }
}

/**
 * Create or update contact and add Intake tag
 * Returns contact ID if successful
 */
export async function upsertContactWithIntakeTag(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
}): Promise<string | null> {
  try {
    // Create or update the contact (GHL handles duplicates automatically)
    const contactId = await createOrUpdateContact(input);
    if (!contactId) {
      console.warn("[GHL] Failed to create or update contact");
      return null;
    }

    // Get current contact to see existing tags
    const contact = await getContact(contactId);
    if (!contact) {
      console.warn("[GHL] Failed to retrieve contact after creation");
      return contactId; // Still return ID even if we can't get tags
    }

    const existingTags = contact.tags || [];
    
    // Check if Intake tag already exists
    if (existingTags.includes(INTAKE_TAG_NAME)) {
      console.log(`[GHL] Contact ${contactId} already has "${INTAKE_TAG_NAME}" tag`);
      return contactId;
    }

    // Add Intake tag
    const updatedTags = [...existingTags, INTAKE_TAG_NAME];
    const tagAdded = await updateContactTags(contactId, updatedTags);
    
    if (!tagAdded) {
      console.warn(`[GHL] Failed to add "${INTAKE_TAG_NAME}" tag to contact ${contactId}`);
      // Still return contact ID even if tagging fails
    }

    return contactId;
  } catch (err) {
    console.error("[GHL] Upsert contact error:", err);
    return null;
  }
}
