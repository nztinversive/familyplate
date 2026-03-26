import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const ingredientValidator = v.object({
  name: v.string(),
  quantity: v.number(),
  unit: v.string(),
  inPantry: v.boolean(),
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
  usedPantryItems: v.array(v.string()),
});

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
        usedPantryItems: meal.primary.usedPantryItems,
        source: "ai",
        createdAt: createdAt++,
      });

      const alternativeRecipeIds = [];
      for (const alternative of meal.alternatives) {
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
