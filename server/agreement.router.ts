import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { signupIntakes } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { generateExecutedAgreementPdf } from "./_core/generateAgreementPdf";
import { SAFFHIRE_SIGNER_NAME, SAFFHIRE_SIGNER_TITLE, SAFFHIRE_NOTIFY_EMAIL } from "../shared/const";
import { executedAgreementRecipients } from "./agreementRecipients";
import { createSignToken, tokensMatch } from "./signToken";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGN_TOKEN_RE = /^[a-f0-9]{64}$/;

const INVALID_SIGN_LINK = "This signing link is invalid.";
const USED_SIGN_LINK = "This signing link has already been used. The agreement cannot be signed again.";
const ALREADY_EXECUTED = "This agreement is already fully executed and cannot be signed again.";

function parseLog(raw?: string | null) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function originFromRequest(req: { headers?: Record<string, unknown> }) {
  const envUrl = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, "");
  if (envUrl) return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  const headers = req.headers || {};
  const host = String(headers["x-forwarded-host"] || headers.host || "").split(",")[0].trim();
  const proto = String(headers["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";
  if (host) return `${proto}://${host}`;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "";
}

function absoluteUrl(req: { headers?: Record<string, unknown> }, path: string) {
  const base = originFromRequest(req);
  return base ? `${base}${path}` : path;
}

function resolveStatus(row: { agreementStatus?: string | null; conversationLog?: string | null }) {
  const jsonStatus = parseLog(row.conversationLog).agreement?.status;
  if (row.agreementStatus === "fully_executed" || jsonStatus === "fully_executed") return "fully_executed";
  if (row.agreementStatus === "client_signed" || jsonStatus === "client_signed") return "client_signed";
  return "unsigned";
}

function executedPdfFor(data: Record<string, any>, clientAgreement: Record<string, any>, saffhireSignatureDataUrl?: string, saffhireSignedAt?: string) {
  const company = data.companyName || clientAgreement.companyName || "Client";
  const safeName = company.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  const pdf = generateExecutedAgreementPdf({
    companyName: company,
    clientSignerName: clientAgreement.signerName,
    clientSignerTitle: clientAgreement.signerTitle,
    clientSignatureDataUrl: clientAgreement.signatureDataUrl,
    clientSignedAt: clientAgreement.signatureAcceptedAt || clientAgreement.signedAt,
    saffhireSignerName: clientAgreement.saffhireSignerName || SAFFHIRE_SIGNER_NAME,
    saffhireSignerTitle: clientAgreement.saffhireSignerTitle || SAFFHIRE_SIGNER_TITLE,
    saffhireSignatureDataUrl: saffhireSignatureDataUrl || clientAgreement.saffhireSignatureDataUrl,
    saffhireSignedAt: saffhireSignedAt || clientAgreement.saffhireSignatureAcceptedAt || clientAgreement.saffhireSignedAt,
  });
  return {
    filename: `SaffHire_Service_Agreement_${safeName}.pdf`,
    pdf,
    company,
  };
}

function clientSignGuard(id: number, token: string) {
  return and(
    eq(signupIntakes.id, id),
    eq(signupIntakes.signToken, token),
    isNull(signupIntakes.signTokenUsedAt),
    eq(signupIntakes.agreementStatus, "unsigned"),
    sql`coalesce(${signupIntakes.conversationLog}, '') not like '%"status":"client_signed"%'`,
    sql`coalesce(${signupIntakes.conversationLog}, '') not like '%"status": "client_signed"%'`,
    sql`coalesce(${signupIntakes.conversationLog}, '') not like '%"status":"fully_executed"%'`,
    sql`coalesce(${signupIntakes.conversationLog}, '') not like '%"status": "fully_executed"%'`,
  );
}

function countersignGuard(id: number) {
  return and(
    eq(signupIntakes.id, id),
    or(
      eq(signupIntakes.agreementStatus, "client_signed"),
      and(
        eq(signupIntakes.agreementStatus, "unsigned"),
        sql`(
          ${signupIntakes.conversationLog} like '%"status":"client_signed"%'
          or ${signupIntakes.conversationLog} like '%"status": "client_signed"%'
        )`,
      ),
    ),
  );
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

const signTokenInput = z.string().regex(SIGN_TOKEN_RE, INVALID_SIGN_LINK);

export const agreementRouter = router({
  createSigningLink: adminProcedure
    .input(z.object({
      companyName: z.string().max(200).optional(),
      signerEmail: z.string().max(320).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const companyName = (input.companyName || "").trim();
      const signerEmail = (input.signerEmail || "").trim();
      if (signerEmail && !EMAIL_RE.test(signerEmail)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid signer email, or leave it blank." });
      }
      const db = await requireDb();
      const token = createSignToken();
      const inserted = await db.insert(signupIntakes).values({
        status: "In Progress",
        kind: "agreement_only",
        agreementStatus: "unsigned",
        signToken: token,
        conversationLog: JSON.stringify({
          intakeKind: "agreement_only",
          companyName,
          signerEmail,
        }),
      }).returning({ id: signupIntakes.id });
      const intakeId = inserted[0]?.id;
      if (!intakeId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create signing link" });
      return {
        intakeId,
        kind: "agreement_only" as const,
        companyName,
        signerEmail,
        url: absoluteUrl(ctx.req, `/sign/${token}`),
      };
    }),

  issueSigningLink: adminProcedure
    .input(z.object({ intakeId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.select().from(signupIntakes).where(eq(signupIntakes.id, input.intakeId)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      if (resolveStatus(row) !== "unsigned") {
        throw new TRPCError({ code: "CONFLICT", message: "This agreement is already signed." });
      }
      let token = row.signToken && !row.signTokenUsedAt ? row.signToken : "";
      if (!token) {
        token = createSignToken();
        const updated = await db.update(signupIntakes).set({
          signToken: token,
          signTokenUsedAt: null,
          updatedAt: new Date(),
        }).where(and(
          eq(signupIntakes.id, row.id),
          eq(signupIntakes.agreementStatus, "unsigned"),
          isNull(signupIntakes.signTokenUsedAt),
        )).returning({ id: signupIntakes.id });
        if (!updated.length) {
          throw new TRPCError({ code: "CONFLICT", message: "This agreement is already signed." });
        }
      }
      const data = parseLog(row.conversationLog);
      return {
        intakeId: row.id,
        kind: row.kind,
        companyName: data.companyName || "",
        url: absoluteUrl(ctx.req, `/sign/${token}`),
      };
    }),

  getForClientSign: publicProcedure
    .input(z.object({ token: signTokenInput }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(signupIntakes).where(eq(signupIntakes.signToken, input.token)).limit(1);
      const row = rows[0];
      if (!row || !tokensMatch(row.signToken, input.token)) {
        throw new TRPCError({ code: "FORBIDDEN", message: INVALID_SIGN_LINK });
      }
      if (row.signTokenUsedAt || resolveStatus(row) !== "unsigned") {
        return { state: "used" as const };
      }
      const data = parseLog(row.conversationLog);
      if (row.kind === "agreement_only") {
        return {
          state: "open" as const,
          kind: "agreement_only" as const,
          companyName: data.companyName || "",
          signerEmail: data.signerEmail || "",
        };
      }
      return {
        state: "open" as const,
        kind: "credentialing" as const,
        companyName: data.companyName || "",
      };
    }),

  clientSign: publicProcedure
    .input(z.object({
      token: signTokenInput,
      signerName: z.string().min(1).max(200),
      signerTitle: z.string().min(1).max(200),
      signatureDataUrl: z.string().min(20).max(2_000_000),
      typedName: z.string().max(200).optional(),
      signatureAcceptedAt: z.string().optional(),
      signatureMethod: z.string().max(64).optional(),
      agreedToServiceAgreement: z.boolean(),
      acknowledgedFcraRights: z.boolean(),
      acknowledgedUserNotice: z.boolean(),
      companyName: z.string().max(200).optional(),
      signerEmail: z.string().max(320).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.agreedToServiceAgreement || !input.acknowledgedFcraRights || !input.acknowledgedUserNotice) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "All three acknowledgements are required." });
      }
      const signerName = input.signerName.trim();
      const signerTitle = input.signerTitle.trim();
      if (!signerName || !signerTitle) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Name and title are required." });
      }
      const db = await requireDb();
      const rows = await db.select().from(signupIntakes).where(eq(signupIntakes.signToken, input.token)).limit(1);
      const row = rows[0];
      if (!row || !tokensMatch(row.signToken, input.token)) {
        throw new TRPCError({ code: "FORBIDDEN", message: INVALID_SIGN_LINK });
      }
      if (row.signTokenUsedAt || resolveStatus(row) !== "unsigned") {
        throw new TRPCError({ code: "CONFLICT", message: USED_SIGN_LINK });
      }

      const data = parseLog(row.conversationLog);
      const kind = row.kind === "agreement_only" ? "agreement_only" : "credentialing";
      let companyName = data.companyName || "";
      let signerEmail = "";
      if (kind === "agreement_only") {
        companyName = (input.companyName || "").trim();
        signerEmail = (input.signerEmail || "").trim();
        if (!companyName) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Legal company name is required." });
        }
        if (!EMAIL_RE.test(signerEmail)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A valid signer email is required." });
        }
        data.companyName = companyName;
        data.signerEmail = signerEmail;
        data.intakeKind = "agreement_only";
      }

      const countersignToken = createSignToken();
      const acceptedAt = input.signatureAcceptedAt && !Number.isNaN(Date.parse(input.signatureAcceptedAt))
        ? input.signatureAcceptedAt
        : new Date().toISOString();
      data.agreement = {
        signerName,
        signerTitle,
        signerEmail: signerEmail || undefined,
        signatureDataUrl: input.signatureDataUrl,
        typedName: (input.typedName || signerName).trim(),
        signatureMethod: input.signatureMethod || "typed_cursive",
        signatureAcceptedAt: acceptedAt,
        signedAt: acceptedAt,
        companyName,
        agreedToServiceAgreement: true,
        acknowledgedFcraRights: true,
        acknowledgedUserNotice: true,
        countersignToken,
        status: "client_signed",
      };

      const updated = await db.update(signupIntakes).set({
        conversationLog: JSON.stringify(data),
        agreementStatus: "client_signed",
        signTokenUsedAt: new Date(),
        updatedAt: new Date(),
      }).where(clientSignGuard(row.id, input.token)).returning({ id: signupIntakes.id });
      if (!updated.length) {
        throw new TRPCError({ code: "CONFLICT", message: USED_SIGN_LINK });
      }

      const path = `/countersign/${row.id}?token=${countersignToken}`;
      const link = absoluteUrl(ctx.req, path);
      const who = [signerName, signerEmail].filter(Boolean).join(", ");
      await notifyOwner({
        title: `Client signed Service Agreement: ${companyName || "Client"}`,
        content: `The client${who ? ` (${who})` : ""} signed the 2026 Service Agreement. Open this link to review the client-signed agreement and countersign as ${SAFFHIRE_SIGNER_NAME}, ${SAFFHIRE_SIGNER_TITLE}: <p><a href="${link}">${link}</a></p>`,
      });
      return { signed: true };
    }),

  getForCountersign: publicProcedure
    .input(z.object({ id: z.number(), token: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(signupIntakes).where(eq(signupIntakes.id, input.id)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });
      const data = parseLog(row.conversationLog);
      const agreement = data.agreement || {};
      if (!tokensMatch(agreement.countersignToken, input.token)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid countersign link" });
      }
      return {
        companyName: data.companyName || agreement.companyName || "",
        signerName: agreement.signerName || "",
        signerTitle: agreement.signerTitle || "",
        signatureDataUrl: agreement.signatureDataUrl || "",
        signedAt: agreement.signatureAcceptedAt || agreement.signedAt || "",
        status: resolveStatus(row),
      };
    }),

  downloadExecuted: publicProcedure
    .input(z.object({ id: z.number(), token: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(signupIntakes).where(eq(signupIntakes.id, input.id)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });
      const data = parseLog(row.conversationLog);
      const agreement = data.agreement || {};
      if (!tokensMatch(agreement.countersignToken, input.token)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid countersign link" });
      }
      if (resolveStatus(row) !== "fully_executed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Agreement is not fully executed yet" });
      }
      const built = executedPdfFor(data, agreement);
      return { filename: built.filename, pdfBase64: built.pdf.toString("base64") };
    }),

  countersignByToken: publicProcedure
    .input(z.object({
      id: z.number(),
      token: z.string().min(10),
      signatureDataUrl: z.string().min(20),
      signatureAcceptedAt: z.string().optional(),
      signatureMethod: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(signupIntakes).where(eq(signupIntakes.id, input.id)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });
      const data = parseLog(row.conversationLog);
      const clientAgreement = data.agreement || {};
      if (!tokensMatch(clientAgreement.countersignToken, input.token)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid countersign link" });
      }
      const status = resolveStatus(row);
      if (status === "fully_executed") {
        throw new TRPCError({ code: "CONFLICT", message: ALREADY_EXECUTED });
      }
      if (status !== "client_signed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This agreement is not ready to countersign." });
      }
      const signedAt = input.signatureAcceptedAt && !Number.isNaN(Date.parse(input.signatureAcceptedAt))
        ? input.signatureAcceptedAt
        : new Date().toISOString();
      data.agreement = {
        ...clientAgreement,
        saffhireSignerName: SAFFHIRE_SIGNER_NAME,
        saffhireSignerTitle: SAFFHIRE_SIGNER_TITLE,
        saffhireSignatureDataUrl: input.signatureDataUrl,
        saffhireSignatureMethod: input.signatureMethod || "typed_cursive",
        saffhireSignatureAcceptedAt: signedAt,
        saffhireSignedAt: signedAt,
        status: "fully_executed",
      };
      const updated = await db.update(signupIntakes).set({
        conversationLog: JSON.stringify(data),
        agreementStatus: "fully_executed",
        updatedAt: new Date(),
      }).where(countersignGuard(input.id)).returning({ id: signupIntakes.id });
      if (!updated.length) {
        throw new TRPCError({ code: "CONFLICT", message: ALREADY_EXECUTED });
      }

      const built = executedPdfFor(data, data.agreement, input.signatureDataUrl, signedAt);
      const kind = row.kind === "agreement_only" ? "agreement_only" : "credentialing";
      const recipients = executedAgreementRecipients({
        kind,
        signerEmail: data.signerEmail || clientAgreement.signerEmail,
        ownerEmail: data.ownerEmail,
        contactEmail: data.contactEmail,
        notifyEmail: SAFFHIRE_NOTIFY_EMAIL,
      });
      await notifyOwner({
        title: `Executed Service Agreement: ${built.company}`,
        content: `The 2026 SaffHire Service Agreement is fully executed. SaffHire signed as ${SAFFHIRE_SIGNER_NAME}, ${SAFFHIRE_SIGNER_TITLE}. The attached PDF includes the full agreement, the Summary of Rights, the Notice to Users, and both signatures.`,
        to: recipients,
        extraAttachments: [{
          filename: built.filename,
          content: built.pdf,
        }],
      });
      return { signed: true, filename: built.filename, pdfBase64: built.pdf.toString("base64") };
    }),
});
