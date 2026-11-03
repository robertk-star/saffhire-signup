import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Resend } from "resend";
import { generateIntakePdf } from "./generatePdf";
import { SAFFHIRE_NOTIFY_EMAIL } from "../../shared/const";

export type NotificationPayload = {
  title: string;
  content: string;
  formData?: any;
  to?: string[];
  extraAttachments?: Array<{ filename: string; content: Buffer }>;
};

async function captureOutgoingEmail(
  dir: string,
  recipient: string,
  subject: string,
  html: string,
  attachments: Array<{ filename: string; content: string }>,
) {
  await mkdir(dir, { recursive: true });
  const stamp = `${Date.now()}-${recipient.replace(/[^a-z0-9@.]/gi, "_")}`;
  await writeFile(path.join(dir, `${stamp}.json`), JSON.stringify({ to: recipient, subject, html }, null, 2));
  for (const attachment of attachments) {
    await writeFile(path.join(dir, `${stamp}-${attachment.filename}`), Buffer.from(attachment.content, "base64"));
  }
}

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const captureDir = process.env.EMAIL_CAPTURE_DIR;

  if (!apiKey && !captureDir) {
    console.warn("[Notification] RESEND_API_KEY is not set");
    return false;
  }

  try {
    const resend = apiKey ? new Resend(apiKey) : null;
    const attachments: any[] = [];

    if (payload.formData) {
      try {
        const pdfBuffer = generateIntakePdf(payload.formData);
        const companyName = payload.formData.companyName || "Application";
        const safeName = companyName.replace(/[^a-z0-9]/gi, "_").substring(0, 40);
        attachments.push({
          filename: `SaffHire_Application_${safeName}.pdf`,
          content: pdfBuffer.toString("base64"),
        });
      } catch (pdfErr) {
        console.warn("[Notification] Failed to generate PDF:", pdfErr);
      }
    }

    for (const extra of payload.extraAttachments || []) {
      attachments.push({
        filename: extra.filename,
        content: extra.content.toString("base64"),
      });
    }

    const recipients = [...new Set((payload.to || [SAFFHIRE_NOTIFY_EMAIL]).filter(Boolean))];
    let sentAny = false;

    for (const recipient of recipients) {
      const html = `
          <h2>${payload.title}</h2>
          <p>${payload.content}</p>
          <hr />
          <p style="color:#666;font-size:14px;">
            This email was sent automatically by SaffHire account setup.
          </p>
        `;
      if (captureDir) {
        try {
          await captureOutgoingEmail(captureDir, recipient, payload.title, html, attachments);
          sentAny = true;
        } catch (captureErr) {
          console.warn("[Notification] Email capture failed", captureErr);
        }
      }
      if (!resend) continue;
      const { error } = await resend.emails.send({
        from: "SaffHire Signup <onboarding@resend.dev>",
        to: [recipient],
        subject: payload.title,
        html,
        attachments,
      });
      if (error) {
        console.warn("[Notification] Resend error for", recipient, error);
      } else {
        console.log("[Notification] Email sent to", recipient);
        sentAny = true;
      }
    }

    return sentAny;
  } catch (err) {
    console.warn("[Notification] Failed to send email:", err);
    return false;
  }
}
