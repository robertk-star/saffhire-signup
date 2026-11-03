import { beforeEach, describe, expect, it, vi } from "vitest";
import { FCRA_SUMMARY_OF_RIGHTS, NOTICE_TO_USERS, SERVICE_AGREEMENT_SECTIONS } from "../shared/agreementText";
import { SERVICE_AGREEMENT_ACKNOWLEDGEMENTS } from "../client/src/components/AgreementDocuments";
import { executedAgreementRecipients } from "./agreementRecipients";

const harness = vi.hoisted(() => {
  const state = {
    selected: [] as any[],
    inserted: [] as any[],
    updates: [] as any[],
    updateResult: [{ id: 11 }] as Array<{ id: number }>,
  };
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => state.selected,
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => ({
        returning: async () => {
          state.inserted.push(vals);
          return [{ id: 11 }];
        },
      }),
    }),
    update: () => ({
      set: (vals: any) => ({
        where: () => ({
          returning: async () => {
            state.updates.push(vals);
            return state.updateResult;
          },
        }),
      }),
    }),
  };
  return { state, db };
});

vi.mock("./db", () => ({
  getDb: vi.fn(async () => harness.db),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./ghl", () => ({
  upsertContactWithIntakeTag: vi.fn(async () => null),
}));

import { appRouter } from "./routers";
import { notifyOwner } from "./_core/notification";

const TOKEN = "ab".repeat(32);
const SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function adminCtx() {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Robert Krebsbach",
      email: "robertk@saffhire.com",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {} },
    res: {},
  };
}

function publicCtx() {
  return { user: null, req: { headers: {} }, res: {} };
}

function openRow() {
  return {
    id: 11,
    kind: "agreement_only",
    agreementStatus: "unsigned",
    signToken: TOKEN,
    signTokenUsedAt: null,
    conversationLog: JSON.stringify({
      intakeKind: "agreement_only",
      companyName: "MMC Agreement Test",
      signerEmail: "robertk@saffhire.com",
    }),
  };
}

describe("agreement recipients and unchanged FCRA text", () => {
  it("sends the executed PDF to Robert and the agreement-only signer", () => {
    expect(executedAgreementRecipients({
      kind: "agreement_only",
      signerEmail: "signer@example.com",
      ownerEmail: "owner@example.com",
      notifyEmail: "robertk@saffhire.com",
    })).toEqual(["robertk@saffhire.com", "signer@example.com"]);
  });

  it("keeps credentialing executed copies on the application emails", () => {
    expect(executedAgreementRecipients({
      kind: "credentialing",
      signerEmail: "signer@example.com",
      ownerEmail: "owner@example.com",
      contactEmail: "owner@example.com",
      notifyEmail: "robertk@saffhire.com",
    })).toEqual(["robertk@saffhire.com", "owner@example.com"]);
  });

  it("does not reword the agreement acknowledgements or FCRA notices", () => {
    expect([...SERVICE_AGREEMENT_ACKNOWLEDGEMENTS]).toEqual([
      "I have read and agree to the SaffHire Service Agreement.",
      "I acknowledge receipt of the Summary of Rights under the FCRA.",
      "I acknowledge receipt of the Notice to Users of Consumer Reports.",
    ]);
    const titles = SERVICE_AGREEMENT_SECTIONS.map((section) => section.title);
    expect(titles).toContain("2. Permissible purpose and certifications");
    expect(titles).toContain("11. No resale and downstream use");
    expect(titles).toContain("15. Entire agreement");
    expect(FCRA_SUMMARY_OF_RIGHTS.startsWith("A Summary of Your Rights Under the Fair Credit Reporting Act.")).toBe(true);
    expect(NOTICE_TO_USERS.startsWith("Notice to Users of Consumer Reports: Obligations of Users under the FCRA.")).toBe(true);
  });
});

describe("agreement signing guards", () => {
  beforeEach(() => {
    harness.state.selected = [];
    harness.state.inserted = [];
    harness.state.updates = [];
    harness.state.updateResult = [{ id: 11 }];
    vi.mocked(notifyOwner).mockClear();
  });

  it("rejects a non-admin trying to create a signing link", async () => {
    const caller = appRouter.createCaller({
      user: { ...adminCtx().user, role: "user" },
      req: { headers: {} },
      res: {},
    } as any);
    await expect(caller.agreement.createSigningLink({ companyName: "MMC" })).rejects.toThrow(/permission/i);
    expect(harness.state.inserted).toHaveLength(0);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("creates an agreement-only record and does not email the link", async () => {
    const caller = appRouter.createCaller(adminCtx() as any);
    const result = await caller.agreement.createSigningLink({
      companyName: "MMC Agreement Test",
      signerEmail: "robertk@saffhire.com",
    });
    expect(result.kind).toBe("agreement_only");
    expect(result.intakeId).toBe(11);
    expect(result.url).toContain(`/sign/${harness.state.inserted[0].signToken}`);
    expect(harness.state.inserted[0].kind).toBe("agreement_only");
    expect(JSON.parse(harness.state.inserted[0].conversationLog).intakeKind).toBe("agreement_only");
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("rejects a missing or malformed signing token", async () => {
    const caller = appRouter.createCaller(publicCtx() as any);
    await expect(caller.agreement.clientSign({
      token: "",
      signerName: "Robert Krebsbach",
      signerTitle: "Authorized Signer",
      signatureDataUrl: SIGNATURE,
      agreedToServiceAgreement: true,
      acknowledgedFcraRights: true,
      acknowledgedUserNotice: true,
    })).rejects.toThrow(/invalid/i);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("rejects a wrong signing token", async () => {
    harness.state.selected = [];
    const caller = appRouter.createCaller(publicCtx() as any);
    await expect(caller.agreement.clientSign({
      token: "cd".repeat(32),
      signerName: "Robert Krebsbach",
      signerTitle: "Authorized Signer",
      signatureDataUrl: SIGNATURE,
      agreedToServiceAgreement: true,
      acknowledgedFcraRights: true,
      acknowledgedUserNotice: true,
      companyName: "MMC Agreement Test",
      signerEmail: "robertk@saffhire.com",
    })).rejects.toThrow(/invalid/i);
    expect(harness.state.updates).toHaveLength(0);
  });

  it("rejects a reused or already signed token", async () => {
    harness.state.selected = [{ ...openRow(), signTokenUsedAt: new Date() }];
    const caller = appRouter.createCaller(publicCtx() as any);
    await expect(caller.agreement.clientSign({
      token: TOKEN,
      signerName: "Robert Krebsbach",
      signerTitle: "Authorized Signer",
      signatureDataUrl: SIGNATURE,
      agreedToServiceAgreement: true,
      acknowledgedFcraRights: true,
      acknowledgedUserNotice: true,
      companyName: "MMC Agreement Test",
      signerEmail: "robertk@saffhire.com",
    })).rejects.toThrow(/already been used/i);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("rejects a second signature when the agreement is already executed", async () => {
    harness.state.selected = [{ ...openRow(), agreementStatus: "fully_executed" }];
    const caller = appRouter.createCaller(publicCtx() as any);
    await expect(caller.agreement.clientSign({
      token: TOKEN,
      signerName: "Robert Krebsbach",
      signerTitle: "Authorized Signer",
      signatureDataUrl: SIGNATURE,
      agreedToServiceAgreement: true,
      acknowledgedFcraRights: true,
      acknowledgedUserNotice: true,
      companyName: "MMC Agreement Test",
      signerEmail: "robertk@saffhire.com",
    })).rejects.toThrow(/already been used/i);
  });

  it("signs once and emails only the countersign notice, not the signing link", async () => {
    harness.state.selected = [openRow()];
    const caller = appRouter.createCaller(publicCtx() as any);
    const result = await caller.agreement.clientSign({
      token: TOKEN,
      signerName: "Robert Krebsbach",
      signerTitle: "Authorized Signer",
      signatureDataUrl: SIGNATURE,
      agreedToServiceAgreement: true,
      acknowledgedFcraRights: true,
      acknowledgedUserNotice: true,
      companyName: "MMC Agreement Test",
      signerEmail: "robertk@saffhire.com",
    });
    expect(result).toEqual({ signed: true });
    expect(harness.state.updates[0].agreementStatus).toBe("client_signed");
    expect(harness.state.updates[0].signTokenUsedAt).toBeInstanceOf(Date);
    expect(notifyOwner).toHaveBeenCalledTimes(1);
    const notice = vi.mocked(notifyOwner).mock.calls[0][0];
    expect(notice.title).toBe("Client signed Service Agreement: MMC Agreement Test");
    expect(notice.to).toBeUndefined();
    expect(notice.content).toContain("/countersign/11?token=");
    expect(notice.content).not.toContain(`/sign/${TOKEN}`);
  });
});
