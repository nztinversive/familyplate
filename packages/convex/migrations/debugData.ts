import { internalQuery } from "../_generated/server";

export const checkData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const households = await ctx.db.query("households").collect();
    const profiles = await ctx.db.query("userProfiles").collect();
    const recipes = await ctx.db.query("recipeSuggestions").collect();
    const mealPlans = await ctx.db.query("weeklyMealPlans").collect();
    const plannedMeals = await ctx.db.query("plannedMeals").collect();

    return {
      householdCount: households.length,
      households: households.map((h) => ({ id: h._id, name: h.name })),
      profileCount: profiles.length,
      profiles: profiles.map((p) => ({
        id: p._id,
        name: p.name,
        householdId: p.householdId,
        allergies: p.allergies,
        dislikes: p.dislikes,
      })),
      recipeCount: recipes.length,
      recipes: recipes.map((r) => ({
        id: r._id,
        title: r.title,
        householdId: r.householdId,
        ingredientNames: r.ingredients.map((i) => i.name),
      })),
      mealPlanCount: mealPlans.length,
      plannedMealCount: plannedMeals.length,
    };
  },
});
