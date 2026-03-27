import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";

async function getViewerProfile(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  return await ctx.db
    .query("userProfiles")
    .withIndex("by_authId", (q) => q.eq("authId", userId as string))
    .first();
}

export const getMyPantryItems = query({
  args: {
    storageLocation: v.optional(
      v.union(
        v.literal("pantry"),
        v.literal("fridge"),
        v.literal("freezer")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return [];

    const householdId = profile.householdId;

    if (args.storageLocation) {
      return await ctx.db
        .query("pantryItems")
        .withIndex("by_householdId_storageLocation", (q) =>
          q
            .eq("householdId", householdId)
            .eq("storageLocation", args.storageLocation!)
        )
        .collect();
    }

    return await ctx.db
      .query("pantryItems")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", householdId)
      )
      .collect();
  },
});

// Keep the original for backward compat
export const getPantryItems = query({
  args: {
    householdId: v.id("households"),
    storageLocation: v.optional(
      v.union(
        v.literal("pantry"),
        v.literal("fridge"),
        v.literal("freezer")
      )
    ),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    if (!profile || profile.householdId !== args.householdId) {
      return [];
    }

    if (args.storageLocation) {
      return await ctx.db
        .query("pantryItems")
        .withIndex("by_householdId_storageLocation", (q) =>
          q
            .eq("householdId", args.householdId)
            .eq("storageLocation", args.storageLocation!)
        )
        .collect();
    }

    return await ctx.db
      .query("pantryItems")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", args.householdId)
      )
      .collect();
  },
});
