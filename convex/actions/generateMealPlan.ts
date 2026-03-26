import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import {
  daysUntilExpiration,
  getWeekDates,
  parseDateOnly,
  sortPantryItemsForPrompt,
} from "../lib/mealPlanning";
import {
  generateStructuredJson,
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

export const generateMealPlan = action({
  args: {
    weekStartDate: v.string(),
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to generate a meal plan.");
    }

    try {
      parseDateOnly(args.weekStartDate);

      const authId = userId as string;
      const context = await ctx.runQuery(
        internal["internal/planner"].getHouseholdGenerationContext,
        {
          authId,
          householdId: args.householdId,
        }
      );

      const pantryItems = sortPantryItemsForPrompt(context.pantryItems);
      const weekDates = getWeekDates(args.weekStartDate);
      const householdSize = Math.max(context.profiles.length, 1);

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
        .map((profile) => {
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
        dinners: Array<{
          primary: typeof recipeSchema;
          alternatives: Array<typeof recipeSchema>;
        }>;
      }>({
        schemaName: "familyplate_weekly_dinner_plan",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            dinners: {
              type: "array",
              minItems: 7,
              maxItems: 7,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  primary: recipeSchema,
                  alternatives: {
                    type: "array",
                    minItems: 2,
                    maxItems: 2,
                    items: recipeSchema,
                  },
                },
                required: ["primary", "alternatives"],
              },
            },
          },
          required: ["dinners"],
        },
        systemPrompt:
          "You are a pragmatic family meal planner. Create realistic weeknight dinner plans that prioritize pantry usage, strictly respect allergies and dietary restrictions, and vary cuisines and proteins across the week. Return only valid JSON that matches the schema.",
        userPrompt: [
          `Build a seven-night dinner plan for the household "${context.household.name}" starting on ${args.weekStartDate}.`,
          `Plan for ${householdSize} servings by default unless a recipe clearly needs a different whole-number serving count.`,
          "Use pantry items first, especially items closest to expiration.",
          "Respect every listed allergy, dislike, and dietary preference across the whole household.",
          "Vary cuisine, main protein, cooking method, and flavor profile across the week.",
          "Keep dinners family-friendly and practical for home cooks.",
          "Most dinners should be 20-50 minutes. A few medium-effort meals are fine.",
          "For every night provide one primary dinner and exactly two alternatives.",
          "Each recipe must include the pantry items it uses using the exact pantry item names from the provided list.",
          `Dates to cover in order: ${weekDates.join(", ")}.`,
          "",
          "Pantry inventory:",
          pantrySummary,
          "",
          "Household preferences:",
          profilesSummary || "- No profile preferences provided.",
        ].join("\n"),
      });

      if (!Array.isArray(response.dinners) || response.dinners.length !== 7) {
        throw new Error("OpenAI did not return seven dinners.");
      }

      const meals = response.dinners.map((dinner, index) => {
        if (!Array.isArray(dinner.alternatives) || dinner.alternatives.length !== 2) {
          throw new Error(`Dinner ${index + 1} did not include exactly two alternatives.`);
        }

        return {
          date: weekDates[index],
          primary: sanitizeRecipe(dinner.primary as never, pantryItems, householdSize),
          alternatives: dinner.alternatives.map((alternative) =>
            sanitizeRecipe(alternative as never, pantryItems, householdSize)
          ),
        };
      });

      const mealPlanId = await ctx.runMutation(
        internal["internal/planner"].saveGeneratedMealPlan,
        {
          householdId: args.householdId,
          weekStartDate: args.weekStartDate,
          meals,
        }
      );

      return {
        mealPlanId,
      };
    } catch (error) {
      console.error("generateMealPlan failed", error);
      throw new Error("Unable to generate a dinner plan right now.");
    }
  },
});
