import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

describe("users router", () => {
  let testUserId: number;
  let adminUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create test users
    const testUserResult = await db.insert(users).values({
      openId: `test-user-${Date.now()}`,
      name: "Test User",
      email: "testuser@example.com",
      role: "user",
    });
    testUserId = testUserResult[0].insertId;

    const adminUserResult = await db.insert(users).values({
      openId: `admin-user-${Date.now()}`,
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
    adminUserId = adminUserResult[0].insertId;
  });

  it("listUsers returns all users when called by admin", async () => {
    const caller = appRouter.createCaller({
      user: { id: adminUserId, role: "admin", email: "admin@example.com" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.users.listUsers();
    expect(result.users).toBeDefined();
    expect(Array.isArray(result.users)).toBe(true);
    expect(result.users.length).toBeGreaterThan(0);
  });

  it("listUsers throws error when called by non-admin", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user", email: "testuser@example.com" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.users.listUsers();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
    }
  });

  it("promoteToAdmin promotes a user to admin", async () => {
    const caller = appRouter.createCaller({
      user: { id: adminUserId, role: "admin", email: "admin@example.com" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.users.promoteToAdmin({ userId: testUserId });
    expect(result.success).toBe(true);

    // Verify the user was promoted
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const updatedUser = await db.select().from(users).where((u) => u.id === testUserId).limit(1);
    expect(updatedUser[0].role).toBe("admin");
  });

  it("demoteToUser throws error when trying to demote self", async () => {
    const caller = appRouter.createCaller({
      user: { id: adminUserId, role: "admin", email: "admin@example.com" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.users.demoteToUser({ userId: adminUserId });
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toContain("cannot demote yourself");
    }
  });

  it("deleteUser throws error when trying to delete self", async () => {
    const caller = appRouter.createCaller({
      user: { id: adminUserId, role: "admin", email: "admin@example.com" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.users.deleteUser({ userId: adminUserId });
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toContain("cannot delete yourself");
    }
  });

  it("createUser creates a new user with specified role", async () => {
    const caller = appRouter.createCaller({
      user: { id: adminUserId, role: "admin", email: "admin@example.com" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.users.createUser({
      name: "New User",
      email: `newuser-${Date.now()}@example.com`,
      role: "user",
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
  });

  it("createUser throws error for duplicate email", async () => {
    const caller = appRouter.createCaller({
      user: { id: adminUserId, role: "admin", email: "admin@example.com" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.users.createUser({
        name: "Duplicate User",
        email: "admin@example.com",
        role: "user",
      });
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toContain("Email already in use");
    }
  });

  it("updateUser updates user name and email", async () => {
    const caller = appRouter.createCaller({
      user: { id: adminUserId, role: "admin", email: "admin@example.com" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.users.updateUser({
      userId: testUserId,
      name: "Updated Name",
      email: `updated-${Date.now()}@example.com`,
    });

    expect(result.success).toBe(true);
  });
});
