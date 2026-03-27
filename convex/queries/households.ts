import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";

async function getViewerProfile(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }

  return await ctx.db
    .query("userProfiles")
    .withIndex("by_authId", (q) => q.eq("authId", userId as string))
    .first();
}

export const getHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    if (!profile || profile.householdId !== args.householdId) {
      return null;
    }

    return await ctx.db.get(args.householdId);
  },
});

export const getHouseholdByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const household = await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!household) {
      return null;
    }

    const [members, ownerProfile] = await Promise.all([
      ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", household._id))
        .collect(),
      ctx.db
        .query("userProfiles")
        .withIndex("by_authId", (q) => q.eq("authId", household.createdBy))
        .first(),
    ]);

    return {
      householdId: household._id,
      name: household.name,
      inviteCode: household.inviteCode,
      memberCount: members.length,
      invitedBy: ownerProfile?.name ?? "Someone",
    };
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
