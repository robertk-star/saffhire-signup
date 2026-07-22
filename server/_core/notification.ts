import { Resend } from "resend";
import { generateIntakePdf } from "./generatePdf";

export type NotificationPayload = {
  title: string;
  content: string;
  formData?: any;
};

/**
 * Sends an email notification with a PDF attachment of the form data
 * to robertk@saffhire.com via Resend.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[Notification] RESEND_API_KEY is not set");
    return false;
  }

  try {
    const resend = new Resend(apiKey);

    // Generate PDF if form data is provided
    let attachments: any[] = [];
    if (payload.formData) {
      try {
        const pdfBuffer = generateIntakePdf(payload.formData);
        const companyName = payload.formData.companyName || "Application";
        const safeName = companyName.replace(/[^a-z0-9]/gi, "_").substring(0, 40);

        attachments.push({
          filename: `SaffHire_Application_${safeName}.pdf`,
          content: pdfBuffer,
        });
      } catch (pdfErr) {
        console.warn("[Notification] Failed to generate PDF:", pdfErr);
      }
    }

    const { error } = await resend.emails.send({
      from: "SaffHire Signup <onboarding@resend.dev>",
      to: ["robertk@saffhire.com"],
      subject: payload.title,
      html: `
        <h2>${payload.title}</h2>
        <p>${payload.content}</p>
        <p>A PDF of the full application is attached to this email.</p>
        <hr />
        <p style="color:#666;font-size:14px;">
          This email was sent automatically when a new credentialing application was submitted.
        </p>
      `,
      attachments,
    });

    if (error) {
      console.warn("[Notification] Resend error:", error);
      return false;
    }

    console.log("[Notification] Email with PDF sent successfully");
    return true;
  } catch (err) {
    console.warn("[Notification] Failed to send email:", err);
    return false;
  }
}
