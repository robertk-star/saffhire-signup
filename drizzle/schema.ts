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
  companyLogoUrl: text("companyLogoUrl"),
  dba: varchar("dba", { length: 255 }),
  ein: varchar("ein", { length: 64 }),
  businessType: varchar("businessType", { length: 128 }),
  businessEntity: varchar("businessEntity", { length: 128 }),
  ownerFirstName: varchar("ownerFirstName", { length: 128 }),
  ownerLastName: varchar("ownerLastName", { length: 128 }),
  ownerEmail: varchar("ownerEmail", { length: 320 }),
  ownerPhone: varchar("ownerPhone", { length: 64 }),
  ownerPhoneExt: varchar("ownerPhoneExt", { length: 32 }),
  ownerTitle: varchar("ownerTitle", { length: 128 }),

  // Section 2 – Contact Information (optional)
  companyLogoKey: varchar("companyLogoKey", { length: 255 }),
  contactFirstName: varchar("contactFirstName", { length: 128 }),
  contactLastName: varchar("contactLastName", { length: 128 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 64 }),
  contactPhoneExt: varchar("contactPhoneExt", { length: 32 }),
  contactMobilePhone: varchar("contactMobilePhone", { length: 64 }),
  contactTitle: varchar("contactTitle", { length: 128 }),

  // Section 3 – Business Address
  businessStreet: varchar("businessStreet", { length: 255 }),
  businessStreet2: varchar("businessStreet2", { length: 255 }),
  businessCity: varchar("businessCity", { length: 128 }),
  businessState: varchar("businessState", { length: 64 }),
  businessZip: varchar("businessZip", { length: 20 }),
  businessCountry: varchar("businessCountry", { length: 128 }),

  // Section 4 – Billing Address
  billingSameAsBusiness: varchar("billingSameAsBusiness", { length: 8 }),
  billingStreet: varchar("billingStreet", { length: 255 }),
  billingStreet2: varchar("billingStreet2", { length: 255 }),
  billingCity: varchar("billingCity", { length: 128 }),
  billingState: varchar("billingState", { length: 64 }),
  billingZip: varchar("billingZip", { length: 20 }),
  billingCountry: varchar("billingCountry", { length: 128 }),
  billingAttention: varchar("billingAttention", { length: 255 }),



  // Section 5 – Admin Users (up to 3)
  admin1FirstName: varchar("admin1FirstName", { length: 128 }),
  admin1LastName: varchar("admin1LastName", { length: 128 }),
  admin1Email: varchar("admin1Email", { length: 320 }),
  admin1Mobile: varchar("admin1Mobile", { length: 64 }),
  admin1JobTitle: varchar("admin1JobTitle", { length: 128 }),
  admin1Status: varchar("admin1Status", { length: 32 }),
  admin2FirstName: varchar("admin2FirstName", { length: 128 }),
  admin2LastName: varchar("admin2LastName", { length: 128 }),
  admin2Email: varchar("admin2Email", { length: 320 }),
  admin2Mobile: varchar("admin2Mobile", { length: 64 }),
  admin2JobTitle: varchar("admin2JobTitle", { length: 128 }),
  admin2Status: varchar("admin2Status", { length: 32 }),
  admin3FirstName: varchar("admin3FirstName", { length: 128 }),
  admin3LastName: varchar("admin3LastName", { length: 128 }),
  admin3Email: varchar("admin3Email", { length: 320 }),
  admin3Mobile: varchar("admin3Mobile", { length: 64 }),
  admin3JobTitle: varchar("admin3JobTitle", { length: 128 }),
  admin3Status: varchar("admin3Status", { length: 32 }),

  // Section 6 – Signature
  authorizedSignature: varchar("authorizedSignature", { length: 255 }),
  signatureDate: varchar("signatureDate", { length: 32 }),
  signatureName: varchar("signatureName", { length: 255 }),
  signatureTitle: varchar("signatureTitle", { length: 255 }),

  // Raw conversation transcript (JSON)
  conversationLog: text("conversationLog"),

  // Google Sheets sync tracking
  synced: mysqlEnum("synced", ["true", "false"]).default("false").notNull(),
  syncedAt: timestamp("syncedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SignupIntake = typeof signupIntakes.$inferSelect;
export type InsertSignupIntake = typeof signupIntakes.$inferInsert;
