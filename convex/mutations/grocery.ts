import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function makeIngredientKey(name: string, unit: string) {
  return `${normalizeName(name)}::${unit.trim().toLowerCase()}`;
}

function roundQuantity(value: number) {
  return Math.round(value * 100) / 100;
}

function requireNonEmptyString(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  return trimmed;
}

function validateQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }
  return roundQuantity(quantity);
}

function normalizeCustomItem(args: {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}) {
  return {
    name: requireNonEmptyString(args.name, "Name"),
    quantity: validateQuantity(args.quantity),
    unit: requireNonEmptyString(args.unit, "Unit"),
    category: requireNonEmptyString(args.category, "Category"),
    checked: false,
  };
}

function inferCategory(name: string) {
  const normalized = normalizeName(name);

  if (
    normalized.includes("lettuce") ||
    normalized.includes("tomato") ||
    normalized.includes("potato") ||
    normalized.includes("carrot") ||
    normalized.includes("onion") ||
    normalized.includes("broccoli") ||
    normalized.includes("pepper") ||
    normalized.includes("cucumber") ||
    normalized.includes("avocado") ||
    normalized.includes("mushroom") ||
    normalized.includes("parsley") ||
    normalized.includes("ginger") ||
    normalized.includes("pea")
  ) {
    return "Produce";
  }

  if (
    normalized.includes("beef") ||
    normalized.includes("chicken") ||
    normalized.includes("salmon") ||
    normalized.includes("pepperoni")
  ) {
    return "Meat";
  }

  if (
    normalized.includes("cheese") ||
    normalized.includes("mozzarella") ||
    normalized.includes("parmesan") ||
    normalized.includes("sour cream") ||
    normalized.includes("egg")
  ) {
    return "Dairy";
  }

  if (
    normalized.includes("spaghetti") ||
    normalized.includes("rice") ||
    normalized.includes("noodle") ||
    normalized.includes("bun") ||
    normalized.includes("tortilla") ||
    normalized.includes("dough") ||
    normalized.includes("breadcrumb")
  ) {
    return "Grains";
  }

  if (
    normalized.includes("sauce") ||
    normalized.includes("seasoning") ||
    normalized.includes("soy") ||
    normalized.includes("oil") ||
    normalized.includes("pickle") ||
    normalized.includes("seed")
  ) {
    return "Condiments";
  }

  return "Other";
}

async function getViewerProfile(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const authId = userId as string;
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .first();

  if (!profile) throw new Error("No profile found");
  return profile;
}

async function getLatestListForHousehold(
  ctx: MutationCtx,
  householdId: Id<"households">
) {
  const lists = await ctx.db
    .query("groceryLists")
    .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
    .collect();

  return lists.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export const generateFromPlan = mutation({
  args: {
    mealPlanId: v.optional(v.id("weeklyMealPlans")),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const householdId = profile.householdId;
    let mealPlan = args.mealPlanId ? await ctx.db.get(args.mealPlanId) : null;

    if (mealPlan && mealPlan.householdId !== householdId) {
      throw new Error("Meal plan does not belong to your household");
    }

    if (!mealPlan) {
      const plans = await ctx.db
        .query("weeklyMealPlans")
        .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
        .collect();

      mealPlan =
        plans
          .filter((plan) => plan.status === "active")
          .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
    }

    if (!mealPlan) {
      throw new Error("No active meal plan found");
    }

    const meals = await ctx.db
      .query("plannedMeals")
      .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", mealPlan._id))
      .collect();

    const activeMeals = meals.filter((meal) => meal.status === "planned");
    const recipes = await Promise.all(
      activeMeals.map((meal) => ctx.db.get(meal.recipeId))
    );

    const neededIngredients = new Map<
      string,
      { name: string; quantity: number; unit: string; category: string }
    >();

    for (const recipe of recipes) {
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
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

    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();

    const pantryTotals = new Map<string, number>();

    for (const item of pantryItems) {
      const key = makeIngredientKey(item.name, item.unit);
      pantryTotals.set(key, (pantryTotals.get(key) ?? 0) + item.quantity);
    }

    const groceryItems = Array.from(neededIngredients.entries())
      .map(([key, ingredient]) => {
        const available = pantryTotals.get(key) ?? 0;
        const quantity = roundQuantity(
          Math.max(ingredient.quantity - available, 0)
        );

        return {
          name: ingredient.name,
          quantity,
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

    // Replace existing grocery list for this meal plan instead of creating duplicates
    const existingLists = await ctx.db
      .query("groceryLists")
      .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", mealPlan._id))
      .collect();

    for (const existing of existingLists) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("groceryLists", {
      householdId,
      mealPlanId: mealPlan._id,
      items: groceryItems,
      createdAt: Date.now(),
    });
  },
});

export const toggleItem = mutation({
  args: {
    groceryListId: v.id("groceryLists"),
    itemIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const householdId = profile.householdId;
    const groceryList = await ctx.db.get(args.groceryListId);
    if (!groceryList || groceryList.householdId !== householdId) {
      throw new Error("Grocery list not found");
    }

    if (args.itemIndex < 0 || args.itemIndex >= groceryList.items.length) {
      throw new Error("Item index out of bounds");
    }

    const items = groceryList.items.map((item, index) =>
      index === args.itemIndex ? { ...item, checked: !item.checked } : item
    );

    await ctx.db.patch(args.groceryListId, { items });
    return args.groceryListId;
  },
});

export const addCustomItem = mutation({
  args: {
    groceryListId: v.id("groceryLists"),
    name: v.string(),
    quantity: v.number(),
    unit: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const householdId = profile.householdId;
    const groceryList = await ctx.db.get(args.groceryListId);
    if (!groceryList || groceryList.householdId !== householdId) {
      throw new Error("Grocery list not found");
    }

    const newItem = normalizeCustomItem(args);

    const items = [
      ...groceryList.items,
      newItem,
    ].sort((a, b) =>
      a.category === b.category
        ? a.name.localeCompare(b.name)
        : a.category.localeCompare(b.category)
    );

    await ctx.db.patch(args.groceryListId, { items });
    return args.groceryListId;
  },
});

export const addMyCustomItem = mutation({
  args: {
    name: v.string(),
    quantity: v.number(),
    unit: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const householdId = profile.householdId;
    const latestList = await getLatestListForHousehold(ctx, householdId);
    const newItem = normalizeCustomItem(args);

    if (!latestList) {
      const groceryListId = await ctx.db.insert("groceryLists", {
        householdId,
        items: [newItem],
        createdAt: Date.now(),
      });

      return groceryListId;
    }

    const items = [
      ...latestList.items,
      newItem,
    ].sort((a, b) =>
      a.category === b.category
        ? a.name.localeCompare(b.name)
        : a.category.localeCompare(b.category)
    );

    await ctx.db.patch(latestList._id, { items });
    return latestList._id;
  },
});

export const removeItem = mutation({
  args: {
    groceryListId: v.id("groceryLists"),
    itemIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const householdId = profile.householdId;
    const groceryList = await ctx.db.get(args.groceryListId);
    if (!groceryList || groceryList.householdId !== householdId) {
      throw new Error("Grocery list not found");
    }

    if (args.itemIndex < 0 || args.itemIndex >= groceryList.items.length) {
      throw new Error("Item index out of bounds");
    }

    const items = groceryList.items.filter(
      (_, index) => index !== args.itemIndex
    );

    await ctx.db.patch(args.groceryListId, { items });
    return args.groceryListId;
  },
});

export const clearAll = mutation({
  args: {
    groceryListId: v.id("groceryLists"),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const groceryList = await ctx.db.get(args.groceryListId);
    if (!groceryList || groceryList.householdId !== profile.householdId) {
      throw new Error("Grocery list not found");
    }

    await ctx.db.patch(args.groceryListId, { items: [] });
    return args.groceryListId;
  },
});
