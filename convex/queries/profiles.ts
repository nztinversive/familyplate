import { query } from "../_generated/server";
import { v } from "convex/values";

export const getMyProfile = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
  },
});

export const getProfiles = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", args.householdId)
      )
      .collect();
  },
});
