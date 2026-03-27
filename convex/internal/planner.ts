import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

const ingredientValidator = v.object({
  name: v.string(),
  quantity: v.number(),
  unit: v.string(),
  inPantry: v.boolean(),
});

const nutritionValidator = v.object({
  calories: v.number(),
  protein: v.number(),
  carbs: v.number(),
  fat: v.number(),
  fiber: v.optional(v.number()),
});

const recipeValidator = v.object({
  name: v.string(),
  description: v.string(),
  ingredients: v.array(ingredientValidator),
  instructions: v.array(v.string()),
  effortLevel: v.union(
    v.literal("easy"),
    v.literal("medium"),
    v.literal("hard")
  ),
  estimatedTime: v.number(),
  servings: v.number(),
  tags: v.array(v.string()),
  nutrition: v.optional(nutritionValidator),
  usedPantryItems: v.optional(v.array(v.string())),
});

function assertRecipeHasIngredients(recipeName: string, ingredients: Array<{ name: string }>) {
  if (ingredients.length === 0) {
    throw new Error(`Recipe "${recipeName}" must include at least one ingredient.`);
  }
}

export const getHouseholdGenerationContext = internalQuery({
  args: {
    authId: v.string(),
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (!membership || membership.householdId !== args.householdId) {
      throw new Error("You do not have access to that household.");
    }

    const household = await ctx.db.get(args.householdId);
    if (!household) {
      throw new Error("Household not found.");
    }

    const [pantryItems, profiles] = await Promise.all([
      ctx.db
        .query("pantryItems")
        .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
        .collect(),
      ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
        .collect(),
    ]);

    return {
      household,
      pantryItems,
      profiles,
    };
  },
});

export const getMealSwapContext = internalQuery({
  args: {
    authId: v.string(),
    mealId: v.id("plannedMeals"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (!membership) {
      throw new Error("Profile not found.");
    }

    const meal = await ctx.db.get(args.mealId);
    if (!meal) {
      throw new Error("Meal not found.");
    }

    const plan = await ctx.db.get(meal.mealPlanId);
    if (!plan || plan.householdId !== membership.householdId) {
      throw new Error("Meal does not belong to your household.");
    }

    const [household, recipe, pantryItems, profiles, planMeals] = await Promise.all([
      ctx.db.get(plan.householdId),
      ctx.db.get(meal.recipeId),
      ctx.db
        .query("pantryItems")
        .withIndex("by_householdId", (q) => q.eq("householdId", plan.householdId))
        .collect(),
      ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", plan.householdId))
        .collect(),
      ctx.db
        .query("plannedMeals")
        .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", plan._id))
        .collect(),
    ]);

    if (!household) {
      throw new Error("Household not found.");
    }

    if (!recipe) {
      throw new Error("Recipe not found.");
    }

    const plannedMeals = await Promise.all(
      planMeals.map(async (planMeal) => {
        const planRecipe = await ctx.db.get(planMeal.recipeId);
        return {
          ...planMeal,
          recipeTitle: planRecipe?.title ?? null,
          recipeTags: planRecipe?.tags ?? [],
        };
      })
    );

    return {
      household,
      plan,
      meal,
      recipe,
      pantryItems,
      profiles,
      plannedMeals,
    };
  },
});

export const getMealPlanGroceryContext = internalQuery({
  args: {
    authId: v.string(),
    mealPlanId: v.optional(v.id("weeklyMealPlans")),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (!membership) {
      throw new Error("Profile not found.");
    }

    let mealPlan = args.mealPlanId ? await ctx.db.get(args.mealPlanId) : null;

    if (mealPlan && mealPlan.householdId !== membership.householdId) {
      throw new Error("Meal plan does not belong to your household.");
    }

    if (!mealPlan) {
      const plans = await ctx.db
        .query("weeklyMealPlans")
        .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
        .collect();

      mealPlan =
        plans
          .filter((plan) => plan.status === "active")
          .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
    }

    if (!mealPlan) {
      throw new Error("No active meal plan found.");
    }

    const [pantryItems, meals] = await Promise.all([
      ctx.db
        .query("pantryItems")
        .withIndex("by_householdId", (q) => q.eq("householdId", mealPlan.householdId))
        .collect(),
      ctx.db
        .query("plannedMeals")
        .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", mealPlan!._id))
        .collect(),
    ]);

    const mealsWithRecipes = await Promise.all(
      meals.map(async (meal) => {
        const recipe = await ctx.db.get(meal.recipeId);
        return recipe ? { ...meal, recipe } : null;
      })
    );

    return {
      mealPlan,
      pantryItems,
      meals: mealsWithRecipes.filter((meal) => meal !== null),
    };
  },
});

export const saveGeneratedMealPlan = internalMutation({
  args: {
    householdId: v.id("households"),
    weekStartDate: v.string(),
    meals: v.array(
      v.object({
        date: v.string(),
        primary: recipeValidator,
        alternatives: v.array(recipeValidator),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existingPlans = await ctx.db
      .query("weeklyMealPlans")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    for (const plan of existingPlans) {
      if (plan.status === "active") {
        await ctx.db.patch(plan._id, { status: "completed" });
      }
    }

    const mealPlanId = await ctx.db.insert("weeklyMealPlans", {
      householdId: args.householdId,
      weekStartDate: args.weekStartDate,
      status: "active",
      createdAt: now,
    });

    let createdAt = now;

    for (const meal of args.meals) {
      assertRecipeHasIngredients(meal.primary.name, meal.primary.ingredients);
      const primaryRecipeId = await ctx.db.insert("recipeSuggestions", {
        householdId: args.householdId,
        title: meal.primary.name,
        description: meal.primary.description,
        ingredients: meal.primary.ingredients,
        instructions: meal.primary.instructions,
        effortLevel: meal.primary.effortLevel,
        estimatedTime: meal.primary.estimatedTime,
        servings: meal.primary.servings,
        tags: meal.primary.tags,
        nutrition: meal.primary.nutrition,
        usedPantryItems: meal.primary.usedPantryItems,
        source: "ai",
        createdAt: createdAt++,
      });

      const alternativeRecipeIds = [];
      for (const alternative of meal.alternatives) {
        assertRecipeHasIngredients(alternative.name, alternative.ingredients);
        const alternativeId = await ctx.db.insert("recipeSuggestions", {
          householdId: args.householdId,
          title: alternative.name,
          description: alternative.description,
          ingredients: alternative.ingredients,
          instructions: alternative.instructions,
          effortLevel: alternative.effortLevel,
          estimatedTime: alternative.estimatedTime,
          servings: alternative.servings,
          tags: alternative.tags,
          nutrition: alternative.nutrition,
          usedPantryItems: alternative.usedPantryItems,
          source: "ai",
          createdAt: createdAt++,
        });

        alternativeRecipeIds.push(alternativeId);
      }

      await ctx.db.insert("plannedMeals", {
        mealPlanId,
        recipeId: primaryRecipeId,
        alternativeRecipeIds,
        date: meal.date,
        mealType: "dinner",
        status: "planned",
      });
    }

    return mealPlanId;
  },
});

export const saveMealAlternatives = internalMutation({
  args: {
    mealId: v.id("plannedMeals"),
    alternatives: v.array(recipeValidator),
  },
  handler: async (ctx, args) => {
    const meal = await ctx.db.get(args.mealId);
    if (!meal) {
      throw new Error("Meal not found.");
    }

    const plan = await ctx.db.get(meal.mealPlanId);
    if (!plan) {
      throw new Error("Meal plan not found.");
    }

    let createdAt = Date.now();
    const alternativeRecipeIds = [];

    for (const alternative of args.alternatives) {
      assertRecipeHasIngredients(alternative.name, alternative.ingredients);
      const alternativeId = await ctx.db.insert("recipeSuggestions", {
        householdId: plan.householdId,
        title: alternative.name,
        description: alternative.description,
        ingredients: alternative.ingredients,
        instructions: alternative.instructions,
        effortLevel: alternative.effortLevel,
        estimatedTime: alternative.estimatedTime,
        servings: alternative.servings,
        tags: alternative.tags,
        nutrition: alternative.nutrition,
        usedPantryItems: alternative.usedPantryItems,
        source: "ai",
        createdAt: createdAt++,
      });

      alternativeRecipeIds.push(alternativeId);
    }

    await ctx.db.patch(args.mealId, {
      alternativeRecipeIds,
    });

    return args.mealId;
  },
});

export const saveGeneratedGroceryList = internalMutation({
  args: {
    householdId: v.id("households"),
    mealPlanId: v.id("weeklyMealPlans"),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
        category: v.string(),
        checked: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existingLists = await ctx.db
      .query("groceryLists")
      .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", args.mealPlanId))
      .collect();

    for (const list of existingLists) {
      await ctx.db.delete(list._id);
    }

    return await ctx.db.insert("groceryLists", {
      householdId: args.householdId,
      mealPlanId: args.mealPlanId,
      items: args.items,
      createdAt: Date.now(),
    });
  },
});

export const getQuickDinnerContext = internalQuery({
  args: {
    authId: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (!membership) {
      throw new Error("Profile not found.");
    }

    const [pantryItems, profiles] = await Promise.all([
      ctx.db
        .query("pantryItems")
        .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
        .collect(),
      ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
        .collect(),
    ]);

    return {
      householdId: membership.householdId,
      pantryItems: pantryItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      })),
      profiles: profiles.map((p) => ({
        dietaryPreferences: p.dietaryPreferences ?? [],
        allergies: p.allergies ?? [],
        dislikes: p.dislikes ?? [],
      })),
    };
  },
});

/**
 * Fetch all meal feedback for a household and return a structured summary
 * that can be injected into AI prompts for smarter meal planning.
 */
export const getHouseholdFeedbackSummary = internalQuery({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    // Get all recipes for this household
    const recipes = await ctx.db
      .query("recipeSuggestions")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    if (recipes.length === 0) return { summary: "", favorites: [], disliked: [] };

    // Get all feedback for each recipe
    const allFeedback: Array<{
      recipeTitle: string;
      rating: number;
      liked: boolean;
      tags: string[];
      notes?: string;
    }> = [];

    for (const recipe of recipes) {
      const feedback = await ctx.db
        .query("mealFeedback")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();

      for (const f of feedback) {
        allFeedback.push({
          recipeTitle: recipe.title,
          rating: f.rating,
          liked: f.liked,
          tags: f.tags,
          notes: f.notes,
        });
      }
    }

    if (allFeedback.length === 0) return { summary: "", favorites: [], disliked: [] };

    // Aggregate by recipe
    const recipeStats = new Map<
      string,
      { totalRating: number; count: number; liked: number; disliked: number; tags: string[]; notes: string[] }
    >();

    for (const f of allFeedback) {
      const existing = recipeStats.get(f.recipeTitle) ?? {
        totalRating: 0,
        count: 0,
        liked: 0,
        disliked: 0,
        tags: [],
        notes: [],
      };
      existing.totalRating += f.rating;
      existing.count += 1;
      if (f.liked) existing.liked += 1;
      else existing.disliked += 1;
      existing.tags.push(...f.tags);
      if (f.notes) existing.notes.push(f.notes);
      recipeStats.set(f.recipeTitle, existing);
    }

    // Sort by average rating
    const sorted = Array.from(recipeStats.entries())
      .map(([title, stats]) => ({
        title,
        avgRating: Math.round((stats.totalRating / stats.count) * 10) / 10,
        count: stats.count,
        liked: stats.liked,
        disliked: stats.disliked,
        topTags: Array.from(
          stats.tags.reduce((acc, tag) => {
            acc.set(tag, (acc.get(tag) ?? 0) + 1);
            return acc;
          }, new Map<string, number>())
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([tag]) => tag),
        notes: stats.notes.slice(0, 2), // keep at most 2 notes to limit token usage
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    const favorites = sorted.filter((r) => r.avgRating >= 4).slice(0, 5);
    const disliked = sorted.filter((r) => r.avgRating <= 2).slice(0, 5);

    // Build a text summary for the AI prompt
    const lines: string[] = [];

    if (favorites.length > 0) {
      lines.push("HOUSEHOLD FAVORITES (make more meals like these):");
      for (const f of favorites) {
        const tagStr = f.topTags.length > 0 ? ` [tags: ${f.topTags.join(", ")}]` : "";
        const noteStr = f.notes.length > 0 ? ` — "${f.notes[0]}"` : "";
        lines.push(`- "${f.title}" (avg ${f.avgRating}/5, ${f.liked} liked)${tagStr}${noteStr}`);
      }
    }

    if (disliked.length > 0) {
      lines.push("");
      lines.push("DISLIKED MEALS (avoid similar recipes):");
      for (const d of disliked) {
        const tagStr = d.topTags.length > 0 ? ` [tags: ${d.topTags.join(", ")}]` : "";
        const noteStr = d.notes.length > 0 ? ` — "${d.notes[0]}"` : "";
        lines.push(`- "${d.title}" (avg ${d.avgRating}/5, ${d.disliked} disliked)${tagStr}${noteStr}`);
      }
    }

    // Tag frequency across all feedback
    const globalTags = new Map<string, number>();
    for (const f of allFeedback) {
      for (const tag of f.tags) {
        globalTags.set(tag, (globalTags.get(tag) ?? 0) + 1);
      }
    }
    const frequentTags = Array.from(globalTags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (frequentTags.length > 0) {
      lines.push("");
      lines.push("MOST COMMON FEEDBACK TAGS:");
      for (const [tag, count] of frequentTags) {
        lines.push(`- "${tag}" (${count}x)`);
      }
    }

    return {
      summary: lines.join("\n"),
      favorites: favorites.map((f) => f.title),
      disliked: disliked.map((d) => d.title),
    };
  },
});
