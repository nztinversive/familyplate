import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const createHousehold = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const authId = userId as string;
    const user = await ctx.db.get(userId);
    const email = user?.email ?? "";
    const userName = user?.name || email.split("@")[0] || "User";

    // Check if user already has a profile/household
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();

    if (existing) {
      throw new Error("You already belong to a household");
    }

    const inviteCode = generateInviteCode();

    const householdId = await ctx.db.insert("households", {
      name: args.name,
      createdBy: authId,
      inviteCode,
      createdAt: Date.now(),
    });

    await ctx.db.insert("userProfiles", {
      authId,
      householdId,
      name: userName,
      email,
      role: "admin",
      isChild: false,
      dietaryPreferences: [],
      allergies: [],
      dislikes: [],
      createdAt: Date.now(),
    });

    return { householdId, inviteCode };
  },
});

export const joinHousehold = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const authId = userId as string;
    const user = await ctx.db.get(userId);
    const email = user?.email ?? "";
    const userName = user?.name || email.split("@")[0] || "User";

    const household = await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!household) {
      throw new Error("Invalid invite code");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();

    if (existing) {
      throw new Error("You already belong to a household");
    }

    await ctx.db.insert("userProfiles", {
      authId,
      householdId: household._id,
      name: userName,
      email,
      role: "member",
      isChild: false,
      dietaryPreferences: [],
      allergies: [],
      dislikes: [],
      createdAt: Date.now(),
    });

    return { householdId: household._id };
  },
});
