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
      .withIndex("by_savedBy", (q) => q.eq("savedBy", profile._id))
      .collect();

    const recipes = await Promise.all(
      savedRecipes.map(async (savedRecipe) => {
        const [recipe, savedByProfile] = await Promise.all([
          ctx.db.get(savedRecipe.recipeId),
          ctx.db.get(savedRecipe.savedBy),
        ]);

        if (!recipe || recipe.householdId !== profile.householdId) {
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

    const savedRecipe = await ctx.db
      .query("savedRecipes")
      .withIndex("by_savedBy_recipeId", (q) =>
        q.eq("savedBy", profile._id).eq("recipeId", args.recipeId)
      )
      .first();

    return savedRecipe !== null;
  },
});
