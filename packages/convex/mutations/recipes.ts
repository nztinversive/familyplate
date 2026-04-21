import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, type MutationCtx } from "../_generated/server";

function requireNonEmptyString(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  return trimmed;
}

function requirePositiveNumber(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
  return value;
}

function normalizeStringList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

async function requireViewerProfile(ctx: MutationCtx) {
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

  return profile;
}

export const createCustomRecipe = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    ingredients: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
      })
    ),
    instructions: v.array(v.string()),
    effortLevel: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    estimatedTime: v.number(),
    servings: v.number(),
    tags: v.array(v.string()),
    nutrition: v.optional(
      v.object({
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
        fiber: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const title = requireNonEmptyString(args.title, "Title");
    const description = args.description.trim();
    const estimatedTime = requirePositiveNumber(args.estimatedTime, "Estimated time");
    const servings = requirePositiveNumber(args.servings, "Servings");
    const tags = normalizeStringList(args.tags);

    if (args.ingredients.length === 0) {
      throw new Error("Add at least one ingredient.");
    }

    if (args.instructions.length === 0) {
      throw new Error("Add at least one instruction.");
    }

    const ingredients = args.ingredients.map((ingredient, index) => ({
      name: requireNonEmptyString(ingredient.name, `Ingredient ${index + 1} name`),
      quantity: requirePositiveNumber(
        ingredient.quantity,
        `Ingredient ${index + 1} quantity`
      ),
      unit: requireNonEmptyString(ingredient.unit, `Ingredient ${index + 1} unit`),
      inPantry: false,
    }));

    const instructions = args.instructions.map((step, index) =>
      requireNonEmptyString(step, `Step ${index + 1}`)
    );

    const nutrition = args.nutrition
      ? {
          calories: requirePositiveNumber(args.nutrition.calories, "Calories"),
          protein: requirePositiveNumber(args.nutrition.protein, "Protein"),
          carbs: requirePositiveNumber(args.nutrition.carbs, "Carbs"),
          fat: requirePositiveNumber(args.nutrition.fat, "Fat"),
          ...(args.nutrition.fiber !== undefined
            ? {
                fiber: requirePositiveNumber(args.nutrition.fiber, "Fiber"),
              }
            : {}),
        }
      : undefined;

    const recipeId = await ctx.db.insert("recipeSuggestions", {
      householdId: profile.householdId,
      createdBy: profile._id,
      title,
      description,
      ingredients,
      instructions,
      effortLevel: args.effortLevel,
      estimatedTime,
      servings,
      tags,
      nutrition,
      source: "custom",
      createdAt: Date.now(),
    });

    await ctx.db.insert("savedRecipes", {
      householdId: profile.householdId,
      recipeId,
      savedBy: profile._id,
      savedAt: Date.now(),
    });

    return recipeId;
  },
});
