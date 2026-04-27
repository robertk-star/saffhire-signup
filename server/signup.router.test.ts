/**
 * Vitest tests for the SaffHire signup router.
 * Tests cover the submitIntake procedure in isolation (mocking external services).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock external dependencies ───────────────────────────────────────────────

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Build a chainable query mock that resolves to [] at any terminal call
function makeSelectChain(resolveValue: unknown[] = []) {
  const terminal = vi.fn().mockResolvedValue(resolveValue);
  const chain: Record<string, unknown> = {};
  // All Drizzle query builder methods return the same chain object
  const methods = ["from", "where", "orderBy", "limit", "offset"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain itself thenable (await chain === resolveValue)
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockImplementation(() => makeSelectChain([])),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "/manus-storage/test.png",
    key: "test-key",
  }),
}));

// ─── Import after mocks are set up ────────────────────────────────────────────

import { appRouter } from "./routers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createPublicContext() {
  return {
    user: null,
    req: {} as any,
    res: {} as any,
  };
}

function createAdminContext() {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("signup.submitIntake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success for a valid complete intake", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.signup.submitIntake({
      companyName: "Test Company",
      ein: "12-3456789",
      businessEntity: "LLC",
      ownerFirstName: "John",
      ownerLastName: "Doe",
      ownerEmail: "john@example.com",
      ownerPhone: "555-0100",
      ownerTitle: "Owner",
      contactFirstName: "Jane",
      contactLastName: "Smith",
      contactEmail: "jane@example.com",
      contactPhone: "555-0101",
      contactTitle: "Manager",
      businessStreet: "123 Main St",
      businessCity: "Austin",
      businessState: "TX",
      businessZip: "78701",
      billingSameAsBusiness: "true",
      billingStreet: "",
      billingCity: "",
      billingState: "",
      billingZip: "",
      adminUsers: [
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "555-0100",
        },
      ],
    });

    expect(result).toEqual({ saved: true });
  });

  it("calls notifyOwner with company name in title", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.signup.submitIntake({
      companyName: "Saffhire Background Screening",
      ein: "12-3456789",
      businessEntity: "LLC",
      ownerFirstName: "Robert",
      ownerLastName: "Dean",
      ownerEmail: "robert@saffhire.com",
      ownerPhone: "555-0100",
      ownerTitle: "Owner",
    });

    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Saffhire Background Screening"),
      })
    );
  });

  it("throws error if database is unavailable", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce(null);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.signup.submitIntake({
        companyName: "Test",
        ein: "12-3456789",
      })
    ).rejects.toThrow("Database unavailable");
  });
});


