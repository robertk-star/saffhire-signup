import { Resend } from "resend";

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Sends an email notification to robertk@saffhire.com via Resend
 * when a new form is submitted.
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

    const { error } = await resend.emails.send({
      from: "SaffHire Signup <onboarding@resend.dev>", // change later after you verify a domain
      to: ["robertk@saffhire.com"],
      subject: payload.title,
      html: `
        <h2>${payload.title}</h2>
        <p>${payload.content}</p>
        <hr />
        <p style="color:#666;font-size:14px;">
          This email was sent automatically when a new credentialing application was submitted.
        </p>
      `,
    });

    if (error) {
      console.warn("[Notification] Resend error:", error);
      return false;
    }

    console.log("[Notification] Email sent successfully");
    return true;
  } catch (err) {
    console.warn("[Notification] Failed to send email:", err);
    return false;
  }
}
