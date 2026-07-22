import { jsPDF } from "jspdf";

type FormInput = {
  companyName?: string;
  dba?: string;
  ein?: string;
  businessType?: string;
  businessEntity?: string;
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerPhoneExt?: string;
  contactName?: string;
  contactEmail?: string;
  contactWorkPhone?: string;
  contactMobilePhone?: string;
  businessStreet?: string;
  businessStreet2?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;
  businessCountry?: string;
  billingSameAsBusiness?: string;
  billingStreet?: string;
  billingStreet2?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  billingAttention?: string;
  adminUsers?: Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
  }>;
};

function line(doc: jsPDF, label: string, value: string | undefined, y: number): number {
  if (!value) return y;
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(value, 70, y);
  return y + 8;
}

function section(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 20, y);
  doc.setFontSize(11);
  return y + 10;
}

export function generateIntakePdf(input: FormInput): Buffer {
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SaffHire Credentialing Application", 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Submitted: ${new Date().toLocaleString()}`, 20, y);
  y += 15;

  // Client Information
  y = section(doc, "Client Information", y);
  y = line(doc, "Company Name", input.companyName, y);
  y = line(doc, "DBA", input.dba, y);
  y = line(doc, "EIN", input.ein, y);
  y = line(doc, "Business Type", input.businessType, y);
  y = line(doc, "Business Entity", input.businessEntity, y);
  y = line(doc, "Owner Name", input.ownerName, y);
  y = line(doc, "Owner Email", input.ownerEmail, y);
  y = line(doc, "Owner Phone", input.ownerPhone, y);
  if (input.ownerPhoneExt) y = line(doc, "Ext", input.ownerPhoneExt, y);
  y += 6;

  // Contact Information
  y = section(doc, "Contact Information", y);
  y = line(doc, "Contact Name", input.contactName, y);
  y = line(doc, "Contact Email", input.contactEmail, y);
  y = line(doc, "Work Phone", input.contactWorkPhone, y);
  y = line(doc, "Mobile Phone", input.contactMobilePhone, y);
  y += 6;

  // Business Address
  y = section(doc, "Business Address", y);
  y = line(doc, "Street", input.businessStreet, y);
  if (input.businessStreet2) y = line(doc, "Line 2", input.businessStreet2, y);
  y = line(doc, "City", input.businessCity, y);
  y = line(doc, "State", input.businessState, y);
  y = line(doc, "ZIP", input.businessZip, y);
  y = line(doc, "Country", input.businessCountry, y);
  y += 6;

  // Billing Address
  if (input.billingSameAsBusiness !== "true") {
    y = section(doc, "Billing Address", y);
    y = line(doc, "Street", input.billingStreet, y);
    if (input.billingStreet2) y = line(doc, "Line 2", input.billingStreet2, y);
    y = line(doc, "City", input.billingCity, y);
    y = line(doc, "State", input.billingState, y);
    y = line(doc, "ZIP", input.billingZip, y);
    y = line(doc, "Country", input.billingCountry, y);
    y = line(doc, "Attention", input.billingAttention, y);
    y += 6;
  } else {
    y = section(doc, "Billing Address", y);
    doc.setFont("helvetica", "normal");
    doc.text("Same as Business Address", 20, y);
    y += 12;
  }

  // Admin Users
  if (input.adminUsers && input.adminUsers.length > 0) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    y = section(doc, "Admin Users", y);
    input.adminUsers.forEach((user, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`User ${index + 1}`, 20, y);
      y += 7;
      y = line(doc, "Name", `${user.firstName || ""} ${user.lastName || ""}`.trim(), y);
      y = line(doc, "Email", user.email, y);
      y = line(doc, "Phone", user.phone, y);
      y = line(doc, "Job Title", user.jobTitle, y);
      y += 4;
    });
  }

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
