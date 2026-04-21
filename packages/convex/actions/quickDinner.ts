"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import { internal as api } from "../_generated/api";
import { generateStructuredJson } from "../lib/openaiMealPlanner";
import { checkRecipeForDislikes, filterRecipeIngredientsForHouseholdSafety } from "../lib/recipeSafety";

type QuickSuggestion = {
  _id?: string;
  name: string;
  description: string;
  effortLevel: string;
  estimatedTime: number;
  servings: number;
  ingredients: Array<{ name: string; quantity: number; unit: string; inPantry: boolean }>;
  instructions: string[];
  missingItems: string[];
};

export const suggestFromPantry = action({
  args: {
    craving: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ suggestions: QuickSuggestion[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Must be signed in.");

    const authId = userId as string;

    let pantryContext: { householdId: string; profileId: string; pantryItems: Array<{ name: string; quantity: number; unit: string; category: string }>; profiles: Array<{ dietaryPreferences: string[]; allergies: string[]; dislikes: string[] }> };
    try {
      pantryContext = await ctx.runQuery(
        api.internal.planner.getQuickDinnerContext,
        { authId }
      ) as typeof pantryContext;
    } catch (err) {
      console.error("Failed to load pantry context:", err);
      throw new ConvexError("Could not load your pantry. Please make sure your profile is set up.");
    }

    if (!pantryContext.pantryItems || pantryContext.pantryItems.length === 0) {
      return { suggestions: [] };
    }

    // Fetch feedback history
    let feedbackSummary: { summary: string; favorites: string[]; disliked: string[] };
    try {
      feedbackSummary = await ctx.runQuery(
        api.internal.planner.getHouseholdFeedbackSummary,
        { householdId: pantryContext.householdId as any }
      ) as typeof feedbackSummary;
    } catch (err) {
      console.error("Failed to load feedback summary:", err);
      // Non-critical — proceed without feedback
      feedbackSummary = { summary: "", favorites: [], disliked: [] };
    }

    const pantryList = pantryContext.pantryItems
      .map((item) => `- ${item.name}: ${item.quantity} ${item.unit} (${item.category})`)
      .join("\n");

    const allergies = pantryContext.profiles
      .flatMap((p) => p.allergies)
      .filter(Boolean);

    const dislikes = pantryContext.profiles
      .flatMap((p) => p.dislikes)
      .filter(Boolean);

    const allergyNote = allergies.length > 0
      ? `\n\nCRITICAL SAFETY - ALLERGIES (life-threatening, NEVER use these or any derivative): ${allergies.join(", ")}. If allergic to milk, that means NO milk, cream, butter, cheese, yogurt, whey, or ANY dairy. If allergic to wheat, that means NO flour, bread, pasta, tortillas, soy sauce, or ANY wheat product. Apply this logic to ALL listed allergies.`
      : "";

    const dislikeNote = dislikes.length > 0
      ? `\n\nDISLIKES (completely avoid): ${dislikes.join(", ")}`
      : "";

    const systemPrompt = `You are a practical home cooking assistant. Given a list of pantry items, suggest 3 dinner recipes that can be made primarily with what is available. Prioritize recipes that use the most pantry items. Each recipe should be realistic and family-friendly.

CRITICAL SAFETY RULE: You MUST NEVER include any ingredient that a household member is allergic to. Allergies are life-threatening. This includes ALL derivatives and hidden forms of the allergen. There are no exceptions. Also completely avoid all listed dislikes.

For each recipe, list ALL ingredients needed. Mark which ones are already in the pantry (inPantry: true) and which are missing (inPantry: false). Keep missing items to common staples (salt, pepper, oil, water) when possible.

Return exactly 6 suggestions with varied effort levels and cuisines. More options means better filtering.`;

    const feedbackNote = feedbackSummary.summary
      ? `\n\nPast meal feedback from the household:\n${feedbackSummary.summary}\n\nUse this feedback to guide your suggestions — lean toward styles similar to favorites.`
      : "";

    const cravingNote = args.craving?.trim()
      ? `\n\nCRAVING: The user is in the mood for: "${args.craving.trim()}". Prioritize recipes featuring this ingredient, protein, cuisine, or style. All 6 suggestions should relate to this craving.`
      : "";

    const userPrompt = `Here are the items currently in my pantry:

${pantryList}${allergyNote}${dislikeNote}${cravingNote}${feedbackNote}

Suggest 6 dinner recipes I can make tonight using primarily these ingredients. Remember: NEVER include any allergen ingredients or their derivatives.${args.craving?.trim() ? ` Focus on "${args.craving.trim()}" recipes.` : " Vary the cuisines and proteins across all 6 suggestions."}`;

    const schema = {
      type: "object" as const,
      properties: {
        suggestions: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
              description: { type: "string" as const },
              effortLevel: { type: "string" as const, enum: ["easy", "medium", "hard"] },
              estimatedTime: { type: "number" as const },
              servings: { type: "number" as const },
              ingredients: {
                type: "array" as const,
                items: {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const },
                    quantity: { type: "number" as const },
                    unit: { type: "string" as const },
                    inPantry: { type: "boolean" as const },
                  },
                  required: ["name", "quantity", "unit", "inPantry"],
                  additionalProperties: false,
                },
              },
              instructions: {
                type: "array" as const,
                items: { type: "string" as const },
              },
              missingItems: {
                type: "array" as const,
                items: { type: "string" as const },
              },
            },
            required: ["name", "description", "effortLevel", "estimatedTime", "servings", "ingredients", "instructions", "missingItems"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    };

    try {
      const response = await generateStructuredJson<{ suggestions: QuickSuggestion[] }>({
        schemaName: "quick_dinner_suggestions",
        schema,
        systemPrompt,
        userPrompt,
      });

      // Server-side allergen + dislike enforcement
      const allAllergies = pantryContext.profiles
        .flatMap((p) => p.allergies)
        .map((a) => a.toLowerCase().trim())
        .filter(Boolean);

      const allDislikes = pantryContext.profiles
        .flatMap((p) => p.dislikes)
        .map((d) => d.toLowerCase().trim())
        .filter(Boolean);

      // Filter ALL suggestions, then take the first 3 safe ones
      const safeSuggestions: QuickSuggestion[] = [];
      for (const suggestion of response.suggestions) {
        if (safeSuggestions.length >= 3) break;

        // Check for dislikes
        const dislikeHits = checkRecipeForDislikes(suggestion.name, suggestion.ingredients, allDislikes);
        if (dislikeHits.length > 0) {
          console.warn(`Dropping quick dinner "${suggestion.name}" — contains dislikes: ${dislikeHits.join(", ")}`);
          continue;
        }

        // Check for allergens
        try {
          const { ingredients } = filterRecipeIngredientsForHouseholdSafety({
            recipeName: suggestion.name,
            ingredients: suggestion.ingredients,
            allergies: allAllergies,
            pantryItems: pantryContext.pantryItems,
            contextLabel: "quick dinner suggestion",
          });

          safeSuggestions.push({
            ...suggestion,
            ingredients,
            missingItems: Array.from(
              new Set(
                ingredients
                  .filter((ingredient) => !ingredient.inPantry)
                  .map((ingredient) => ingredient.name)
              )
            ),
          });
        } catch (error) {
          console.warn("Dropping invalid quick dinner suggestion", {
            recipeName: suggestion.name,
            error,
          });
        }
      }

      if (safeSuggestions.length === 0) {
        throw new ConvexError("Unable to generate any safe dinner suggestions. Please check your allergy and dislike settings.");
      }

      if (safeSuggestions.length < 3) {
        console.warn(`Only ${safeSuggestions.length} of 3 suggestions survived safety filtering. AI may be ignoring dietary restrictions.`);
      }

      // Persist suggestions to DB so they survive page navigation
      const recipeIds = await ctx.runMutation(
        api.internal.planner.saveQuickDinnerSuggestions,
        {
          householdId: pantryContext.householdId as any,
          createdBy: pantryContext.profileId as any,
          suggestions: safeSuggestions.map((s) => ({
            ...s,
            effortLevel: s.effortLevel as "easy" | "medium" | "hard",
          })),
        }
      ) as string[];

      return {
        suggestions: safeSuggestions.map((s, i) => ({
          ...s,
          _id: recipeIds[i],
        })),
      };
    } catch (err) {
      console.error("Quick dinner suggestion failed:", err);
      throw new ConvexError("Unable to generate dinner suggestions right now. Please try again.");
    }
  },
});
