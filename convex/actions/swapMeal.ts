"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal as api } from "../_generated/api";
import { action } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { daysUntilExpiration, sortPantryItemsForPrompt } from "../lib/mealPlanning";
import {
  generateStructuredJson,
  type RawRecipe,
  sanitizeRecipe,
} from "../lib/openaiMealPlanner";

const recipeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    ingredients: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
        },
        required: ["name", "quantity", "unit"],
      },
    },
    instructions: {
      type: "array",
      minItems: 2,
      items: { type: "string" },
    },
    effortLevel: {
      type: "string",
      enum: ["easy", "medium", "hard"],
    },
    estimatedTime: { type: "number" },
    servings: { type: "number" },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    usedPantryItems: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "name",
    "description",
    "ingredients",
    "instructions",
    "effortLevel",
    "estimatedTime",
    "servings",
    "tags",
    "usedPantryItems",
  ],
} as const;

type MealProfile = Pick<
  Doc<"userProfiles">,
  "name" | "dietaryPreferences" | "allergies" | "dislikes"
>;
type PlannedSwapMeal = {
  _id: Id<"plannedMeals">;
  date: string;
  recipeTitle: string | null;
};
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
type SwapContext = {
  household: Pick<Doc<"households">, "name">;
  meal: Pick<
    Doc<"plannedMeals">,
    "_id" | "mealPlanId" | "recipeId" | "date" | "mealType" | "status"
  >;
  recipe: Pick<Doc<"recipeSuggestions">, "title" | "description">;
  pantryItems: PantryForPrompt[];
  profiles: MealProfile[];
  plannedMeals: PlannedSwapMeal[];
};

export const swapMeal: ReturnType<typeof action> = action({
  args: {
    mealId: v.id("plannedMeals"),
  },
  handler: async (
    ctx,
    args: { mealId: Id<"plannedMeals"> }
  ): Promise<{ mealId: Id<"plannedMeals"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to refresh meal options.");
    }

    try {
      const authId = userId as string;
      const context = await ctx.runQuery(api.internal.planner.getMealSwapContext, {
        authId,
        mealId: args.mealId,
      }) as SwapContext;

      const pantryItems = sortPantryItemsForPrompt<PantryForPrompt>(
        context.pantryItems as PantryForPrompt[]
      );
      const householdSize = Math.max(context.profiles.length, 1);
      const otherMeals = context.plannedMeals
        .filter((meal: PlannedSwapMeal) => meal._id !== context.meal._id)
        .map((meal) => `- ${meal.date}: ${meal.recipeTitle ?? "Unknown dinner"}`)
        .join("\n");

      const pantrySummary =
        pantryItems.length > 0
          ? pantryItems
              .map((item) => {
                const expiry = daysUntilExpiration(item.expirationDate);
                const expiryNote =
                  expiry === null
                    ? "no expiration date"
                    : expiry < 0
                      ? `expired ${Math.abs(expiry)} day(s) ago`
                      : expiry === 0
                        ? "expires today"
                        : `expires in ${expiry} day(s)`;

                return `- ${item.name}: ${item.quantity} ${item.unit}, ${item.category}, ${item.storageLocation}, ${expiryNote}`;
              })
              .join("\n")
          : "- No pantry items logged yet.";

      const profilesSummary = context.profiles
        .map((profile: MealProfile) => {
          const dietaryPreferences =
            profile.dietaryPreferences.length > 0
              ? profile.dietaryPreferences.join(", ")
              : "none";
          const allergies =
            profile.allergies.length > 0 ? profile.allergies.join(", ") : "none";
          const dislikes =
            profile.dislikes.length > 0 ? profile.dislikes.join(", ") : "none";

          return `- ${profile.name}: dietary preferences ${dietaryPreferences}; allergies ${allergies}; dislikes ${dislikes}`;
        })
        .join("\n");

      const response = await generateStructuredJson<{
        alternatives: RawRecipe[];
      }>({
        schemaName: "familyplate_swap_meal_options",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            alternatives: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: recipeSchema,
            },
          },
          required: ["alternatives"],
        },
        systemPrompt:
          "You generate alternate family dinner ideas for a single meal slot. Respect dietary restrictions, use pantry ingredients first, and avoid repeating meals already planned for the week. Return only valid JSON matching the schema.",
        userPrompt: [
          `Refresh the dinner options for ${context.meal.date} in the household "${context.household.name}".`,
          `The currently selected dinner is "${context.recipe.title}". Generate exactly three replacement alternatives.`,
          `Serve ${householdSize} people.`,
          "Use pantry items first, especially anything nearing expiration.",
          "Do not repeat the current dinner or the other planned dinners this week.",
          "Keep the alternatives distinct from each other in cuisine or flavor profile.",
          "Most dinners should stay in the same general weeknight range as the current plan.",
          "Each recipe must include the pantry items it uses using exact pantry item names from the list.",
          "",
          "Current dinner to replace:",
          `- ${context.recipe.title}: ${context.recipe.description}`,
          "",
          "Other dinners already planned this week:",
          otherMeals || "- No other dinners planned.",
          "",
          "Pantry inventory:",
          pantrySummary,
          "",
          "Household preferences:",
          profilesSummary || "- No profile preferences provided.",
        ].join("\n"),
      });

      if (!Array.isArray(response.alternatives) || response.alternatives.length !== 3) {
        throw new Error("OpenAI did not return three alternatives.");
      }

      const alternatives = response.alternatives.map((alternative) =>
        sanitizeRecipe(alternative, pantryItems, householdSize)
      );

      await ctx.runMutation(
        api.internal.planner.saveMealAlternatives,
        {
          mealId: args.mealId,
          alternatives,
        }
      );

      return {
        mealId: args.mealId,
      };
    } catch (error) {
      console.error("swapMeal failed", error);
      throw new Error("Unable to refresh dinner options right now.");
    }
  },
});
