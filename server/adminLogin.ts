import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const SCRYPT_KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 200;

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return formatScryptHash(password, salt);
}

function formatScryptHash(password: string, salt: string) {
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function adminPasswordMatches(password: string) {
  const storedHash = (process.env.ADMIN_PASSWORD_HASH || "").trim();
  if (storedHash) {
    const [kind, salt, hash] = storedHash.split("$");
    if (kind !== "scrypt" || !salt || !hash) return false;
    const actual = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
    return safeEqual(actual, hash);
  }
  const storedPassword = process.env.ADMIN_PASSWORD || "";
  if (!storedPassword) return false;
  return safeEqual(password, storedPassword);
}

function adminLoginConfigured() {
  const email = (process.env.ADMIN_EMAIL || "").trim();
  const hasSecret = Boolean((process.env.ADMIN_PASSWORD_HASH || "").trim() || process.env.ADMIN_PASSWORD);
  return Boolean(email && hasSecret && ENV.cookieSecret);
}

function adminOpenId(email: string) {
  return `admin-email:${email.trim().toLowerCase()}`;
}

export function registerAdminLogin(app: Express) {
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    if (!adminLoginConfigured()) {
      res.status(503).json({ error: "Admin login is not configured." });
      return;
    }

    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const providedEmail = email.trim().toLowerCase();
    const passwordOk = password.length > 0 && password.length <= MAX_PASSWORD_LENGTH && adminPasswordMatches(password);
    const emailOk = Boolean(expectedEmail) && safeEqual(providedEmail, expectedEmail);
    if (!emailOk || !passwordOk) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    const openId = adminOpenId(expectedEmail);
    try {
      const database = await db.getDb();
      if (!database) {
        res.status(503).json({ error: "Database unavailable" });
        return;
      }
      await db.upsertUser({
        openId,
        name: "SaffHire Admin",
        email: expectedEmail,
        loginMethod: "password",
        role: "admin",
        lastSignedIn: new Date(),
      });
      const saved = await db.getUserByOpenId(openId);
      if (!saved || saved.role !== "admin") {
        res.status(503).json({ error: "Database unavailable" });
        return;
      }
    } catch (error) {
      console.error("[AdminLogin] Could not save admin user", error);
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    const sessionToken = await sdk.createSessionToken(openId, {
      name: "SaffHire Admin",
      expiresInMs: ONE_YEAR_MS,
    });
    res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
    res.json({ ok: true });
  });
}
