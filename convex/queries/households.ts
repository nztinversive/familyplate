import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

export const getHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.householdId);
  },
});

export const getHouseholdByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();
  },
});

export const getMyHousehold = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();

    if (!profile) return null;

    const household = await ctx.db.get(profile.householdId);
    return household;
  },
});
