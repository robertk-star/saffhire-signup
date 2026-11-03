import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const intakeStatus = pgEnum("intake_status", ["In Progress", "Completed"]);
export const syncStatus = pgEnum("sync_status", ["true", "false"]);
export const intakeKind = pgEnum("intake_kind", ["credentialing", "agreement_only"]);
export const agreementStatus = pgEnum("agreement_status", ["unsigned", "client_signed", "fully_executed"]);

export const users = pgTable("users", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const signupIntakes = pgTable("signupIntakes", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  status: intakeStatus("status").default("In Progress").notNull(),
  kind: intakeKind("kind").default("credentialing").notNull(),
  agreementStatus: agreementStatus("agreementStatus").default("unsigned").notNull(),
  signToken: varchar("signToken", { length: 64 }).unique(),
  signTokenUsedAt: timestamp("signTokenUsedAt", { withTimezone: true }),
  conversationLog: text("conversationLog"),
  synced: syncStatus("synced").default("false").notNull(),
  syncedAt: timestamp("syncedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type SignupIntake = typeof signupIntakes.$inferSelect;
export type InsertSignupIntake = typeof signupIntakes.$inferInsert;
