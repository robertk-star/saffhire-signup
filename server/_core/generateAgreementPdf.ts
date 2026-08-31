import { jsPDF } from "jspdf";
import { SAFFHIRE_SIGNER_NAME, SAFFHIRE_SIGNER_TITLE } from "../../shared/const";

export type AgreementParties = {
  companyName?: string;
  clientSignerName?: string;
  clientSignerTitle?: string;
  clientSignatureDataUrl?: string;
  clientSignedAt?: string;
  saffhireSignerName?: string;
  saffhireSignerTitle?: string;
  saffhireSignatureDataUrl?: string;
  saffhireSignedAt?: string;
};

function addSignatureImage(doc: jsPDF, dataUrl: string | undefined, x: number, y: number) {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return;
  try {
    const format = dataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(dataUrl, format, x, y, 70, 22);
  } catch (err) {
    console.warn("[AgreementPDF] Could not embed signature image", err);
  }
}

export function generateExecutedAgreementPdf(input: AgreementParties): Buffer {
  const doc = new jsPDF();
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SAFFHIRE SERVICE AGREEMENT", 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SaffHire Background Screening LLC  |  Executed copy", 20, y);
  y += 10;
  const paragraphs = [
    "This Service Agreement is entered into between SaffHire Background Screening LLC (SaffHire) and the undersigned Client. It governs SaffHire's provision of background screening and related services.",
    "1. Services. SaffHire will provide background checks, verifications, and other consumer reports for permissible purposes under the FCRA, DPPA, and applicable law.",
    "2. Client certifications. Client certifies a legitimate business need and permissible purpose; reports are for one-time end-user use; reports will not be sold or transferred except as permitted.",
    "3. Employment and housing. Before requesting reports, Client will provide required disclosures, obtain written authorization, provide the FCRA Summary of Rights, and follow adverse action procedures.",
    "4. Record keeping. Client will maintain compliance documentation for at least six years or the duration of the consumer relationship, whichever is longer.",
    "5. Legal compliance. Client is solely responsible for complying with laws governing use of reports. SaffHire does not provide legal advice and may audit or suspend service for non-cooperation.",
    "6. Fees. Fees follow current SaffHire pricing and may change with 30 days notice. Invoices are due in 15 days.",
    "7. Confidentiality. Client will protect report data, limit access, dispose of data under FTC Disposal Rules, and notify SaffHire of a breach within 24 business hours.",
    "8. Liability. SaffHire is not responsible for inaccurate third-party data unless it had actual knowledge and the legal ability to correct it. Each party indemnifies the other for its own violations.",
    "9. Termination. Client may terminate with written notice and payment of outstanding charges. SaffHire may terminate immediately for non-payment, misuse, or material breach. Texas law governs.",
    "By signing, Client acknowledges receipt of the Summary of Rights under the FCRA, the Notice to Users of Consumer Reports, and this Service Agreement.",
  ];
  doc.setFontSize(10);
  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph, 170);
    if (y + lines.length * 5 > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, 20, y);
    y += lines.length * 5 + 4;
  }
  doc.addPage();
  y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Signatures", 20, y);
  y += 12;
  doc.setFontSize(11);
  doc.text("SAFFHIRE", 20, y);
  y += 8;
  addSignatureImage(doc, input.saffhireSignatureDataUrl, 20, y);
  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`By: ${input.saffhireSignerName || SAFFHIRE_SIGNER_NAME}`, 20, y);
  y += 6;
  doc.text(`Name: ${input.saffhireSignerName || SAFFHIRE_SIGNER_NAME}`, 20, y);
  y += 6;
  doc.text(`Title: ${input.saffhireSignerTitle || SAFFHIRE_SIGNER_TITLE}`, 20, y);
  y += 6;
  doc.text(`Date: ${input.saffhireSignedAt ? new Date(input.saffhireSignedAt).toLocaleDateString() : ""}`, 20, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLIENT", 20, y);
  y += 8;
  addSignatureImage(doc, input.clientSignatureDataUrl, 20, y);
  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Business Name: ${input.companyName || ""}`, 20, y);
  y += 6;
  doc.text(`By: ${input.clientSignerName || ""}`, 20, y);
  y += 6;
  doc.text(`Name: ${input.clientSignerName || ""}`, 20, y);
  y += 6;
  doc.text(`Title: ${input.clientSignerTitle || ""}`, 20, y);
  y += 6;
  doc.text(`Date: ${input.clientSignedAt ? new Date(input.clientSignedAt).toLocaleDateString() : ""}`, 20, y);
  y += 18;
  doc.setFontSize(9);
  const footer = doc.splitTextToSize(
    "This executed copy includes the client electronic signature captured during account setup and the SaffHire countersignature of Robert Krebsbach, President.",
    170,
  );
  doc.text(footer, 20, y);
  return Buffer.from(doc.output("arraybuffer"));
}
