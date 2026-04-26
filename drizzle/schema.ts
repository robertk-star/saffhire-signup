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

  // Stable browser session ID — used to upsert partial rows without duplicates
  sessionId: varchar("sessionId", { length: 64 }).unique(),

  // Status
  status: mysqlEnum("status", ["In Progress", "Completed"]).default("In Progress").notNull(),

  // Section 1 – Client Information
  companyName: varchar("companyName", { length: 255 }),
  ein: varchar("ein", { length: 64 }),
  businessEntity: varchar("businessEntity", { length: 128 }),
  ownerFirstName: varchar("ownerFirstName", { length: 128 }),
  ownerLastName: varchar("ownerLastName", { length: 128 }),
  ownerEmail: varchar("ownerEmail", { length: 320 }),
  ownerPhone: varchar("ownerPhone", { length: 64 }),
  ownerTitle: varchar("ownerTitle", { length: 128 }),

  // Section 2 – Contact Information (optional)
  contactFirstName: varchar("contactFirstName", { length: 128 }),
  contactLastName: varchar("contactLastName", { length: 128 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 64 }),
  contactTitle: varchar("contactTitle", { length: 128 }),

  // Section 3 – Business Address
  businessStreet: varchar("businessStreet", { length: 255 }),
  businessCity: varchar("businessCity", { length: 128 }),
  businessState: varchar("businessState", { length: 64 }),
  businessZip: varchar("businessZip", { length: 20 }),

  // Section 4 – Billing Address
  billingSameAsBusiness: varchar("billingSameAsBusiness", { length: 8 }),
  billingStreet: varchar("billingStreet", { length: 255 }),
  billingCity: varchar("billingCity", { length: 128 }),
  billingState: varchar("billingState", { length: 64 }),
  billingZip: varchar("billingZip", { length: 20 }),

  // Section 5 – Admin Users (up to 3, stored as JSON)
  adminUsers: text("adminUsers"), // JSON array of { firstName, lastName, email, phone }

  // Raw conversation transcript (JSON)
  conversationLog: text("conversationLog"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SignupIntake = typeof signupIntakes.$inferSelect;
export type InsertSignupIntake = typeof signupIntakes.$inferInsert;
