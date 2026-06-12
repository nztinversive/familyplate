import { getAgentTool } from "@familyplate/agent-tools";
import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type AgentContext = {
  connection: Doc<"agentConnections">;
  profile: Doc<"userProfiles">;
  household: Doc<"households">;
};
type GroceryItem = Doc<"groceryLists">["items"][number];
type StorageLocation = Doc<"pantryItems">["storageLocation"];
type EffortLevel = Doc<"recipeSuggestions">["effortLevel"];

function requireInputObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function requireString(input: Record<string, unknown>, field: string) {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ConvexError(`${field} is required.`);
  }
  return value.trim();
}

function requireNumber(input: Record<string, unknown>, field: string) {
  const value = Number(input[field]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConvexError(`${field} must be greater than zero.`);
  }
  return Math.round(value * 100) / 100;
}

function optionalNumber(input: Record<string, unknown>, field: string) {
  if (input[field] === undefined) return undefined;
  return requireNumber(input, field);
}

function optionalString(input: Record<string, unknown>, field: string) {
  if (input[field] === undefined) return undefined;
  return requireString(input, field);
}

function optionalBoolean(input: Record<string, unknown>, field: string) {
  if (input[field] === undefined) return undefined;
  const value = input[field];
  if (typeof value !== "boolean") {
    throw new ConvexError(`${field} must be true or false.`);
  }
  return value;
}

function requireStorageLocation(
  input: Record<string, unknown>,
  field: string
): StorageLocation {
  const value = requireString(input, field);
  if (value !== "pantry" && value !== "fridge" && value !== "freezer") {
    throw new ConvexError(`${field} must be pantry, fridge, or freezer.`);
  }
  return value;
}

function optionalStorageLocation(
  input: Record<string, unknown>,
  field: string
) {
  if (input[field] === undefined) return undefined;
  return requireStorageLocation(input, field);
}

function requireEffortLevel(input: Record<string, unknown>, field: string): EffortLevel {
  const value = requireString(input, field);
  if (value !== "easy" && value !== "medium" && value !== "hard") {
    throw new ConvexError(`${field} must be easy, medium, or hard.`);
  }
  return value;
}

function stringArray(input: Record<string, unknown>, field: string, required = true) {
  const value = input[field];
  if (value === undefined && !required) return [];
  if (!Array.isArray(value)) {
    throw new ConvexError(`${field} must be an array.`);
  }
  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new ConvexError(`${field}[${index}] must be a non-empty string.`);
    }
    return item.trim();
  });
}

function parseDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ConvexError("date must be YYYY-MM-DD.");
  }
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ConvexError("Choose a valid dinner date.");
  }
  return parsed;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function authenticate(ctx: any, tokenHash: string): Promise<AgentContext> {
  const connection = await ctx.db
    .query("agentConnections")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first();

  if (!connection || connection.revokedAt) {
    throw new ConvexError("Agent connection is invalid or revoked.");
  }

  if (connection.expiresAt !== undefined && connection.expiresAt <= Date.now()) {
    throw new ConvexError("Agent connection expired.");
  }

  const [profile, household] = await Promise.all([
    ctx.db.get(connection.profileId),
    ctx.db.get(connection.householdId),
  ]);

  if (!profile || !household || profile.householdId !== household._id) {
    throw new ConvexError("Agent connection no longer has a valid household.");
  }

  await ctx.db.patch(connection._id, { lastUsedAt: Date.now() });

  return { connection, profile, household };
}

function assertScope(connection: Doc<"agentConnections">, scope: string) {
  if (!connection.scopes.includes(scope)) {
    throw new ConvexError(`Agent connection is missing scope: ${scope}`);
  }
}

async function listPantry(ctx: any, profile: Doc<"userProfiles">, input: Record<string, unknown>) {
  const storageLocation = input.storageLocation;
  if (
    storageLocation !== undefined &&
    storageLocation !== "pantry" &&
    storageLocation !== "fridge" &&
    storageLocation !== "freezer"
  ) {
    throw new ConvexError("storageLocation must be pantry, fridge, or freezer.");
  }

  const query = ctx.db.query("pantryItems");
  const items = storageLocation
    ? await query
        .withIndex("by_householdId_storageLocation", (q: any) =>
          q
            .eq("householdId", profile.householdId)
            .eq("storageLocation", storageLocation)
        )
        .collect()
    : await query
        .withIndex("by_householdId", (q: any) =>
          q.eq("householdId", profile.householdId)
        )
        .collect();

  return items.sort((a: Doc<"pantryItems">, b: Doc<"pantryItems">) =>
    a.category === b.category
      ? a.name.localeCompare(b.name)
      : a.category.localeCompare(b.category)
  );
}

async function listGroceryList(ctx: any, profile: Doc<"userProfiles">) {
  const lists = await ctx.db
    .query("groceryLists")
    .withIndex("by_householdId", (q: any) =>
      q.eq("householdId", profile.householdId)
    )
    .collect();

  return lists.sort((a: Doc<"groceryLists">, b: Doc<"groceryLists">) => b.createdAt - a.createdAt)[0] ?? null;
}

async function listMealPlan(ctx: any, profile: Doc<"userProfiles">) {
  const plans = await ctx.db
    .query("weeklyMealPlans")
    .withIndex("by_householdId", (q: any) =>
      q.eq("householdId", profile.householdId)
    )
    .collect();

  const activePlan =
    plans
      .filter((plan: Doc<"weeklyMealPlans">) => plan.status === "active")
      .sort((a: Doc<"weeklyMealPlans">, b: Doc<"weeklyMealPlans">) => b.createdAt - a.createdAt)[0] ??
    null;

  if (!activePlan) return null;

  const meals = await ctx.db
    .query("plannedMeals")
    .withIndex("by_mealPlanId", (q: any) => q.eq("mealPlanId", activePlan._id))
    .collect();

  const mealsWithRecipes = await Promise.all(
    meals
      .sort((a: Doc<"plannedMeals">, b: Doc<"plannedMeals">) => a.date.localeCompare(b.date))
      .map(async (meal: Doc<"plannedMeals">) => {
        const [recipe, alternatives] = await Promise.all([
          ctx.db.get(meal.recipeId),
          Promise.all(
            (meal.alternativeRecipeIds ?? []).map((recipeId) =>
              ctx.db.get(recipeId)
            )
          ),
        ]);
        if (!recipe) return null;

        return {
          ...meal,
          recipe,
          alternatives: alternatives.filter(Boolean),
        };
      })
  );

  return {
    plan: activePlan,
    meals: mealsWithRecipes.filter(Boolean),
  };
}

async function listSavedRecipes(ctx: any, profile: Doc<"userProfiles">) {
  const savedRecipes = await ctx.db
    .query("savedRecipes")
    .withIndex("by_savedBy", (q: any) => q.eq("savedBy", profile._id))
    .collect();

  const recipes = await Promise.all(
    savedRecipes.map(async (savedRecipe: Doc<"savedRecipes">) => {
      const [recipe, savedByProfile] = await Promise.all([
        ctx.db.get(savedRecipe.recipeId),
        ctx.db.get(savedRecipe.savedBy),
      ]);

      if (!recipe || recipe.householdId !== profile.householdId) {
        return null;
      }

      return { ...savedRecipe, recipe, savedByProfile };
    })
  );

  return recipes
    .filter(Boolean)
    .sort((a: any, b: any) => b.savedAt - a.savedAt);
}

async function addGroceryItem(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const newItem = {
    name: requireString(input, "name"),
    quantity: requireNumber(input, "quantity"),
    unit: requireString(input, "unit"),
    category: requireString(input, "category"),
    checked: false,
  };

  if (dryRun) {
    return {
      wouldAdd: newItem,
      message: "Dry run only. Re-run with --confirm to add this grocery item.",
    };
  }

  const latestList = await listGroceryList(ctx, profile);
  if (!latestList) {
    const groceryListId = await ctx.db.insert("groceryLists", {
      householdId: profile.householdId,
      items: [newItem],
      createdAt: Date.now(),
    });
    return { groceryListId, added: newItem };
  }

  const items = [...latestList.items, newItem].sort((a, b) =>
    a.category === b.category
      ? a.name.localeCompare(b.name)
      : a.category.localeCompare(b.category)
  );

  await ctx.db.patch(latestList._id, { items });
  return { groceryListId: latestList._id, added: newItem };
}

async function checkGroceryItem(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const name = requireString(input, "name");
  const latestList = await listGroceryList(ctx, profile);
  if (!latestList) {
    throw new ConvexError("No grocery list found.");
  }

  const normalizedName = name.toLowerCase();
  const matches = latestList.items
    .map((item: GroceryItem, index: number) => ({ item, index }))
    .filter(
      ({ item }: { item: GroceryItem }) =>
        item.name.trim().toLowerCase() === normalizedName
    );

  if (matches.length === 0) {
    throw new ConvexError(`No grocery item found named "${name}".`);
  }
  if (matches.length > 1) {
    throw new ConvexError(
      `Multiple grocery items are named "${name}". Use the app to disambiguate.`
    );
  }

  const match = matches[0];
  if (match.item.checked) {
    return {
      groceryListId: latestList._id,
      checked: match.item,
      alreadyChecked: true,
    };
  }

  const checkedItem = { ...match.item, checked: true };
  if (dryRun) {
    return {
      groceryListId: latestList._id,
      wouldCheck: checkedItem,
      message: "Dry run only. Re-run with --confirm to check this grocery item.",
    };
  }

  const items = latestList.items.map((item: GroceryItem, index: number) =>
    index === match.index ? checkedItem : item
  );
  await ctx.db.patch(latestList._id, { items });

  return {
    groceryListId: latestList._id,
    checked: checkedItem,
    alreadyChecked: false,
  };
}

function findGroceryItemByExactName(
  latestList: Doc<"groceryLists">,
  name: string
) {
  const normalizedName = name.toLowerCase();
  const matches = latestList.items
    .map((item: GroceryItem, index: number) => ({ item, index }))
    .filter(
      ({ item }: { item: GroceryItem }) =>
        item.name.trim().toLowerCase() === normalizedName
    );

  if (matches.length === 0) {
    throw new ConvexError(`No grocery item found named "${name}".`);
  }
  if (matches.length > 1) {
    throw new ConvexError(
      `Multiple grocery items are named "${name}". Use the app to disambiguate.`
    );
  }

  return matches[0];
}

async function updateGroceryItem(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const name = requireString(input, "name");
  const latestList = await listGroceryList(ctx, profile);
  if (!latestList) {
    throw new ConvexError("No grocery list found.");
  }

  const match = findGroceryItemByExactName(latestList, name);
  const updatedItem = {
    ...match.item,
    ...(optionalNumber(input, "quantity") !== undefined
      ? { quantity: optionalNumber(input, "quantity") }
      : {}),
    ...(optionalString(input, "unit") !== undefined
      ? { unit: optionalString(input, "unit") }
      : {}),
    ...(optionalString(input, "category") !== undefined
      ? { category: optionalString(input, "category") }
      : {}),
    ...(optionalBoolean(input, "checked") !== undefined
      ? { checked: optionalBoolean(input, "checked") }
      : {}),
  };

  if (JSON.stringify(updatedItem) === JSON.stringify(match.item)) {
    throw new ConvexError("No grocery item changes were provided.");
  }

  if (dryRun) {
    return {
      groceryListId: latestList._id,
      wouldUpdate: { before: match.item, after: updatedItem },
      message: "Dry run only. Re-run with --confirm to update this grocery item.",
    };
  }

  const items = latestList.items.map((item: GroceryItem, index: number) =>
    index === match.index ? updatedItem : item
  ).sort((a: GroceryItem, b: GroceryItem) =>
    a.category === b.category
      ? a.name.localeCompare(b.name)
      : a.category.localeCompare(b.category)
  );
  await ctx.db.patch(latestList._id, { items });
  return { groceryListId: latestList._id, updated: updatedItem };
}

async function addPantryItem(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const expirationDate = optionalNumber(input, "expirationDate");
  const item = {
    householdId: profile.householdId,
    name: requireString(input, "name"),
    quantity: requireNumber(input, "quantity"),
    unit: requireString(input, "unit"),
    category: requireString(input, "category"),
    storageLocation: requireStorageLocation(input, "storageLocation"),
    ...(expirationDate !== undefined ? { expirationDate } : {}),
    addedBy: profile._id,
    addedAt: Date.now(),
  };

  if (dryRun) {
    return {
      wouldAdd: item,
      message: "Dry run only. Re-run with --confirm to add this pantry item.",
    };
  }

  const itemId = await ctx.db.insert("pantryItems", item);
  return { itemId, added: item };
}

async function updatePantryItem(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const itemId = requireString(input, "itemId") as Id<"pantryItems">;
  const item = await ctx.db.get(itemId);
  if (!item || item.householdId !== profile.householdId) {
    throw new ConvexError("Pantry item not found.");
  }

  const clearExpirationDate = optionalBoolean(input, "clearExpirationDate");
  const patch: Partial<Doc<"pantryItems">> = {
    ...(optionalString(input, "name") !== undefined
      ? { name: optionalString(input, "name") }
      : {}),
    ...(optionalNumber(input, "quantity") !== undefined
      ? { quantity: optionalNumber(input, "quantity") }
      : {}),
    ...(optionalString(input, "unit") !== undefined
      ? { unit: optionalString(input, "unit") }
      : {}),
    ...(optionalString(input, "category") !== undefined
      ? { category: optionalString(input, "category") }
      : {}),
    ...(optionalStorageLocation(input, "storageLocation") !== undefined
      ? { storageLocation: optionalStorageLocation(input, "storageLocation") }
      : {}),
    ...(optionalNumber(input, "expirationDate") !== undefined
      ? { expirationDate: optionalNumber(input, "expirationDate") }
      : {}),
  };

  if (clearExpirationDate) {
    patch.expirationDate = undefined;
  }

  if (Object.keys(patch).length === 0) {
    throw new ConvexError("No pantry item changes were provided.");
  }

  const after = { ...item, ...patch };
  if (dryRun) {
    return {
      itemId,
      wouldUpdate: { before: item, after },
      message: "Dry run only. Re-run with --confirm to update this pantry item.",
    };
  }

  await ctx.db.patch(itemId, patch);
  return { itemId, updated: after };
}

async function removePantryItem(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const itemId = requireString(input, "itemId") as Id<"pantryItems">;
  const item = await ctx.db.get(itemId);
  if (!item || item.householdId !== profile.householdId) {
    throw new ConvexError("Pantry item not found.");
  }

  if (dryRun) {
    return {
      itemId,
      wouldRemove: item,
      message: "Dry run only. Re-run with --confirm to remove this pantry item.",
    };
  }

  await ctx.db.delete(itemId);
  return { itemId, removed: item };
}

async function addMealToPlan(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const recipeId = requireString(input, "recipeId") as Id<"recipeSuggestions">;
  const date = requireString(input, "date");
  const recipe = await ctx.db.get(recipeId);
  if (!recipe || recipe.householdId !== profile.householdId) {
    throw new ConvexError("Recipe not found.");
  }

  const targetDate = parseDate(date);
  const weekStartDate = formatDate(getStartOfWeek(targetDate));
  const plans = await ctx.db
    .query("weeklyMealPlans")
    .withIndex("by_householdId", (q: any) =>
      q.eq("householdId", profile.householdId)
    )
    .collect();
  const matchingPlans = plans
    .filter((plan: Doc<"weeklyMealPlans">) => plan.weekStartDate === weekStartDate)
    .sort((a: Doc<"weeklyMealPlans">, b: Doc<"weeklyMealPlans">) => b.createdAt - a.createdAt);
  const existingPlan = matchingPlans[0] ?? null;
  const planId = existingPlan?._id ?? null;
  const sameDayMeals = planId
    ? await ctx.db
        .query("plannedMeals")
        .withIndex("by_mealPlanId_date", (q: any) =>
          q.eq("mealPlanId", planId).eq("date", date)
        )
        .collect()
    : [];
  const cookedMeal = sameDayMeals.find((meal: Doc<"plannedMeals">) => meal.status === "cooked");
  if (cookedMeal) {
    throw new ConvexError("That date already has a cooked dinner.");
  }

  const existingMeal = sameDayMeals[0] ?? null;
  if (dryRun) {
    return {
      wouldPlan: {
        recipe,
        date,
        weekStartDate,
        mealPlanId: planId,
        wouldCreateMealPlan: !existingPlan,
        wouldReplaceMeal: existingMeal ?? null,
      },
      message: "Dry run only. Re-run with --confirm to add this meal.",
    };
  }

  let activePlanId = planId;
  for (const plan of plans) {
    if (plan._id === existingPlan?._id) continue;
    if (plan.status === "active") {
      await ctx.db.patch(plan._id, { status: "completed" });
    }
  }

  if (!activePlanId) {
    activePlanId = await ctx.db.insert("weeklyMealPlans", {
      householdId: profile.householdId,
      weekStartDate,
      status: "active",
      createdAt: Date.now(),
    });
  } else if (existingPlan && existingPlan.status !== "active") {
    await ctx.db.patch(existingPlan._id, { status: "active" });
  }

  if (existingMeal) {
    await ctx.db.patch(existingMeal._id, {
      recipeId,
      alternativeRecipeIds: [],
      status: "planned",
      pantryDeductedAt: undefined,
    });

    for (const extraMeal of sameDayMeals.slice(1)) {
      await ctx.db.delete(extraMeal._id);
    }

    return {
      mealId: existingMeal._id,
      mealPlanId: activePlanId,
      date,
      replaced: true,
    };
  }

  const mealId = await ctx.db.insert("plannedMeals", {
    mealPlanId: activePlanId,
    recipeId,
    alternativeRecipeIds: [],
    date,
    mealType: "dinner",
    status: "planned",
    pantryDeductedAt: undefined,
  });

  return { mealId, mealPlanId: activePlanId, date, replaced: false };
}

async function removeMealFromPlan(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const mealId = requireString(input, "mealId") as Id<"plannedMeals">;
  const meal = await ctx.db.get(mealId);
  if (!meal) {
    throw new ConvexError("Meal not found.");
  }
  const plan = await ctx.db.get(meal.mealPlanId);
  if (!plan || plan.householdId !== profile.householdId) {
    throw new ConvexError("Meal not found.");
  }
  if (meal.status === "cooked") {
    throw new ConvexError("Cooked meals cannot be removed.");
  }

  if (dryRun) {
    return {
      mealId,
      wouldRemove: meal,
      message: "Dry run only. Re-run with --confirm to remove this meal.",
    };
  }

  await ctx.db.delete(mealId);
  return { mealId, removed: meal };
}

function normalizeRecipeInput(input: Record<string, unknown>) {
  const rawIngredients = input.ingredients;
  if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) {
    throw new ConvexError("ingredients must include at least one ingredient.");
  }
  const ingredients = rawIngredients.map((rawIngredient, index) => {
    const ingredient = requireInputObject(rawIngredient);
    return {
      name: requireString(ingredient, "name"),
      quantity: requireNumber(ingredient, "quantity"),
      unit: requireString(ingredient, "unit"),
      inPantry: false,
    };
  });

  const instructions = stringArray(input, "instructions");
  if (instructions.length === 0) {
    throw new ConvexError("instructions must include at least one step.");
  }

  const rawNutrition = input.nutrition;
  const nutrition = rawNutrition
    ? (() => {
        const value = requireInputObject(rawNutrition);
        return {
          calories: requireNumber(value, "calories"),
          protein: requireNumber(value, "protein"),
          carbs: requireNumber(value, "carbs"),
          fat: requireNumber(value, "fat"),
          ...(optionalNumber(value, "fiber") !== undefined
            ? { fiber: optionalNumber(value, "fiber") }
            : {}),
        };
      })()
    : undefined;

  return {
    title: requireString(input, "title"),
    description: optionalString(input, "description") ?? "",
    ingredients,
    instructions,
    effortLevel: requireEffortLevel(input, "effortLevel"),
    estimatedTime: requireNumber(input, "estimatedTime"),
    servings: requireNumber(input, "servings"),
    tags: Array.from(new Set(stringArray(input, "tags", false))),
    ...(nutrition ? { nutrition } : {}),
    source: "custom" as const,
  };
}

async function createSavedRecipe(
  ctx: any,
  profile: Doc<"userProfiles">,
  input: Record<string, unknown>,
  dryRun: boolean
) {
  const recipe = normalizeRecipeInput(input);

  if (dryRun) {
    return {
      wouldCreate: recipe,
      message: "Dry run only. Re-run with --confirm to save this recipe.",
    };
  }

  const now = Date.now();
  const recipeId = await ctx.db.insert("recipeSuggestions", {
    householdId: profile.householdId,
    createdBy: profile._id,
    ...recipe,
    createdAt: now,
  });
  const savedRecipeId = await ctx.db.insert("savedRecipes", {
    householdId: profile.householdId,
    recipeId,
    savedBy: profile._id,
    savedAt: now,
  });

  return { recipeId, savedRecipeId, recipe };
}

export const runAgentTool = internalMutation({
  args: {
    tokenHash: v.string(),
    toolName: v.string(),
    input: v.any(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tool = getAgentTool(args.toolName);
    if (!tool) {
      throw new ConvexError(`Unknown agent tool: ${args.toolName}`);
    }

    const { connection, profile, household } = await authenticate(
      ctx,
      args.tokenHash
    );
    assertScope(connection, tool.scope);

    const input = requireInputObject(args.input);
    const dryRun = Boolean(args.dryRun);

    switch (tool.name) {
      case "whoami":
        return {
          profile: {
            id: profile._id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
          },
          household: {
            id: household._id,
            name: household.name,
          },
          scopes: connection.scopes,
          expiresAt: connection.expiresAt ?? null,
        };
      case "listPantry":
        return await listPantry(ctx, profile, input);
      case "listGroceryList":
        return await listGroceryList(ctx, profile);
      case "listMealPlan":
        return await listMealPlan(ctx, profile);
      case "listSavedRecipes":
        return await listSavedRecipes(ctx, profile);
      case "addGroceryItem":
        return await addGroceryItem(ctx, profile, input, dryRun);
      case "updateGroceryItem":
        return await updateGroceryItem(ctx, profile, input, dryRun);
      case "checkGroceryItem":
        return await checkGroceryItem(ctx, profile, input, dryRun);
      case "addPantryItem":
        return await addPantryItem(ctx, profile, input, dryRun);
      case "updatePantryItem":
        return await updatePantryItem(ctx, profile, input, dryRun);
      case "removePantryItem":
        return await removePantryItem(ctx, profile, input, dryRun);
      case "addMealToPlan":
        return await addMealToPlan(ctx, profile, input, dryRun);
      case "removeMealFromPlan":
        return await removeMealFromPlan(ctx, profile, input, dryRun);
      case "createSavedRecipe":
        return await createSavedRecipe(ctx, profile, input, dryRun);
      default:
        throw new ConvexError(`Agent tool is not implemented: ${tool.name}`);
    }
  },
});
