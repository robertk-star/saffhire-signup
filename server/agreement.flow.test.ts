import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const flowUrl = process.env.AGREEMENT_FLOW_DATABASE_URL || "";
const sendMock = vi.hoisted(() => vi.fn(async () => ({ data: { id: "email_test" }, error: null })));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("./ghl", () => ({
  upsertContactWithIntakeTag: vi.fn(async () => null),
}));

import { appRouter } from "./routers";
import { closeDb, getDb } from "./db";
import { signupIntakes } from "../drizzle/schema";

const SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const ROBERT = "robertk@saffhire.com";

function runSql(args: string[]) {
  execFileSync("psql", [flowUrl, "-v", "ON_ERROR_STOP=1", ...args], { stdio: "pipe" });
}

function adminCaller() {
  return appRouter.createCaller({
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Robert Krebsbach",
      email: ROBERT,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: { host: "127.0.0.1:4317", "x-forwarded-proto": "http" } },
    res: {},
  } as any);
}

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: { host: "127.0.0.1:4317", "x-forwarded-proto": "http" } },
    res: {},
  } as any);
}

function signInput(token: string, companyName: string) {
  return {
    token,
    signerName: "Robert Krebsbach",
    signerTitle: "Authorized Signer",
    signatureDataUrl: SIGNATURE,
    typedName: "Robert Krebsbach",
    signatureAcceptedAt: "2026-11-03T15:00:00.000Z",
    signatureMethod: "typed_cursive",
    agreedToServiceAgreement: true,
    acknowledgedFcraRights: true,
    acknowledgedUserNotice: true,
    companyName,
    signerEmail: ROBERT,
  };
}

function tokenFrom(url: string) {
  const token = url.split("/sign/")[1];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error(`Missing sign token in ${url}`);
  return token;
}

function countersignFrom(html: string) {
  const match = html.match(/\/countersign\/(\d+)\?token=([a-f0-9]+)/);
  if (!match) throw new Error(`Missing countersign link in ${html}`);
  return { id: Number(match[1]), token: match[2] };
}

describe.skipIf(!flowUrl)("agreement signing flow against postgres", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = flowUrl;
    process.env.RESEND_API_KEY = "test-not-a-real-key";
    delete process.env.EMAIL_CAPTURE_DIR;
    runSql(["-f", "drizzle/0000_supabase_initial.sql"]);
    runSql(["-f", "drizzle/0006_agreement_signing.sql"]);
  });

  beforeEach(() => {
    sendMock.mockClear();
    runSql(["-c", 'TRUNCATE "signupIntakes" RESTART IDENTITY CASCADE;']);
  });

  afterEach(() => {
    for (const call of sendMock.mock.calls) {
      for (const addr of call[0].to || []) {
        expect(addr).toBe(ROBERT);
      }
    }
  });

  afterAll(async () => {
    await closeDb();
  });

  it("signs, countersigns, builds the PDF, and rejects bad tokens", async () => {
    const admin = adminCaller();
    const client = publicCaller();
    const created = await admin.agreement.createSigningLink({
      companyName: "MMC Agreement Test",
      signerEmail: ROBERT,
    });
    expect(sendMock).not.toHaveBeenCalled();
    expect(created.url).toBe(`http://127.0.0.1:4317/sign/${tokenFrom(created.url)}`);

    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const listed = await admin.signup.listIntakes({});
    expect(listed.rows).toHaveLength(1);
    expect((listed.rows[0] as any).kind).toBe("agreement_only");
    expect((listed.rows[0] as any).signToken).toBeUndefined();
    expect(JSON.stringify(listed.rows[0])).not.toContain(tokenFrom(created.url));

    const opened = await client.agreement.getForClientSign({ token: tokenFrom(created.url) });
    expect(opened).toMatchObject({
      state: "open",
      kind: "agreement_only",
      companyName: "MMC Agreement Test",
      signerEmail: ROBERT,
    });

    await expect(client.agreement.getForClientSign({ token: "11".repeat(32) })).rejects.toThrow(/invalid/i);
    await expect(client.agreement.clientSign({
      ...signInput(tokenFrom(created.url), "MMC Agreement Test"),
      agreedToServiceAgreement: false,
    })).rejects.toThrow(/acknowledgement/i);

    await client.agreement.clientSign(signInput(tokenFrom(created.url), "MMC Agreement Test"));
    expect(sendMock).toHaveBeenCalledTimes(1);
    const signedNotice = sendMock.mock.calls[0][0];
    expect(signedNotice.subject).toBe("Client signed Service Agreement: MMC Agreement Test");
    expect(signedNotice.to).toEqual([ROBERT]);
    const countersign = countersignFrom(signedNotice.html);

    await expect(client.agreement.clientSign(signInput(tokenFrom(created.url), "MMC Agreement Test"))).rejects.toThrow(/already been used/i);
    await expect(client.agreement.getForClientSign({ token: tokenFrom(created.url) })).resolves.toEqual({ state: "used" });
    expect(sendMock).toHaveBeenCalledTimes(1);

    const other = await admin.agreement.createSigningLink({
      companyName: "Untouched Agreement Test",
      signerEmail: ROBERT,
    });
    await expect(client.agreement.clientSign(signInput(tokenFrom(other.url), "Wrong Company"))).resolves.toEqual({ signed: true });
    const untouched = await db.select().from(signupIntakes).where(eq(signupIntakes.id, created.intakeId));
    expect(untouched[0]?.agreementStatus).toBe("client_signed");
    const untouchedLog = JSON.parse(untouched[0]?.conversationLog || "{}");
    expect(untouchedLog.companyName).toBe("MMC Agreement Test");

    await expect(client.agreement.countersignByToken({
      id: countersign.id,
      token: "ff".repeat(24),
      signatureDataUrl: SIGNATURE,
    })).rejects.toThrow(/invalid/i);

    const executed = await client.agreement.countersignByToken({
      id: countersign.id,
      token: countersign.token,
      signatureDataUrl: SIGNATURE,
      signatureAcceptedAt: "2026-11-03T16:00:00.000Z",
      signatureMethod: "typed_cursive",
    });
    expect(executed.filename).toBe("SaffHire_Service_Agreement_MMC_Agreement_Test.pdf");
    const pdf = Buffer.from(executed.pdfBase64, "base64");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");

    const executedCall = sendMock.mock.calls.find((call) => call[0].subject === "Executed Service Agreement: MMC Agreement Test");
    expect(executedCall).toBeTruthy();
    expect(executedCall?.[0].to).toEqual([ROBERT]);
    const attached = Buffer.from(executedCall?.[0].attachments[0].content, "base64");
    expect(attached.subarray(0, 5).toString()).toBe("%PDF-");
    expect(attached.equals(pdf)).toBe(true);

    await expect(client.agreement.countersignByToken({
      id: countersign.id,
      token: countersign.token,
      signatureDataUrl: SIGNATURE,
    })).rejects.toThrow(/already fully executed/i);

    const downloaded = await client.agreement.downloadExecuted(countersign);
    expect(downloaded.filename).toBe(executed.filename);
    expect(Buffer.from(downloaded.pdfBase64, "base64").subarray(0, 5).toString()).toBe("%PDF-");

    const finalRow = await db.select().from(signupIntakes).where(eq(signupIntakes.id, created.intakeId));
    expect(finalRow[0]?.kind).toBe("agreement_only");
    expect(finalRow[0]?.agreementStatus).toBe("fully_executed");
    expect(finalRow[0]?.signTokenUsedAt).toBeTruthy();

    const outDir = "/opt/cursor/artifacts";
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "mmc-agreement-test.pdf"), pdf);
    writeFileSync(path.join(outDir, "executed-email.json"), JSON.stringify({
      to: executedCall?.[0].to,
      subject: executedCall?.[0].subject,
      html: executedCall?.[0].html,
    }, null, 2));
    writeFileSync(path.join(outDir, "client-signed-email.json"), JSON.stringify({
      to: signedNotice.to,
      subject: signedNotice.subject,
      html: signedNotice.html,
    }, null, 2));
  });

  it("requires the token on the existing credentialing sign step", async () => {
    const client = publicCaller();
    const submitted = await client.signup.submitIntake({
      companyName: "Token Flow Test Co",
      ownerName: "Robert Krebsbach",
      ownerEmail: ROBERT,
      contactEmail: ROBERT,
    });
    expect(submitted.signToken).toMatch(/^[a-f0-9]{64}$/);
    sendMock.mockClear();

    await expect(client.agreement.clientSign(signInput("00".repeat(32), "Token Flow Test Co"))).rejects.toThrow(/invalid/i);
    await client.agreement.clientSign(signInput(submitted.signToken, "Token Flow Test Co"));
    const signed = sendMock.mock.calls.find((call) => String(call[0].subject).startsWith("Client signed Service Agreement"));
    expect(signed?.[0].subject).toBe("Client signed Service Agreement: Token Flow Test Co");
    expect(signed?.[0].to).toEqual([ROBERT]);

    const db = await getDb();
    const rows = await db!.select().from(signupIntakes);
    expect(rows[0]?.kind).toBe("credentialing");
    expect(rows[0]?.agreementStatus).toBe("client_signed");
    await expect(client.agreement.clientSign(signInput(submitted.signToken, "Token Flow Test Co"))).rejects.toThrow(/already been used/i);
  });

  it("keeps an outstanding countersign link working once, then blocks overwrite", async () => {
    const db = await getDb();
    const legacyToken = "ab".repeat(24);
    await db!.insert(signupIntakes).values({
      status: "Completed",
      kind: "credentialing",
      agreementStatus: "unsigned",
      conversationLog: JSON.stringify({
        companyName: "Legacy Countersign Co",
        ownerEmail: ROBERT,
        agreement: {
          signerName: "Robert Krebsbach",
          signerTitle: "Authorized Signer",
          signatureDataUrl: SIGNATURE,
          signatureAcceptedAt: "2026-11-03T15:00:00.000Z",
          companyName: "Legacy Countersign Co",
          countersignToken: legacyToken,
          status: "client_signed",
        },
      }),
    });
    runSql(["-f", "drizzle/0006_agreement_signing.sql"]);
    const backfilled = await db!.select().from(signupIntakes);
    expect(backfilled[0]?.agreementStatus).toBe("client_signed");

    const client = publicCaller();
    await client.agreement.countersignByToken({
      id: backfilled[0]!.id,
      token: legacyToken,
      signatureDataUrl: SIGNATURE,
    });
    await expect(client.agreement.countersignByToken({
      id: backfilled[0]!.id,
      token: legacyToken,
      signatureDataUrl: SIGNATURE,
    })).rejects.toThrow(/already fully executed/i);
    const executed = sendMock.mock.calls.find((call) => call[0].subject === "Executed Service Agreement: Legacy Countersign Co");
    expect(executed?.[0].to).toEqual([ROBERT]);
  });

  it("can issue a signing link for an unsigned credentialing application without emailing it", async () => {
    const db = await getDb();
    const inserted = await db!.insert(signupIntakes).values({
      status: "Completed",
      kind: "credentialing",
      agreementStatus: "unsigned",
      conversationLog: JSON.stringify({
        companyName: "Needs Link Co",
        ownerEmail: ROBERT,
      }),
    }).returning({ id: signupIntakes.id });
    sendMock.mockClear();
    const issued = await adminCaller().agreement.issueSigningLink({ intakeId: inserted[0]!.id });
    expect(sendMock).not.toHaveBeenCalled();
    expect(issued.url).toContain("/sign/");
    const opened = await publicCaller().agreement.getForClientSign({ token: tokenFrom(issued.url) });
    expect(opened).toMatchObject({ state: "open", kind: "credentialing", companyName: "Needs Link Co" });
  });
});
