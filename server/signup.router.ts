/**
 * tRPC router for the SaffHire account setup intake form.
 * Procedures:
 *  - signup.getNextMessage   — Claude generates the next conversational message
 *  - signup.saveProgress     — Upserts partial data to DB + Sheets in real time (fire-and-forget)
 *  - signup.submitIntake     — Saves completed intake to DB, logs to Sheets, updates GHL, notifies owner
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { buildSystemPrompt } from "./_core/claudeQuestionnaire";
// Google Sheets sync moved to scheduled task (see scheduled-sync.mjs)
import { upsertGHLContact, createGHLOpportunity } from "./_core/gohighlevel";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { signupIntakes } from "../drizzle/schema";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// ─── Get Next Message ─────────────────────────────────────────────────────────

export const signupRouter = router({
  getNextMessage: publicProcedure
    .input(
      z.object({
        messages: z.array(MessageSchema),
        collectedData: z.record(z.string(), z.string()).optional(),
        currentSection: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { messages, collectedData = {}, currentSection = 0 } = input;

      const systemPrompt = buildSystemPrompt();

      // Build context message about current state
      const contextContent = `CURRENT STATE:
- Current section index: ${currentSection} (0-based, so Section ${currentSection + 1} of 5)
- Data collected so far: ${JSON.stringify(collectedData, null, 2)}

Please continue the conversation naturally based on what's been collected and what's still needed.`;

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: contextContent },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages: llmMessages });
      const rawContent = response?.choices?.[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : "I'm sorry, I had trouble processing that. Could you please try again?";

      const isComplete = content.includes("[FORM_COMPLETE]");
      const cleanContent = content.replace("[FORM_COMPLETE]", "").trim();

      return {
        message: cleanContent,
        isComplete,
      };
    }),

  // ─── Extract Field Value ────────────────────────────────────────────────────

  extractFieldValue: publicProcedure
    .input(
      z.object({
        userMessage: z.string(),
        fieldKey: z.string(),
        fieldLabel: z.string(),
        conversationContext: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userMessage, fieldKey, fieldLabel, conversationContext } = input;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a data extraction assistant. Extract the value for the field "${fieldLabel}" from the user's message. Return ONLY the extracted value as a JSON object with a single key "value". If the value cannot be determined, return {"value": null}.`,
          },
          {
            role: "user",
            content: `Field to extract: ${fieldLabel} (key: ${fieldKey})
Context: ${conversationContext || ""}
User message: "${userMessage}"

Extract the value for "${fieldLabel}".`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "field_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                value: { type: ["string", "null"], description: "The extracted field value, or null if not found" },
              },
              required: ["value"],
              additionalProperties: false,
            },
          },
        },
      });

      try {
        const rawVal = response?.choices?.[0]?.message?.content;
        const raw = typeof rawVal === 'string' ? rawVal : '{"value":null}';
        const parsed = JSON.parse(raw) as { value: string | null };
        return { value: parsed.value };
      } catch {
        return { value: null };
      }
    }),

  // ─── Save Progress (real-time partial upsert) ────────────────────────────────

  saveProgress: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        data: z.object({
          companyName: z.string().optional(),
          ein: z.string().optional(),
          businessEntity: z.string().optional(),
          ownerFirstName: z.string().optional(),
          ownerLastName: z.string().optional(),
          ownerEmail: z.string().optional(),
          ownerPhone: z.string().optional(),
          ownerTitle: z.string().optional(),
          contactFirstName: z.string().optional(),
          contactLastName: z.string().optional(),
          contactEmail: z.string().optional(),
          contactPhone: z.string().optional(),
          contactTitle: z.string().optional(),
          businessStreet: z.string().optional(),
          businessCity: z.string().optional(),
          businessState: z.string().optional(),
          businessZip: z.string().optional(),
          billingSameAsBusiness: z.string().optional(),
          billingStreet: z.string().optional(),
          billingCity: z.string().optional(),
          billingState: z.string().optional(),
          billingZip: z.string().optional(),
        }),
        currentSection: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { sessionId, data, currentSection = 0 } = input;

      // 1. Upsert to database
      const db = await getDb();
      if (db) {
        try {
          const existing = await db
            .select({ id: signupIntakes.id })
            .from(signupIntakes)
            .where(eq(signupIntakes.sessionId, sessionId))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(signupIntakes)
              .set({ ...data, status: "In Progress" })
              .where(eq(signupIntakes.sessionId, sessionId));
          } else {
            await db.insert(signupIntakes).values({
              sessionId,
              status: "In Progress",
              ...data,
            });
          }
        } catch (err) {
          console.error("[SaveProgress] DB upsert failed:", err);
        }
      }

      // 2. Data is now in the database; scheduled task will sync to Google Sheets hourly

      return { saved: true };
    }),

  // ─── List Intakes (admin only) ────────────────────────────────────────────────────

  listIntakes: protectedProcedure.use(({ ctx, next }) => {
    // Only the owner (admin role) can list all intake submissions
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .input(
      z.object({
        status: z.enum(["all", "In Progress", "Completed"]).optional().default("all"),
        limit: z.number().min(1).max(200).optional().default(100),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };

      try {
        const { desc, eq: eqOp } = await import("drizzle-orm");

        const rows = input.status === "all"
          ? await db
              .select()
              .from(signupIntakes)
              .orderBy(desc(signupIntakes.updatedAt))
              .limit(input.limit)
              .offset(input.offset)
          : await db
              .select()
              .from(signupIntakes)
              .where(eqOp(signupIntakes.status, input.status as "In Progress" | "Completed"))
              .orderBy(desc(signupIntakes.updatedAt))
              .limit(input.limit)
              .offset(input.offset);

        return { rows, total: rows.length };
      } catch (err) {
        console.error("[listIntakes] query failed:", err);
        return { rows: [], total: 0 };
      }
    }),

  // ─── Submit Intake ──────────────────────────────────────────────────────────

  submitIntake: publicProcedure
    .input(
      z.object({
        // Section 1
        companyName: z.string().min(1),
        ein: z.string().min(1),
        businessEntity: z.string().min(1),
        ownerFirstName: z.string().min(1),
        ownerLastName: z.string().min(1),
        ownerEmail: z.string().min(1),
        ownerPhone: z.string().min(1),
        ownerTitle: z.string().optional(),
        // Section 2
        contactFirstName: z.string().optional(),
        contactLastName: z.string().optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        contactTitle: z.string().optional(),
        // Section 3
        businessStreet: z.string().min(1),
        businessCity: z.string().min(1),
        businessState: z.string().min(1),
        businessZip: z.string().min(1),
        // Section 4
        billingSameAsBusiness: z.string().min(1),
        billingStreet: z.string().optional(),
        billingCity: z.string().optional(),
        billingState: z.string().optional(),
        billingZip: z.string().optional(),
        // Section 5
        adminUsers: z.array(
          z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            email: z.string().min(1),
            phone: z.string().optional(),
          })
        ).min(1),
        // Conversation log
        conversationLog: z.array(MessageSchema).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      const adminUsersJson = JSON.stringify(input.adminUsers);
      const conversationLogJson = JSON.stringify(input.conversationLog || []);

      // 1. Save to database
      if (db) {
        try {
          await db.insert(signupIntakes).values({
            status: "Completed",
            companyName: input.companyName,
            ein: input.ein,
            businessEntity: input.businessEntity,
            ownerFirstName: input.ownerFirstName,
            ownerLastName: input.ownerLastName,
            ownerEmail: input.ownerEmail,
            ownerPhone: input.ownerPhone,
            ownerTitle: input.ownerTitle,
            contactFirstName: input.contactFirstName,
            contactLastName: input.contactLastName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            contactTitle: input.contactTitle,
            businessStreet: input.businessStreet,
            businessCity: input.businessCity,
            businessState: input.businessState,
            businessZip: input.businessZip,
            billingSameAsBusiness: input.billingSameAsBusiness,
            billingStreet: input.billingStreet,
            billingCity: input.billingCity,
            billingState: input.billingState,
            billingZip: input.billingZip,
            adminUsers: adminUsersJson,
            conversationLog: conversationLogJson,
          });
          console.log("[Intake] Saved to database.");
        } catch (err) {
          console.error("[Intake] DB insert failed:", err);
        }
      }

      // 2. Data is now in the database; scheduled task will sync to Google Sheets hourly

      // 3. GoHighLevel CRM
      try {
        const contactId = await upsertGHLContact({
          companyName: input.companyName,
          ownerFirstName: input.ownerFirstName,
          ownerLastName: input.ownerLastName,
          ownerEmail: input.ownerEmail,
          ownerPhone: input.ownerPhone,
          businessStreet: input.businessStreet,
          businessCity: input.businessCity,
          businessState: input.businessState,
          businessZip: input.businessZip,
          ein: input.ein,
          businessEntity: input.businessEntity,
        });

        if (contactId) {
          await createGHLOpportunity(contactId, input.companyName);
        }
      } catch (err) {
        console.error("[Intake] GoHighLevel integration failed:", err);
      }

      // 4. Notify owner
      try {
        await notifyOwner({
          title: `New Account Setup: ${input.companyName}`,
          content: `A new account setup form has been completed.\n\nCompany: ${input.companyName}\nOwner: ${input.ownerFirstName} ${input.ownerLastName}\nEmail: ${input.ownerEmail}\nPhone: ${input.ownerPhone}\nEIN: ${input.ein}\nBusiness Entity: ${input.businessEntity}\n\nBusiness Address: ${input.businessStreet}, ${input.businessCity}, ${input.businessState} ${input.businessZip}\n\nAdmin Users: ${input.adminUsers.map((a) => `${a.firstName} ${a.lastName} (${a.email})`).join(", ")}`,
        });
        console.log("[Intake] Owner notified.");
      } catch (err) {
        console.error("[Intake] Owner notification failed:", err);
      }

      return { success: true };
    }),

  // Manual Sync to Google Sheets (admin only)
  manualSyncToSheets: protectedProcedure
    .use(({ ctx, next }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return next({ ctx });
    })
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        const { eq: eqOp } = await import("drizzle-orm");
        const APPS_SCRIPT_URL = process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

        if (!APPS_SCRIPT_URL) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Apps Script URL not configured" });
        }

        // Query unsynced completed submissions
        const unsynced = await db
          .select()
          .from(signupIntakes)
          .where(eqOp(signupIntakes.synced, "false"))
          .limit(100);

        if (unsynced.length === 0) {
          return { synced: 0, message: "No unsynced submissions found" };
        }

        let syncedCount = 0;

        for (const row of unsynced) {
          try {
            const payload = {
              action: "append",
              status: row.status,
              sessionId: row.sessionId,
              companyName: row.companyName,
              ein: row.ein,
              businessEntity: row.businessEntity,
              ownerFirstName: row.ownerFirstName,
              ownerLastName: row.ownerLastName,
              ownerEmail: row.ownerEmail,
              ownerPhone: row.ownerPhone,
              ownerTitle: row.ownerTitle,
              contactFirstName: row.contactFirstName,
              contactLastName: row.contactLastName,
              contactEmail: row.contactEmail,
              contactPhone: row.contactPhone,
              contactTitle: row.contactTitle,
              businessStreet: row.businessStreet,
              businessCity: row.businessCity,
              businessState: row.businessState,
              businessZip: row.businessZip,
              billingSameAsBusiness: row.billingSameAsBusiness,
              billingStreet: row.billingStreet,
              billingCity: row.billingCity,
              billingState: row.billingState,
              billingZip: row.billingZip,
              adminUsers: row.adminUsers,
              submittedAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
            };

            // POST with manual redirect handling
            const postResponse = await fetch(APPS_SCRIPT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              redirect: "manual",
            });

            let finalResponse;
            if (postResponse.status === 302 || postResponse.status === 301) {
              const redirectUrl = postResponse.headers.get("location");
              if (redirectUrl) {
                finalResponse = await fetch(redirectUrl, { method: "GET" });
              } else {
                throw new Error("Redirect without Location header");
              }
            } else {
              finalResponse = postResponse;
            }

            if (!finalResponse.ok) {
              throw new Error(`Apps Script returned ${finalResponse.status}`);
            }

            // Mark as synced
            await db
              .update(signupIntakes)
              .set({ synced: "true", syncedAt: new Date() })
              .where(eqOp(signupIntakes.id, row.id));

            syncedCount++;
          } catch (err) {
            console.error(`[ManualSync] Failed to sync row ${row.id}:`, err);
            // Continue with next row
          }
        }

        return { synced: syncedCount, message: `Synced ${syncedCount} of ${unsynced.length} submissions` };
      } catch (err) {
        console.error("[ManualSync] Error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sync failed" });
      }
    }),
});
