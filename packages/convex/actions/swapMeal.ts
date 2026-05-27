"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal as api } from "../_generated/api";
import { action } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { daysUntilExpiration, sortPantryItemsForPrompt } from "../lib/mealPlanning";
import {
  generateStructuredJson,
  type RawRecipe,
  sanitizeRecipe,
} from "../lib/openaiMealPlanner";
import { checkRecipeForDislikes, filterRecipeIngredientsForHouseholdSafety } from "../lib/recipeSafety";

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
  household: Pick<Doc<"households">, "_id" | "name">;
  meal: Pick<
    Doc<"plannedMeals">,
    "_id" | "mealPlanId" | "recipeId" | "date" | "mealType" | "status"
  >;
  recipe: Pick<Doc<"recipeSuggestions">, "title" | "description">;
  pantryItems: PantryForPrompt[];
  profiles: MealProfile[];
  plannedMeals: PlannedSwapMeal[];
};

type MealAdjustmentType =
  | "swap"
  | "faster"
  | "kid_friendly"
  | "use_pantry"
  | "avoid"
  | "regenerate_day";

const ADJUSTMENT_PROMPTS: Record<MealAdjustmentType, string> = {
  swap:
    "Generate broadly appealing replacement dinners for this slot.",
  faster:
    "Prioritize faster dinners. Prefer 25 minutes or less, minimal prep, and easy cleanup.",
  kid_friendly:
    "Prioritize kid-friendly dinners with familiar flavors, flexible toppings, and approachable textures while still respecting all allergies and dislikes.",
  use_pantry:
    "Prioritize dinners that use the most pantry items, especially items close to expiration.",
  avoid:
    "Avoid the ingredient, dish style, or concern named by the user. Do not include close substitutes that would feel like the same issue.",
  regenerate_day:
    "Regenerate this day with a strong new primary dinner and two backup alternatives. Keep it practical for the week.",
};

export const swapMeal: ReturnType<typeof action> = action({
  args: {
    mealId: v.id("plannedMeals"),
    adjustmentType: v.optional(
      v.union(
        v.literal("swap"),
        v.literal("faster"),
        v.literal("kid_friendly"),
        v.literal("use_pantry"),
        v.literal("avoid"),
        v.literal("regenerate_day")
      )
    ),
    avoidText: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args: {
      mealId: Id<"plannedMeals">;
      adjustmentType?: MealAdjustmentType;
      avoidText?: string;
    }
  ): Promise<{ mealId: Id<"plannedMeals">; appliedRecipeTitle?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("You must be signed in to refresh meal options.");
    }

    try {
      const authId = userId as string;
      const context = await ctx.runQuery(api.internal.planner.getMealSwapContext, {
        authId,
        mealId: args.mealId,
      }) as SwapContext;

      // Fetch feedback history for smarter suggestions
      const feedbackSummary = await ctx.runQuery(
        api.internal.planner.getHouseholdFeedbackSummary,
        { householdId: context.household._id }
      ) as { summary: string; favorites: string[]; disliked: string[] };

      const pantryItems = sortPantryItemsForPrompt<PantryForPrompt>(
        context.pantryItems as PantryForPrompt[]
      );
      const adjustmentType = args.adjustmentType ?? "swap";
      const avoidText = args.avoidText?.trim();
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
          "You generate alternate family dinner ideas for a single meal slot. Use pantry ingredients first, and avoid repeating meals already planned for the week. Return only valid JSON matching the schema.\n\nCRITICAL SAFETY RULE: You MUST NEVER include any ingredient that a household member is allergic to. Allergies are life-threatening. If someone is allergic to milk, do NOT use milk, cream, butter, cheese, yogurt, whey, or ANY dairy derivative. If someone is allergic to wheat, do NOT use flour, bread, pasta, soy sauce, or ANY wheat-containing ingredient. Apply this same logic to ALL listed allergies. Also avoid all listed dislikes entirely. There are no exceptions.",
        userPrompt: [
          `Refresh the dinner options for ${context.meal.date} in the household "${context.household.name}".`,
          `The currently selected dinner is "${context.recipe.title}". Generate exactly three replacement alternatives.`,
          `Adjustment request: ${ADJUSTMENT_PROMPTS[adjustmentType]}`,
          adjustmentType === "avoid" && avoidText
            ? `User specifically wants to avoid: ${avoidText}.`
            : "",
          `Serve ${householdSize} people.`,
          "CRITICAL: NEVER use any ingredient that ANY household member is allergic to. This includes all derivatives and hidden forms of the allergen.",
          "Also completely avoid all listed dislikes.",
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
          ...(feedbackSummary.summary
            ? [
                "",
                "Past meal feedback:",
                feedbackSummary.summary,
                "",
                "Use feedback to guide choices: lean toward styles similar to favorites, avoid styles similar to disliked meals.",
              ]
            : []),
        ].filter(Boolean).join("\n"),
      });

      if (!Array.isArray(response.alternatives) || response.alternatives.length !== 3) {
        throw new Error("OpenAI did not return three alternatives.");
      }

      // Collect all household allergies and dislikes for server-side enforcement
      const allAllergies = Array.from(
        new Set(
          context.profiles
            .flatMap((p: MealProfile) => p.allergies ?? [])
            .map((a: string) => a.toLowerCase().trim())
            .filter(Boolean)
        )
      );

      const allDislikes = Array.from(
        new Set(
          context.profiles
            .flatMap((p: MealProfile) => p.dislikes ?? [])
            .map((d: string) => d.toLowerCase().trim())
            .filter(Boolean)
        )
      );

      const alternatives = response.alternatives
        .map((alternative) => {
          const sanitized = sanitizeRecipe(alternative, pantryItems, householdSize);
          const safeAlternative = filterRecipeIngredientsForHouseholdSafety({
            recipeName: sanitized.name,
            ingredients: sanitized.ingredients,
            allergies: allAllergies,
            pantryItems,
            contextLabel: "swap alternative",
          });

          return {
            ...sanitized,
            ...safeAlternative,
          };
        })
        .filter((alt) => {
          const dislikeHits = checkRecipeForDislikes(alt.name, alt.ingredients, allDislikes);
          if (dislikeHits.length > 0) {
            console.warn(`Dropping swap alternative "${alt.name}" — contains dislikes: ${dislikeHits.join(", ")}`);
            return false;
          }
          return true;
        });

      if (alternatives.length === 0) {
        throw new Error("No safe alternatives were returned.");
      }

      if (adjustmentType === "regenerate_day") {
        await ctx.runMutation(
          api.internal.planner.replaceMealWithGeneratedOptions,
          {
            mealId: args.mealId,
            primary: alternatives[0],
            alternatives: alternatives.slice(1, 3),
          }
        );

        return {
          mealId: args.mealId,
          appliedRecipeTitle: alternatives[0].name,
        };
      }

      await ctx.runMutation(api.internal.planner.saveMealAlternatives, {
        mealId: args.mealId,
        alternatives,
      });

      return {
        mealId: args.mealId,
      };
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      console.error("swapMeal failed", error);
      throw new ConvexError("Unable to refresh dinner options right now. Please try again.");
    }
  },
});
