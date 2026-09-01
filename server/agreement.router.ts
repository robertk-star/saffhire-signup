import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq as eqOp } from "drizzle-orm";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { signupIntakes } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { generateExecutedAgreementPdf } from "./_core/generateAgreementPdf";
import { SAFFHIRE_SIGNER_NAME, SAFFHIRE_SIGNER_TITLE, SAFFHIRE_NOTIFY_EMAIL } from "../shared/const";

function parseLog(raw?: string | null) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function appBaseUrl() {
  return process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${(process.env.PUBLIC_APP_URL || process.env.APP_URL || "").replace(/^https?:\/\//, "") || process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "";
}

export const agreementRouter = router({
  clientSign: publicProcedure
    .input(z.object({
      intakeId: z.number(),
      signerName: z.string().min(1),
      signerTitle: z.string().min(1),
      signatureDataUrl: z.string().min(20),
      agreedToServiceAgreement: z.boolean(),
      acknowledgedFcraRights: z.boolean(),
      acknowledgedUserNotice: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      if (!input.agreedToServiceAgreement || !input.acknowledgedFcraRights || !input.acknowledgedUserNotice) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "All three acknowledgements are required." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db.select().from(signupIntakes).where(eqOp(signupIntakes.id, input.intakeId)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const data = parseLog(row.conversationLog);
      const token = randomBytes(24).toString("hex");
      data.agreement = {
        signerName: input.signerName,
        signerTitle: input.signerTitle,
        signatureDataUrl: input.signatureDataUrl,
        signedAt: new Date().toISOString(),
        companyName: data.companyName,
        agreedToServiceAgreement: true,
        acknowledgedFcraRights: true,
        acknowledgedUserNotice: true,
        countersignToken: token,
        status: "client_signed",
      };
      await db.update(signupIntakes).set({
        conversationLog: JSON.stringify(data),
        updatedAt: new Date(),
      }).where(eqOp(signupIntakes.id, input.intakeId));

      const base = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, "");
      const link = base
        ? `${base}/countersign/${input.intakeId}?token=${token}`
        : `/countersign/${input.intakeId}?token=${token}`;

      await notifyOwner({
        title: `Client signed Service Agreement: ${data.companyName || "Client"}`,
        content: `The client signed the 2026 Service Agreement. Open this link to review the client-signed agreement and countersign as ${SAFFHIRE_SIGNER_NAME}, ${SAFFHIRE_SIGNER_TITLE}: <p><a href="${link}">${link}</a></p>`,
      });
      return { signed: true };
    }),

  getForCountersign: publicProcedure
    .input(z.object({ id: z.number(), token: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db.select().from(signupIntakes).where(eqOp(signupIntakes.id, input.id)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });
      const data = parseLog(row.conversationLog);
      const agreement = data.agreement || {};
      if (!agreement.countersignToken || agreement.countersignToken !== input.token) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid countersign link" });
      }
      return {
        companyName: data.companyName || agreement.companyName || "",
        signerName: agreement.signerName || "",
        signerTitle: agreement.signerTitle || "",
        signatureDataUrl: agreement.signatureDataUrl || "",
        signedAt: agreement.signedAt || "",
        status: agreement.status || "client_signed",
      };
    }),

  countersignByToken: publicProcedure
    .input(z.object({
      id: z.number(),
      token: z.string().min(10),
      signatureDataUrl: z.string().min(20),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db.select().from(signupIntakes).where(eqOp(signupIntakes.id, input.id)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });
      const data = parseLog(row.conversationLog);
      const clientAgreement = data.agreement || {};
      if (!clientAgreement.countersignToken || clientAgreement.countersignToken !== input.token) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid countersign link" });
      }
      const signedAt = new Date().toISOString();
      data.agreement = {
        ...clientAgreement,
        saffhireSignerName: SAFFHIRE_SIGNER_NAME,
        saffhireSignerTitle: SAFFHIRE_SIGNER_TITLE,
        saffhireSignatureDataUrl: input.signatureDataUrl,
        saffhireSignedAt: signedAt,
        status: "fully_executed",
      };
      await db.update(signupIntakes).set({
        conversationLog: JSON.stringify(data),
        updatedAt: new Date(),
      }).where(eqOp(signupIntakes.id, input.id));

      const executedPdf = generateExecutedAgreementPdf({
        companyName: data.companyName || clientAgreement.companyName,
        clientSignerName: clientAgreement.signerName,
        clientSignerTitle: clientAgreement.signerTitle,
        clientSignatureDataUrl: clientAgreement.signatureDataUrl,
        clientSignedAt: clientAgreement.signedAt,
        saffhireSignerName: SAFFHIRE_SIGNER_NAME,
        saffhireSignerTitle: SAFFHIRE_SIGNER_TITLE,
        saffhireSignatureDataUrl: input.signatureDataUrl,
        saffhireSignedAt: signedAt,
      });
      const recipients = [SAFFHIRE_NOTIFY_EMAIL];
      if (data.ownerEmail) recipients.push(data.ownerEmail);
      if (data.contactEmail && data.contactEmail !== data.ownerEmail) recipients.push(data.contactEmail);
      const safeName = (data.companyName || "Client").replace(/[^a-z0-9]/gi, "_").slice(0, 40);
      await notifyOwner({
        title: `Executed Service Agreement: ${data.companyName || "Client"}`,
        content: `The 2026 SaffHire Service Agreement is fully executed. SaffHire signed as ${SAFFHIRE_SIGNER_NAME}, ${SAFFHIRE_SIGNER_TITLE}. The attached PDF includes the full agreement, the Summary of Rights, the Notice to Users, and both signatures.`,
        to: recipients,
        extraAttachments: [{
          filename: `SaffHire_Service_Agreement_${safeName}.pdf`,
          content: executedPdf,
        }],
      });
      return { signed: true };
    }),
});
