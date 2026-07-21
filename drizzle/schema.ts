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
  conversationLog: text("conversationLog"),
  synced: syncStatus("synced").default("false").notNull(),
  syncedAt: timestamp("syncedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type SignupIntake = typeof signupIntakes.$inferSelect;
export type InsertSignupIntake = typeof signupIntakes.$inferInsert;
