"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal as api } from "../_generated/api";
import { action } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  daysUntilExpiration,
  getWeekDates,
  parseDateOnly,
  sortPantryItemsForPrompt,
} from "../lib/mealPlanning";
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
    nutrition: {
      type: "object",
      additionalProperties: false,
      properties: {
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
        fiber: { type: "number" },
      },
      required: ["calories", "protein", "carbs", "fat", "fiber"],
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
    "nutrition",
    "usedPantryItems",
  ],
} as const;

type MealProfile = Pick<
  Doc<"userProfiles">,
  "name" | "dietaryPreferences" | "allergies" | "dislikes"
>;
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
type HouseholdGenerationContext = {
  household: Pick<Doc<"households">, "name">;
  pantryItems: PantryForPrompt[];
  profiles: MealProfile[];
};

export const generateMealPlan: ReturnType<typeof action> = action({
  args: {
    weekStartDate: v.string(),
    householdId: v.id("households"),
  },
  handler: async (
    ctx,
    args: { weekStartDate: string; householdId: Id<"households"> }
  ): Promise<{ mealPlanId: Id<"weeklyMealPlans"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to generate a meal plan.");
    }

    try {
      parseDateOnly(args.weekStartDate);

      const authId = userId as string;
      const context = await ctx.runQuery(
        api.internal.planner.getHouseholdGenerationContext,
        {
          authId,
          householdId: args.householdId,
        }
      ) as HouseholdGenerationContext;

      const pantryItems = sortPantryItemsForPrompt<PantryForPrompt>(
        context.pantryItems as PantryForPrompt[]
      );
      const weekDates = getWeekDates(args.weekStartDate);
      const householdSize = Math.max(context.profiles.length, 1);

      // Collect ALL household allergies and dislikes for server-side enforcement
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

      // Fetch meal feedback history for smarter planning
      const feedbackSummary = await ctx.runQuery(
        api.internal.planner.getHouseholdFeedbackSummary,
        { householdId: args.householdId }
      ) as { summary: string; favorites: string[]; disliked: string[] };

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

      const profilesSummary = context.profiles.map((profile: MealProfile) => {
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
          primary: RawRecipe;
          alternatives: Array<RawRecipe>;
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
          "You are a pragmatic family meal planner. Create realistic weeknight dinner plans that prioritize pantry usage and vary cuisines and proteins across the week. Return only valid JSON that matches the schema.\n\nCRITICAL SAFETY RULE: You MUST NEVER include any ingredient that a household member is allergic to. Allergies are life-threatening. If someone is allergic to milk, do NOT use milk, cream, butter, cheese, yogurt, whey, or ANY dairy derivative. If someone is allergic to wheat, do NOT use flour, bread, pasta, soy sauce, or ANY wheat-containing ingredient. Apply this same logic to ALL listed allergies. Also avoid all listed dislikes entirely. There are no exceptions.",
        userPrompt: [
          `Build a seven-night dinner plan for the household "${context.household.name}" starting on ${args.weekStartDate}.`,
          `Plan for ${householdSize} servings by default unless a recipe clearly needs a different whole-number serving count.`,
          "Use pantry items first, especially items closest to expiration.",
          "CRITICAL: NEVER use any ingredient that ANY household member is allergic to. This includes all derivatives and hidden forms of the allergen. Allergies are life-threatening.",
          `CRITICAL: NEVER include any disliked ingredients or their derivatives. ${allDislikes.length > 0 ? `The following are DISLIKED and must NOT appear in ANY recipe (primary or alternative): ${allDislikes.join(", ")}. This means no ${allDislikes.map((d) => `${d} or any ${d}-based ingredients`).join(", no ")}. If someone dislikes beef, do NOT use ground beef, steak, meatballs, beef broth, or ANY beef product.` : ""}`,
          "Vary cuisine, main protein, cooking method, and flavor profile across the week.",
          "Keep dinners family-friendly and practical for home cooks.",
          "Most dinners should be 20-50 minutes. A few medium-effort meals are fine.",
          "For every night provide one primary dinner and exactly two alternatives.",
          "Include approximate per-serving nutrition for every recipe: calories, protein, carbs, fat, and fiber in grams.",
          "Each recipe must include the pantry items it uses using the exact pantry item names from the provided list.",
          `Dates to cover in order: ${weekDates.join(", ")}.`,
          "",
          "Pantry inventory:",
          pantrySummary,
          "",
          "Household preferences:",
          profilesSummary || "- No profile preferences provided.",
          ...(feedbackSummary.summary
            ? [
                "",
                "Past meal feedback from the household:",
                feedbackSummary.summary,
                "",
                "Use this feedback to guide your choices: make more meals SIMILAR to favorites (same cuisines, proteins, styles) and AVOID styles similar to disliked meals. Pay attention to feedback tags.",
              ]
            : []),
        ].join("\n"),
      });

      if (!Array.isArray(response.dinners) || response.dinners.length !== 7) {
        throw new Error("OpenAI did not return seven dinners.");
      }

      const meals = response.dinners.map((dinner, index) => {
        if (!Array.isArray(dinner.alternatives) || dinner.alternatives.length !== 2) {
          throw new Error(`Dinner ${index + 1} did not include exactly two alternatives.`);
        }

        // Sanitize all candidates (primary + alternatives)
        const allCandidates = [dinner.primary, ...dinner.alternatives].map(
          (raw) => {
            const sanitized = sanitizeRecipe(raw, pantryItems, householdSize);
            const safe = filterRecipeIngredientsForHouseholdSafety({
              recipeName: sanitized.name,
              ingredients: sanitized.ingredients,
              allergies: allAllergies,
              pantryItems,
              contextLabel: `recipe for ${weekDates[index]}`,
            });
            return { ...sanitized, ...safe };
          }
        );

        // Check each candidate for dislikes — pick the first one with no dislike matches as primary
        let primaryIndex = -1;
        for (let i = 0; i < allCandidates.length; i++) {
          const dislikeHits = checkRecipeForDislikes(
            allCandidates[i].name,
            allCandidates[i].ingredients,
            allDislikes
          );
          if (dislikeHits.length === 0) {
            primaryIndex = i;
            break;
          } else {
            console.warn(
              `Dislike violation in "${allCandidates[i].name}" for ${weekDates[index]}: ${dislikeHits.join(", ")} — trying alternatives`
            );
          }
        }

        // If ALL candidates have dislike violations, use the first one but warn
        if (primaryIndex === -1) {
          console.warn(
            `All candidates for ${weekDates[index]} contain dislikes — AI failed to respect dislike preferences. Using first candidate.`
          );
          primaryIndex = 0;
        }

        // Build final primary + alternatives (move chosen candidate to primary slot)
        const primary = allCandidates[primaryIndex];
        const alternatives = allCandidates.filter((_, i) => i !== primaryIndex).slice(0, 2);

        return {
          date: weekDates[index],
          primary,
          alternatives,
        };
      });

      const mealPlanId = (await ctx.runMutation(
        api.internal.planner.saveGeneratedMealPlan,
        {
          householdId: args.householdId,
          weekStartDate: args.weekStartDate,
          meals,
        }
      )) as Id<"weeklyMealPlans">;

      // Track plan generation for free tier limits
      await ctx.runMutation(
        api.subscriptions.incrementPlanGeneration,
        { authId: userId as string }
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
