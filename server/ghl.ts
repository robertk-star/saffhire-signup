/**
 * GoHighLevel (GHL) Integration
 * Handles contact creation/updates and tagging for credentialing intakes
 */

const GHL_API_BASE = "https://rest.gohighlevel.com/v1";
const GHL_API_KEY = process.env.GOHIGHLEVEL_API_KEY_TEMP || "";
const GHL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID || "";
const INTAKE_TAG_NAME = "Intake";

/**
 * Search for an existing contact by email
 */
async function searchContactByEmail(email: string): Promise<string | null> {
  if (!email || !GHL_API_KEY || !GHL_LOCATION_ID) {
    console.warn("[GHL] Missing credentials for contact search");
    return null;
  }

  try {
    const response = await fetch(
      `${GHL_API_BASE}/contacts/search?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`[GHL] Search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    // GHL returns contacts array; return first match ID
    if (data.contacts && data.contacts.length > 0) {
      return data.contacts[0].id;
    }

    return null;
  } catch (err) {
    console.error("[GHL] Contact search error:", err);
    return null;
  }
}

/**
 * Create a new contact in GHL
 */
async function createContact(input: {
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

    const response = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GHL] Create contact failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data.id || null;
  } catch (err) {
    console.error("[GHL] Contact creation error:", err);
    return null;
  }
}

/**
 * Get or create tag by name, returns tag ID
 */
async function getOrCreateTag(tagName: string): Promise<string | null> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.warn("[GHL] Missing credentials for tag operations");
    return null;
  }

  try {
    // First, try to find existing tag
    const searchResponse = await fetch(
      `${GHL_API_BASE}/tags?locationId=${GHL_LOCATION_ID}&name=${encodeURIComponent(tagName)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data.tags && data.tags.length > 0) {
        return data.tags[0].id;
      }
    }

    // Tag doesn't exist, create it
    const createResponse = await fetch(`${GHL_API_BASE}/tags?locationId=${GHL_LOCATION_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: tagName,
      }),
    });

    if (!createResponse.ok) {
      console.error(`[GHL] Create tag failed: ${createResponse.status}`);
      return null;
    }

    const data = await createResponse.json();
    return data.id || null;
  } catch (err) {
    console.error("[GHL] Tag operation error:", err);
    return null;
  }
}

/**
 * Add tag to a contact
 */
async function addTagToContact(contactId: string, tagId: string): Promise<boolean> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.warn("[GHL] Missing credentials for tag assignment");
    return false;
  }

  try {
    const response = await fetch(
      `${GHL_API_BASE}/contacts/${contactId}/tags?locationId=${GHL_LOCATION_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tagId,
        }),
      }
    );

    if (!response.ok) {
      console.error(`[GHL] Add tag failed: ${response.status}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[GHL] Add tag error:", err);
    return false;
  }
}

/**
 * Upsert contact (create if doesn't exist, update if exists) and add Intake tag
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
    let contactId: string | null = null;

    // Try to find existing contact by email
    if (input.email) {
      contactId = await searchContactByEmail(input.email);
    }

    // If not found, create new contact
    if (!contactId) {
      contactId = await createContact(input);
      if (!contactId) {
        console.warn("[GHL] Failed to create contact");
        return null;
      }
      console.log(`[GHL] Created new contact: ${contactId}`);
    } else {
      console.log(`[GHL] Found existing contact: ${contactId}`);
    }

    // Get or create the "Intake" tag
    const tagId = await getOrCreateTag(INTAKE_TAG_NAME);
    if (!tagId) {
      console.warn("[GHL] Failed to get or create Intake tag");
      return contactId; // Still return contact ID even if tagging fails
    }

    // Add tag to contact
    const tagAdded = await addTagToContact(contactId, tagId);
    if (tagAdded) {
      console.log(`[GHL] Added Intake tag to contact ${contactId}`);
    } else {
      console.warn(`[GHL] Failed to add tag to contact ${contactId}`);
    }

    return contactId;
  } catch (err) {
    console.error("[GHL] Upsert contact error:", err);
    return null;
  }
}
