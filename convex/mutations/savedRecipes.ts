import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const saveRecipe = mutation({
  args: {
    recipeId: v.id("recipeSuggestions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.householdId !== profile.householdId) {
      throw new Error("Recipe not found");
    }

    const existingSaves = await ctx.db
      .query("savedRecipes")
      .withIndex("by_savedBy", (q) => q.eq("savedBy", profile._id))
      .collect();
    const existingSave = existingSaves.find((saved) => saved.recipeId === args.recipeId);

    if (existingSave) {
      return existingSave._id;
    }

    return await ctx.db.insert("savedRecipes", {
      householdId: profile.householdId,
      recipeId: args.recipeId,
      savedBy: profile._id,
      savedAt: Date.now(),
    });
  },
});

export const unsaveRecipe = mutation({
  args: {
    recipeId: v.id("recipeSuggestions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    const savedRecipes = await ctx.db
      .query("savedRecipes")
      .withIndex("by_savedBy", (q) => q.eq("savedBy", profile._id))
      .collect();

    const matchingSaves = savedRecipes.filter((saved) => saved.recipeId === args.recipeId);
    for (const saved of matchingSaves) {
      await ctx.db.delete(saved._id);
    }

    return { removed: matchingSaves.length > 0 };
  },
});
