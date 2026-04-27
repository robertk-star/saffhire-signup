import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq as eqOp } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { signupIntakes } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

import { storagePut } from "./storage";
import { upsertContactWithIntakeTag } from "./ghl";

const APPS_SCRIPT_URL = process.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

export const signupRouter = router({
  // ─── Submit Complete Intake ──────────────────────────────────────────────────
  submitIntake: publicProcedure
    .input(
      z.object({
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
        adminUsers: z.array(z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
        })).optional(),
        conversationLog: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // 1. Save to database - throw error if insert fails
      try {
        // Store all data as JSON in conversationLog to avoid schema mismatch
        // Only insert into columns we know exist in the database
        const fullData = JSON.stringify(input);
        await db.insert(signupIntakes).values({
          status: "Completed",
          conversationLog: fullData,
        });
        console.log("[Intake] Saved to database.");
      } catch (err) {
        console.error("[Intake] DB insert failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save intake: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }

      // 2. Data is now in the database; scheduled task will sync to Google Sheets hourly

      // 3. Create or update contact in GoHighLevel with Intake tag
      try {
        const contactId = await upsertContactWithIntakeTag({
          firstName: input.ownerFirstName,
          lastName: input.ownerLastName,
          email: input.ownerEmail,
          phone: input.ownerPhone,
          companyName: input.companyName,
        });
        if (contactId) {
          console.log(`[Intake] GHL contact created/updated: ${contactId}`);
        }
      } catch (err) {
        console.error("[Intake] GHL sync failed:", err);
      }

      // 4. Notify owner
      try {
        await notifyOwner({
          title: `New Credentialing Application: ${input.companyName || "Unnamed"}`,
          content: `A new credentialing application has been submitted. Check the admin dashboard for details.`,
        });
        console.log("[Intake] Owner notified.");
      } catch (err) {
        console.error("[Intake] Owner notification failed:", err);
      }

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
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let rows: any[];

      if (input.status !== "all") {
        rows = await db
          .select()
          .from(signupIntakes)
          .where(eqOp(signupIntakes.status, input.status))
          .limit(input.limit)
          .offset(input.offset);
      } else {
        rows = await db
          .select()
          .from(signupIntakes)
          .limit(input.limit)
          .offset(input.offset);
      }

      return { rows };
    }),

  // ─── Manual Sync to Google Sheets ────────────────────────────────────────────────
  manualSyncToSheets: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
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
            // Parse conversationLog JSON to get all form data
            let formData: Record<string, any> = {};
            if (row.conversationLog) {
              try {
                formData = JSON.parse(row.conversationLog);
              } catch {
                formData = {};
              }
            }

            const payload = {
              action: "append",
              status: row.status,
              ...formData,
              submittedAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
            };

            // POST with manual redirect handling
            const postResponse = await fetch(APPS_SCRIPT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              redirect: "follow",
            });

            if (postResponse.ok) {
              // Mark as synced
              await db
                .update(signupIntakes)
                .set({ synced: "true", syncedAt: new Date() })
                .where(eqOp(signupIntakes.id, row.id));

              syncedCount++;
              console.log(`[Sync] Row ${row.id} synced to Google Sheets`);
            } else {
              console.error(`[Sync] Failed to sync row ${row.id}: ${postResponse.status}`);
            }
          } catch (err) {
            console.error(`[Sync] Error syncing row ${row.id}:`, err);
          }
        }

        return { synced: syncedCount, message: `Synced ${syncedCount} of ${unsynced.length} submissions` };
      } catch (err) {
        console.error("[ManualSync] Error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sync failed" });
      }
    }),
});
