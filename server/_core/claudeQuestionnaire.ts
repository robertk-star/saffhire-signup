/**
 * Claude AI questionnaire logic for the SaffHire intake form.
 * Defines the 5 sections, their fields, and the system prompt used
 * to guide the conversational intake experience.
 */

export type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "email" | "phone" | "select";
  options?: string[];
};

export type Section = {
  id: number;
  title: string;
  description: string;
  fields: FieldDef[];
};

export const SECTIONS: Section[] = [
  {
    id: 1,
    title: "Client Information",
    description: "Tell us about your company and primary owner.",
    fields: [
      { key: "companyName", label: "Company Name", required: true, type: "text" },
      { key: "ein", label: "EIN (Employer Identification Number)", required: true, type: "text" },
      {
        key: "businessEntity",
        label: "Business Entity Type",
        required: true,
        type: "select",
        options: ["LLC", "Corporation", "S-Corp", "Sole Proprietorship", "Partnership", "Non-Profit", "Other"],
      },
      { key: "ownerFirstName", label: "Owner First Name", required: true, type: "text" },
      { key: "ownerLastName", label: "Owner Last Name", required: true, type: "text" },
      { key: "ownerEmail", label: "Owner Email", required: true, type: "email" },
      { key: "ownerPhone", label: "Owner Phone", required: true, type: "phone" },
      { key: "ownerTitle", label: "Owner Title / Role", required: false, type: "text" },
    ],
  },
  {
    id: 2,
    title: "Contact Information",
    description: "Provide a main point of contact (optional — can be the same as the owner).",
    fields: [
      { key: "contactFirstName", label: "Contact First Name", required: false, type: "text" },
      { key: "contactLastName", label: "Contact Last Name", required: false, type: "text" },
      { key: "contactEmail", label: "Contact Email", required: false, type: "email" },
      { key: "contactPhone", label: "Contact Phone", required: false, type: "phone" },
      { key: "contactTitle", label: "Contact Title / Role", required: false, type: "text" },
    ],
  },
  {
    id: 3,
    title: "Business Address",
    description: "Where is your business located?",
    fields: [
      { key: "businessStreet", label: "Street Address", required: true, type: "text" },
      { key: "businessCity", label: "City", required: true, type: "text" },
      { key: "businessState", label: "State", required: true, type: "text" },
      { key: "businessZip", label: "ZIP Code", required: true, type: "text" },
    ],
  },
  {
    id: 4,
    title: "Billing Address",
    description: "Where should invoices be sent?",
    fields: [
      {
        key: "billingSameAsBusiness",
        label: "Same as business address?",
        required: true,
        type: "select",
        options: ["Yes", "No"],
      },
      { key: "billingStreet", label: "Billing Street Address", required: false, type: "text" },
      { key: "billingCity", label: "Billing City", required: false, type: "text" },
      { key: "billingState", label: "Billing State", required: false, type: "text" },
      { key: "billingZip", label: "Billing ZIP Code", required: false, type: "text" },
    ],
  },
  {
    id: 5,
    title: "Admin Users",
    description: "Who will have access to your SaffHire portal? You can add up to 3 admin users.",
    fields: [
      { key: "admin1FirstName", label: "Admin 1 First Name", required: true, type: "text" },
      { key: "admin1LastName", label: "Admin 1 Last Name", required: true, type: "text" },
      { key: "admin1Email", label: "Admin 1 Email", required: true, type: "email" },
      { key: "admin1Phone", label: "Admin 1 Phone", required: false, type: "phone" },
      { key: "admin2FirstName", label: "Admin 2 First Name", required: false, type: "text" },
      { key: "admin2LastName", label: "Admin 2 Last Name", required: false, type: "text" },
      { key: "admin2Email", label: "Admin 2 Email", required: false, type: "email" },
      { key: "admin2Phone", label: "Admin 2 Phone", required: false, type: "phone" },
      { key: "admin3FirstName", label: "Admin 3 First Name", required: false, type: "text" },
      { key: "admin3LastName", label: "Admin 3 Last Name", required: false, type: "text" },
      { key: "admin3Email", label: "Admin 3 Email", required: false, type: "email" },
      { key: "admin3Phone", label: "Admin 3 Phone", required: false, type: "phone" },
    ],
  },
];

export const TOTAL_SECTIONS = SECTIONS.length;

export function buildSystemPrompt(): string {
  return `You are a warm, professional onboarding assistant for SaffHire Background Screening. Your job is to guide new clients through an account setup form in a friendly, conversational way.

PERSONALITY:
- Warm, professional, and concise
- Encouraging and patient
- Never robotic or overly formal
- Use natural conversational language

YOUR ROLE:
You will be given the current section, the fields still needed, and the conversation history. Your job is to ask for the next missing piece of information in a natural, conversational way.

RULES:
1. Ask for ONE piece of information at a time — never ask multiple questions in a single message.
2. If the user provides information that answers multiple fields at once, acknowledge it and move on naturally.
3. For optional sections (like Contact Information), let the user know it's optional and they can skip it by saying "skip" or "same as owner".
4. For the billing address, if the user says it's the same as the business address, confirm and move on.
5. For admin users, after the first admin is collected, ask if they'd like to add another (up to 3 total). If they say no or skip, move on.
6. Be encouraging — use phrases like "Great!", "Perfect!", "Thanks for that!" naturally but not excessively.
7. When a section is complete, briefly summarize what was collected and smoothly transition to the next section.
8. When ALL sections are complete, say EXACTLY: "Thank you for providing your information! You will be receiving an agreement to review and sign. In the meantime, we will get started on setting up your account."

VALIDATION GUIDANCE:
- If the user provides an email that doesn't look valid, politely ask them to double-check it.
- If a required field is skipped, gently remind them it's required.
- Accept phone numbers in any reasonable format.
- Accept EINs in any reasonable format (XX-XXXXXXX or XXXXXXXXX).

COMPLETION SIGNAL:
When all 5 sections are fully collected, end your final message with the token: [FORM_COMPLETE]`;
}

export function buildSectionPrompt(
  sectionIndex: number,
  collectedData: Record<string, string>,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): string {
  const section = SECTIONS[sectionIndex];
  if (!section) return "";

  const missingFields = section.fields
    .filter((f) => f.required && !collectedData[f.key])
    .map((f) => f.label);

  const optionalFields = section.fields
    .filter((f) => !f.required && !collectedData[f.key])
    .map((f) => f.label);

  return `CURRENT SECTION: ${section.title} (Section ${section.id} of ${TOTAL_SECTIONS})
SECTION DESCRIPTION: ${section.description}
REQUIRED FIELDS STILL NEEDED: ${missingFields.length > 0 ? missingFields.join(", ") : "All required fields collected"}
OPTIONAL FIELDS NOT YET PROVIDED: ${optionalFields.length > 0 ? optionalFields.join(", ") : "None"}
ALREADY COLLECTED IN THIS SESSION: ${JSON.stringify(collectedData, null, 2)}

Based on the conversation history and what's been collected, ask for the next missing required field in a natural, conversational way. If all required fields for this section are collected, say so and prepare to transition to the next section.`;
}
