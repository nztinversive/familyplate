import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import {
  inferCategory,
  makeIngredientKey,
  roundQuantity,
} from "../lib/mealPlanning";

export const generateGroceryList = action({
  args: {
    mealPlanId: v.optional(v.id("weeklyMealPlans")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to generate a grocery list.");
    }

    try {
      const authId = userId as string;
      const context = await ctx.runQuery(
        internal["internal/planner"].getMealPlanGroceryContext,
        {
          authId,
          mealPlanId: args.mealPlanId,
        }
      );

      const neededIngredients = new Map<
        string,
        { name: string; quantity: number; unit: string; category: string }
      >();

      for (const meal of context.meals.filter((meal) => meal.status !== "skipped")) {
        for (const ingredient of meal.recipe.ingredients) {
          const key = makeIngredientKey(ingredient.name, ingredient.unit);
          const existing = neededIngredients.get(key);
          const nextQuantity = (existing?.quantity ?? 0) + ingredient.quantity;

          neededIngredients.set(key, {
            name: existing?.name ?? ingredient.name,
            quantity: roundQuantity(nextQuantity),
            unit: ingredient.unit,
            category: existing?.category ?? inferCategory(ingredient.name),
          });
        }
      }

      const pantryTotals = new Map<string, number>();
      for (const item of context.pantryItems) {
        const key = makeIngredientKey(item.name, item.unit);
        pantryTotals.set(key, (pantryTotals.get(key) ?? 0) + item.quantity);
      }

      const items = Array.from(neededIngredients.entries())
        .map(([key, ingredient]) => {
          const available = pantryTotals.get(key) ?? 0;
          return {
            name: ingredient.name,
            quantity: roundQuantity(Math.max(ingredient.quantity - available, 0)),
            unit: ingredient.unit,
            category: ingredient.category,
            checked: false,
          };
        })
        .filter((item) => item.quantity > 0)
        .sort((a, b) =>
          a.category === b.category
            ? a.name.localeCompare(b.name)
            : a.category.localeCompare(b.category)
        );

      const groceryListId = await ctx.runMutation(
        internal["internal/planner"].saveGeneratedGroceryList,
        {
          householdId: context.mealPlan.householdId,
          mealPlanId: context.mealPlan._id,
          items,
        }
      );

      return {
        groceryListId,
      };
    } catch (error) {
      console.error("generateGroceryList failed", error);
      throw new Error("Unable to generate the grocery list right now.");
    }
  },
});
