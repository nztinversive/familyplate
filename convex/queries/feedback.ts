import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function getViewerProfile(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  return await ctx.db
    .query("userProfiles")
    .withIndex("by_authId", (q) => q.eq("authId", userId as string))
    .first();
}

async function canViewRecipe(
  ctx: QueryCtx,
  recipeId: Id<"recipeSuggestions">,
  householdId: Id<"households">
) {
  const recipe = await ctx.db.get(recipeId);
  return recipe?.householdId === householdId;
}

export const getMyFeedback = query({
  args: {
    recipeId: v.id("recipeSuggestions"),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    if (!profile) return null;

    if (!(await canViewRecipe(ctx, args.recipeId, profile.householdId))) {
      return null;
    }

    const allFeedback = await ctx.db
      .query("mealFeedback")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();

    return allFeedback.find((f) => f.oderId === profile._id) ?? null;
  },
});

export const getRecipeFeedback = query({
  args: {
    recipeId: v.id("recipeSuggestions"),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    if (!profile) return [];

    if (!(await canViewRecipe(ctx, args.recipeId, profile.householdId))) {
      return [];
    }

    const allFeedback = await ctx.db
      .query("mealFeedback")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();

    const feedbackWithNames = await Promise.all(
      allFeedback.map(async (f) => {
        const profile = await ctx.db.get(f.oderId);
        return {
          _id: f._id,
          rating: f.rating,
          liked: f.liked,
          tags: f.tags,
          notes: f.notes,
          createdAt: f.createdAt,
          userName: profile?.name ?? "Unknown",
        };
      })
    );

    return feedbackWithNames.sort((a, b) => b.createdAt - a.createdAt);
  },
});
