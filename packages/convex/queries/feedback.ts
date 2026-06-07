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

function addCount(map: Map<string, number>, value: string) {
  const key = value.trim();
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toLearningItems(map: Map<string, number>, limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export const getMyHouseholdLearningSummary = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getViewerProfile(ctx);
    if (!profile) {
      return {
        favorites: [],
        avoiding: [],
        kidApproved: [],
        tooMuchPrep: [],
        tooSpicy: [],
        greatLeftovers: [],
        removableDislikes: [],
        feedbackCount: 0,
      };
    }

    const recipes = await ctx.db
      .query("recipeSuggestions")
      .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
      .collect();

    const recipeTitles = new Map(recipes.map((recipe) => [recipe._id, recipe.title]));
    const recipeStats = new Map<
      string,
      {
        totalRating: number;
        count: number;
        liked: number;
        disliked: number;
        tags: string[];
      }
    >();
    const kidApproved = new Map<string, number>();
    const tooMuchPrep = new Map<string, number>();
    const tooSpicy = new Map<string, number>();
    const greatLeftovers = new Map<string, number>();
    let feedbackCount = 0;

    for (const recipe of recipes) {
      const feedback = await ctx.db
        .query("mealFeedback")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();

      for (const entry of feedback) {
        feedbackCount += 1;
        const title = recipeTitles.get(entry.recipeId) ?? recipe.title;
        const stats = recipeStats.get(title) ?? {
          totalRating: 0,
          count: 0,
          liked: 0,
          disliked: 0,
          tags: [],
        };
        stats.totalRating += entry.rating;
        stats.count += 1;
        if (entry.liked) stats.liked += 1;
        else stats.disliked += 1;
        stats.tags.push(...entry.tags);
        recipeStats.set(title, stats);

        const tagSet = new Set(entry.tags.map((tag) => tag.toLowerCase()));
        if (tagSet.has("kid liked it")) addCount(kidApproved, title);
        if (tagSet.has("too hard") || tagSet.has("too much prep")) {
          addCount(tooMuchPrep, title);
        }
        if (tagSet.has("too spicy")) addCount(tooSpicy, title);
        if (tagSet.has("great leftovers")) addCount(greatLeftovers, title);
      }
    }

    const favorites = new Map<string, number>();
    const avoiding = new Map<string, number>();
    for (const [title, stats] of recipeStats) {
      const average = stats.totalRating / stats.count;
      if (average >= 4 || stats.liked > stats.disliked) {
        favorites.set(title, stats.count);
      }
      if (average <= 2 || stats.disliked > stats.liked) {
        avoiding.set(title, stats.count);
      }
    }

    for (const dislike of profile.dislikes ?? []) {
      addCount(avoiding, dislike);
    }

    return {
      favorites: toLearningItems(favorites),
      avoiding: toLearningItems(avoiding),
      kidApproved: toLearningItems(kidApproved),
      tooMuchPrep: toLearningItems(tooMuchPrep),
      tooSpicy: toLearningItems(tooSpicy),
      greatLeftovers: toLearningItems(greatLeftovers),
      removableDislikes: profile.dislikes ?? [],
      feedbackCount,
    };
  },
});
