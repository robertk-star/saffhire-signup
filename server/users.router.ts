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

  // ─── Create new user (admin only) ──────────────────────────────────────────────
  createUser: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        role: z.enum(["user", "admin"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eqOp(users.email, input.email))
        .limit(1);
      if (existingUser.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already in use",
        });
      }

      // Generate a unique openId
      const openId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const result = await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        role: input.role,
        loginMethod: "manual",
      });

      return {
        success: true,
        message: "User created successfully",
        userId: result[0].insertId,
      };
    }),

  // ─── Update user information (admin only) ──────────────────────────────────────
  updateUser: protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return next({ ctx });
  })
    .input(
      z.object({
        userId: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const user = await db.select().from(users).where(eqOp(users.id, input.userId)).limit(1);
      if (!user.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Check if new email is already in use by another user
      if (input.email && input.email !== user[0].email) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eqOp(users.email, input.email))
          .limit(1);
        if (existingUser.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already in use",
          });
        }
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update",
        });
      }

      await db.update(users).set(updateData).where(eqOp(users.id, input.userId));

      return { success: true, message: "User updated successfully" };
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
