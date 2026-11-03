export function executedAgreementRecipients(input: {
  kind: "credentialing" | "agreement_only";
  signerEmail?: string | null;
  ownerEmail?: string | null;
  contactEmail?: string | null;
  notifyEmail: string;
}) {
  const candidates = [input.notifyEmail];
  if (input.kind === "agreement_only") {
    if (input.signerEmail) candidates.push(input.signerEmail);
  } else {
    if (input.ownerEmail) candidates.push(input.ownerEmail);
    if (input.contactEmail) candidates.push(input.contactEmail);
  }
  const recipients: string[] = [];
  for (const candidate of candidates) {
    const email = candidate.trim();
    if (email && !recipients.includes(email)) recipients.push(email);
  }
  return recipients;
}
