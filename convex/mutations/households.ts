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
    authId: v.string(),
    email: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteCode = generateInviteCode();

    const householdId = await ctx.db.insert("households", {
      name: args.name,
      createdBy: args.authId,
      inviteCode,
      createdAt: Date.now(),
    });

    // Create admin profile for the creator
    await ctx.db.insert("userProfiles", {
      authId: args.authId,
      householdId,
      name: args.userName,
      email: args.email,
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
    authId: v.string(),
    email: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const household = await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!household) {
      throw new Error("Invalid invite code");
    }

    // Check if user already in household
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (existing) {
      throw new Error("You already belong to a household");
    }

    await ctx.db.insert("userProfiles", {
      authId: args.authId,
      householdId: household._id,
      name: args.userName,
      email: args.email,
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
