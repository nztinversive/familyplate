import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";

export const getMyFeedback = query({
  args: {
    recipeId: v.id("recipeSuggestions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) return null;

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
