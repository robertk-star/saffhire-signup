import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Intake Submissions ───────────────────────────────────────────────────────

export const signupIntakes = mysqlTable("signupIntakes", {
  id: int("id").autoincrement().primaryKey(),

  // Status
  status: mysqlEnum("status", ["In Progress", "Completed"]).default("In Progress").notNull(),

  // Raw conversation transcript (JSON) — stores ALL form data
  conversationLog: text("conversationLog"),

  // Google Sheets sync tracking
  synced: mysqlEnum("synced", ["true", "false"]).default("false").notNull(),
  syncedAt: timestamp("syncedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SignupIntake = typeof signupIntakes.$inferSelect;
export type InsertSignupIntake = typeof signupIntakes.$inferInsert;
