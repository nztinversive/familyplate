import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

export const getMyMealPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return null;

    const householdId = profile.householdId;
    const plans = await ctx.db
      .query("weeklyMealPlans")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();

    const activePlan =
      plans
        .filter((plan) => plan.status === "active")
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

    if (!activePlan) return null;

    const meals = await ctx.db
      .query("plannedMeals")
      .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", activePlan._id))
      .collect();

    const mealsWithRecipes = await Promise.all(
      meals
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(async (meal) => {
          const [recipe, alternatives] = await Promise.all([
            ctx.db.get(meal.recipeId),
            Promise.all(
              (meal.alternativeRecipeIds ?? []).map((recipeId) => ctx.db.get(recipeId))
            ),
          ]);
          if (!recipe) return null;

          return {
            ...meal,
            recipe,
            alternatives: alternatives.filter((alternative) => alternative !== null),
          };
        })
    );

    return {
      plan: activePlan,
      meals: mealsWithRecipes.filter((meal) => meal !== null),
    };
  },
});

export const getMyRecipeSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return [];

    const householdId = profile.householdId;
    const recipes = await ctx.db
      .query("recipeSuggestions")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();

    return recipes.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getMyMealPlanByWeek = query({
  args: {
    weekStartDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return null;

    const householdId = profile.householdId;
    const plans = await ctx.db
      .query("weeklyMealPlans")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();

    const matchingPlan = plans.find((plan) => plan.weekStartDate === args.weekStartDate) ?? null;
    if (!matchingPlan) return null;

    const meals = await ctx.db
      .query("plannedMeals")
      .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", matchingPlan._id))
      .collect();

    const mealsWithRecipes = await Promise.all(
      meals
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(async (meal) => {
          const [recipe, alternatives] = await Promise.all([
            ctx.db.get(meal.recipeId),
            Promise.all(
              (meal.alternativeRecipeIds ?? []).map((recipeId) => ctx.db.get(recipeId))
            ),
          ]);
          if (!recipe) return null;
          return {
            ...meal,
            recipe,
            alternatives: alternatives.filter((alt) => alt !== null),
          };
        })
    );

    return {
      plan: matchingPlan,
      meals: mealsWithRecipes.filter((meal) => meal !== null),
    };
  },
});

export const getMyMealPlanWeeks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return [];

    const plans = await ctx.db
      .query("weeklyMealPlans")
      .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
      .collect();

    return plans
      .map((plan) => ({
        _id: plan._id,
        weekStartDate: plan.weekStartDate,
        status: plan.status,
        createdAt: plan.createdAt,
      }))
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  },
});

export const getMealPlanById = query({
  args: {
    mealPlanId: v.id("weeklyMealPlans"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return null;

    const householdId = profile.householdId;
    const plan = await ctx.db.get(args.mealPlanId);

    if (!plan || plan.householdId !== householdId) {
      return null;
    }

    const meals = await ctx.db
      .query("plannedMeals")
      .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", plan._id))
      .collect();

    const mealsWithRecipes = await Promise.all(
      meals
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(async (meal) => {
          const [recipe, alternatives] = await Promise.all([
            ctx.db.get(meal.recipeId),
            Promise.all(
              (meal.alternativeRecipeIds ?? []).map((recipeId) => ctx.db.get(recipeId))
            ),
          ]);
          if (!recipe) return null;

          return {
            ...meal,
            recipe,
            alternatives: alternatives.filter((alternative) => alternative !== null),
          };
        })
    );

    return {
      plan,
      meals: mealsWithRecipes.filter((meal) => meal !== null),
    };
  },
});

export const getMealDetail = query({
  args: {
    mealId: v.id("plannedMeals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return null;

    const meal = await ctx.db.get(args.mealId);
    if (!meal) return null;

    const plan = await ctx.db.get(meal.mealPlanId);
    if (!plan || plan.householdId !== profile.householdId) {
      return null;
    }

    const [recipe, alternatives] = await Promise.all([
      ctx.db.get(meal.recipeId),
      Promise.all(
        (meal.alternativeRecipeIds ?? []).map((recipeId) => ctx.db.get(recipeId))
      ),
    ]);

    if (!recipe) {
      return null;
    }

    return {
      meal,
      plan,
      recipe,
      alternatives: alternatives.filter((alternative) => alternative !== null),
    };
  },
});
