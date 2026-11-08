import { createServer } from "http";
import type { AddressInfo } from "net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-admin-login";
  process.env.ADMIN_EMAIL = "robertk@saffhire.com";
  process.env.ADMIN_PASSWORD = "test-password-not-real";
  delete process.env.ADMIN_PASSWORD_HASH;
});

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({})),
  upsertUser: vi.fn(async () => {}),
  getUserByOpenId: vi.fn(async () => ({
    id: 1,
    openId: "admin-email:robertk@saffhire.com",
    email: "robertk@saffhire.com",
    name: "SaffHire Admin",
    role: "admin",
    loginMethod: "password",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  })),
}));

import { registerAdminLogin, hashAdminPassword, adminPasswordMatches } from "./adminLogin";
import { sdk } from "./_core/sdk";
import { upsertUser } from "./db";

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  registerAdminLogin(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

afterAll(async () => {
  await closeServer?.();
});

describe("admin password login", () => {
  it("rejects a wrong password and does not set a session", async () => {
    const response = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "robertk@saffhire.com", password: "wrong-password" }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("signs in the configured admin and sets the session cookie", async () => {
    const response = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "RobertK@SaffHire.com", password: "test-password-not-real" }),
    });
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") || "";
    expect(cookie).toContain("app_session_id=");
    const token = cookie.split(";")[0].replace("app_session_id=", "");
    const session = await sdk.verifySession(token);
    expect(session?.openId).toBe("admin-email:robertk@saffhire.com");
    expect(session?.name).toBe("SaffHire Admin");
    expect(vi.mocked(upsertUser)).toHaveBeenCalledWith(expect.objectContaining({
      email: "robertk@saffhire.com",
      role: "admin",
    }));
  });

  it("accepts a scrypt password hash", () => {
    const previous = process.env.ADMIN_PASSWORD_HASH;
    const previousPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD_HASH = hashAdminPassword("another-test-password");
    delete process.env.ADMIN_PASSWORD;
    expect(adminPasswordMatches("another-test-password")).toBe(true);
    expect(adminPasswordMatches("test-password-not-real")).toBe(false);
    if (previous === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = previous;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  });
});
