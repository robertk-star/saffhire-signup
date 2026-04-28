import { z } from "zod";
import { eq as eqOp } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

export const usersRouter = router({
  // ─── List all users (admin only) ──────────────────────────────────────────────
  listUsers: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allUsers = await db.select().from(users).orderBy(users.createdAt);
      return { users: allUsers };
    }),

  // ─── Promote user to admin (admin only) ───────────────────────────────────────
  promoteToAdmin: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const user = await db.select().from(users).where(eqOp(users.id, input.userId)).limit(1);
      if (!user.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db
        .update(users)
        .set({ role: "admin" })
        .where(eqOp(users.id, input.userId));

      return { success: true, message: `User promoted to admin` };
    }),

  // ─── Demote user to regular user (admin only) ─────────────────────────────────
  demoteToUser: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const user = await db.select().from(users).where(eqOp(users.id, input.userId)).limit(1);
      if (!user.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Prevent demoting the current user
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot demote yourself",
        });
      }

      await db
        .update(users)
        .set({ role: "user" })
        .where(eqOp(users.id, input.userId));

      return { success: true, message: `User demoted to regular user` };
    }),

  // ─── Delete user (admin only) ─────────────────────────────────────────────────
  deleteUser: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const user = await db.select().from(users).where(eqOp(users.id, input.userId)).limit(1);
      if (!user.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Prevent deleting the current user
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete yourself",
        });
      }

      await db.delete(users).where(eqOp(users.id, input.userId));

      return { success: true, message: `User deleted` };
    }),
});
