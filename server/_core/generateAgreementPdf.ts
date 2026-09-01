import { jsPDF } from "jspdf";
import { SAFFHIRE_SIGNER_NAME, SAFFHIRE_SIGNER_TITLE } from "../../shared/const";
import { SERVICE_AGREEMENT_SECTIONS, FCRA_SUMMARY_OF_RIGHTS, NOTICE_TO_USERS } from "../../shared/agreementText";

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

function writeBlock(doc: jsPDF, title: string, body: string, y: number) {
  const lines = doc.splitTextToSize(body, 170);
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 20, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 20, y);
    y += 5;
  }
  return y + 6;
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
  y += 12;
  for (const section of SERVICE_AGREEMENT_SECTIONS) {
    y = writeBlock(doc, section.title, section.body, y);
  }
  y = writeBlock(doc, "Summary of Rights under the FCRA", FCRA_SUMMARY_OF_RIGHTS, y);
  y = writeBlock(doc, "Notice to Users of Consumer Reports", NOTICE_TO_USERS, y);
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
  return Buffer.from(doc.output("arraybuffer"));
}
