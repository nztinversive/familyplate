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

export const importFromPublicPlan = mutation({
  args: {
    planId: v.id("publicPlans"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) throw new Error("Profile not found");

    const plan = await ctx.db.get(args.planId);
    if (!plan) return { saved: 0 };

    const now = Date.now();
    let saved = 0;
    for (const s of plan.suggestions) {
      const recipeId = await ctx.db.insert("recipeSuggestions", {
        householdId: profile.householdId,
        createdBy: profile._id,
        title: s.name,
        description: s.description,
        ingredients: s.ingredients,
        instructions: s.instructions,
        effortLevel: s.effortLevel,
        estimatedTime: s.estimatedTime,
        servings: s.servings,
        tags: [],
        usedPantryItems: s.ingredients
          .filter((ing) => ing.inPantry)
          .map((ing) => ing.name),
        source: "ai",
        createdAt: now,
      });
      await ctx.db.insert("savedRecipes", {
        householdId: profile.householdId,
        recipeId,
        savedBy: profile._id,
        savedAt: now,
      });
      saved++;
    }

    return { saved };
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
