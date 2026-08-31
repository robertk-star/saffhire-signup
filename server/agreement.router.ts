import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq as eqOp } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { signupIntakes } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { generateExecutedAgreementPdf } from "./_core/generateAgreementPdf";
import { SAFFHIRE_SIGNER_NAME, SAFFHIRE_SIGNER_TITLE, SAFFHIRE_NOTIFY_EMAIL } from "../shared/const";

export const agreementRouter = router({
  countersign: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .input(z.object({
      id: z.number(),
      signatureDataUrl: z.string().min(20),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db.select().from(signupIntakes).where(eqOp(signupIntakes.id, input.id)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Intake not found" });
      let data: Record<string, any> = {};
      try {
        data = row.conversationLog ? JSON.parse(row.conversationLog) : {};
      } catch {
        data = {};
      }
      const clientAgreement = data.agreement || {
        signerName: data.signerName,
        signerTitle: data.signerTitle,
        signatureDataUrl: data.signatureDataUrl,
        signedAt: data.signedAt,
        companyName: data.companyName,
      };
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
        content: `The 2026 SaffHire Service Agreement is fully executed. SaffHire signed as ${SAFFHIRE_SIGNER_NAME}, ${SAFFHIRE_SIGNER_TITLE}. A signed copy is attached for both parties.`,
        to: recipients,
        extraAttachments: [{
          filename: `SaffHire_Service_Agreement_${safeName}.pdf`,
          content: executedPdf,
        }],
      });
      return { signed: true };
    }),
});
