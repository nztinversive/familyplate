"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal as api } from "../_generated/api";
import { action } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  inferCategory,
  makeIngredientKey,
  roundQuantity,
} from "../lib/mealPlanning";

type PantryForPrompt = Pick<
  Doc<"pantryItems">,
  | "name"
  | "quantity"
  | "unit"
  | "category"
  | "storageLocation"
  | "expirationDate"
  | "addedAt"
>;
type GroceryContext = {
  mealPlan: Pick<Doc<"weeklyMealPlans">, "householdId"> & {
    _id: Id<"weeklyMealPlans">;
    weekStartDate: string;
    status: "draft" | "active" | "completed";
    createdAt: number;
  };
  pantryItems: PantryForPrompt[];
  meals: Array<{
    status: "planned" | "cooked" | "skipped";
    recipe: Pick<Doc<"recipeSuggestions">, "ingredients">;
  }>;
};

export const generateGroceryList: ReturnType<typeof action> = action({
  args: {
    mealPlanId: v.optional(v.id("weeklyMealPlans")),
  },
  handler: async (
    ctx,
    args: { mealPlanId?: Id<"weeklyMealPlans"> }
  ): Promise<{ groceryListId: Id<"groceryLists"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to generate a grocery list.");
    }

    try {
      const authId = userId as string;
      const context = await ctx.runQuery(
        api.internal.planner.getMealPlanGroceryContext,
        {
          authId,
          mealPlanId: args.mealPlanId,
        }
      ) as unknown as GroceryContext;

      const neededIngredients = new Map<
        string,
        { name: string; quantity: number; unit: string; category: string }
      >();

      for (const meal of context.meals.filter((meal: { status: string }) => meal.status !== "skipped")) {
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

      const groceryListId = (await ctx.runMutation(
        api.internal.planner.saveGeneratedGroceryList,
        {
          householdId: context.mealPlan.householdId,
          mealPlanId: context.mealPlan._id,
          items,
        }
      )) as Id<"groceryLists">;

      return {
        groceryListId,
      };
    } catch (error) {
      console.error("generateGroceryList failed", error);
      throw new Error("Unable to generate the grocery list right now.");
    }
  },
});
