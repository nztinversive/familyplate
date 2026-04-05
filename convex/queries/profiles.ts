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

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    const hasProfile = profile !== null;
    const hasHousehold = profile?.householdId !== undefined;
    const needsOnboarding = !hasProfile || !hasHousehold;

    return {
      userId,
      authId,
      email: user?.email ?? "",
      userName: user?.name ?? user?.email?.split("@")[0] ?? "User",
      householdId: profile?.householdId ?? null,
      profileId: profile?._id ?? null,
      hasProfile,
      hasHousehold,
      needsOnboarding,
      postAuthRedirectPath: needsOnboarding ? "/setup/household" : "/plan",
    };
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const authId = userId as string;
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
  },
});

export const getProfiles = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const viewer = await getViewerProfile(ctx);
    if (!viewer || viewer.householdId !== args.householdId) {
      return [];
    }

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", args.householdId)
      )
      .collect();
  },
});
