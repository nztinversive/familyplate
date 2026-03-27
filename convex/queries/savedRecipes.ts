import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";

export const getMySavedRecipes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) {
      return [];
    }

    const savedRecipes = await ctx.db
      .query("savedRecipes")
      .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
      .collect();

    const recipes = await Promise.all(
      savedRecipes.map(async (savedRecipe) => {
        const [recipe, savedByProfile] = await Promise.all([
          ctx.db.get(savedRecipe.recipeId),
          ctx.db.get(savedRecipe.savedBy),
        ]);

        if (!recipe) {
          return null;
        }

        return {
          ...savedRecipe,
          recipe,
          savedByProfile,
        };
      })
    );

    return recipes
      .filter((savedRecipe) => savedRecipe !== null)
      .sort((a, b) => b.savedAt - a.savedAt);
  },
});

export const isRecipeSaved = query({
  args: {
    recipeId: v.id("recipeSuggestions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) {
      return false;
    }

    const savedRecipes = await ctx.db
      .query("savedRecipes")
      .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
      .collect();

    return savedRecipes.some((savedRecipe) => savedRecipe.recipeId === args.recipeId);
  },
});
