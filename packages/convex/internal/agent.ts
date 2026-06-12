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

async function authenticate(ctx: any, tokenHash: string): Promise<AgentContext> {
  const connection = await ctx.db
    .query("agentConnections")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first();

  if (!connection || connection.revokedAt) {
    throw new ConvexError("Agent connection is invalid or revoked.");
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
      case "checkGroceryItem":
        return await checkGroceryItem(ctx, profile, input, dryRun);
      default:
        throw new ConvexError(`Agent tool is not implemented: ${tool.name}`);
    }
  },
});
