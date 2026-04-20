"use node";
import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateStructuredJson } from "../lib/openaiMealPlanner";

type PublicSuggestion = {
  name: string;
  description: string;
  effortLevel: "easy" | "medium" | "hard";
  estimatedTime: number;
  servings: number;
  ingredients: Array<{ name: string; quantity: number; unit: string; inPantry: boolean }>;
  instructions: string[];
  missingItems: string[];
};

const ALLOWED_EFFORT = new Set(["easy", "medium", "hard"]);

function normalizePantryText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 60);
}

export const generate = action({
  args: {
    pantryText: v.string(),
    allergies: v.optional(v.array(v.string())),
    craving: v.optional(v.string()),
    fingerprint: v.string(),
    sourcePage: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ planId: string; suggestions: PublicSuggestion[] }> => {
    const pantryItems = normalizePantryText(args.pantryText);
    if (pantryItems.length === 0) {
      throw new ConvexError("Please list a few pantry items first.");
    }

    const allergies = (args.allergies ?? [])
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 12);

    await ctx.runMutation(internal.internal.publicDinner.checkAndLogGeneration, {
      ipHash: args.fingerprint,
    });

    const allergyNote = allergies.length > 0
      ? `\n\nCRITICAL SAFETY - ALLERGIES (life-threatening, NEVER use these or any derivative): ${allergies.join(", ")}. If allergic to milk, that means NO milk, cream, butter, cheese, yogurt, whey, or ANY dairy. If allergic to wheat, NO flour, bread, pasta, tortillas, soy sauce, or ANY wheat product. Apply this logic to ALL listed allergies.`
      : "";

    const cravingNote = args.craving?.trim()
      ? `\n\nCRAVING: User is in the mood for: "${args.craving.trim()}". All 3 suggestions should relate to this.`
      : "";

    const systemPrompt = `You are a practical home cooking assistant. Given a list of pantry items, suggest 3 dinner recipes a family could make tonight using primarily what's available.

Rules:
- Prioritize recipes that use the MOST pantry items.
- Mark each ingredient with inPantry: true if it appears in the user's pantry list (case-insensitive partial match counts), inPantry: false otherwise.
- Common staples (salt, pepper, oil, water) should be assumed available — mark inPantry: true.
- Keep "missing items" list short. If a recipe needs more than 3 missing items, choose a different recipe.
- Vary cuisines and proteins across the 3 suggestions.
- Family-friendly. No raw fish, no exotic ingredients, no obscure techniques.
- Each recipe needs realistic instructions in 4-7 steps.
- estimatedTime is total time in minutes including prep.
- servings between 2 and 6.

CRITICAL SAFETY: NEVER include any allergen ingredient or derivative. There are no exceptions.`;

    const userPrompt = `Here's what's in my pantry:

${pantryItems.map((item) => `- ${item}`).join("\n")}${allergyNote}${cravingNote}

Suggest 3 dinner recipes I can make tonight. Use mostly these items, keep missing items minimal, vary the cuisines.`;

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
            required: [
              "name",
              "description",
              "effortLevel",
              "estimatedTime",
              "servings",
              "ingredients",
              "instructions",
              "missingItems",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    };

    let response: { suggestions: PublicSuggestion[] };
    try {
      response = await generateStructuredJson<{ suggestions: PublicSuggestion[] }>({
        schemaName: "public_dinner_suggestions",
        schema,
        systemPrompt,
        userPrompt,
      });
    } catch (err) {
      console.error("Public dinner generation failed:", err);
      throw new ConvexError("Couldn't generate dinner ideas right now. Please try again.");
    }

    const allergyLowercase = allergies.map((a) => a.toLowerCase());
    const sanitized: PublicSuggestion[] = [];
    for (const s of response.suggestions ?? []) {
      if (sanitized.length >= 3) break;
      if (!ALLOWED_EFFORT.has(s.effortLevel)) continue;

      const tripsAllergen = (text: string) =>
        allergyLowercase.some((a) => a && text.toLowerCase().includes(a));

      if (tripsAllergen(s.name) || s.ingredients.some((ing) => tripsAllergen(ing.name))) {
        console.warn(`Dropping suggestion "${s.name}" — allergen match.`);
        continue;
      }

      const cleanedIngredients = s.ingredients
        .map((ing) => ({
          name: String(ing.name).trim(),
          quantity: Math.max(0.1, Number(ing.quantity) || 1),
          unit: String(ing.unit || "count").trim(),
          inPantry: Boolean(ing.inPantry),
        }))
        .filter((ing) => ing.name.length > 0)
        .slice(0, 20);

      if (cleanedIngredients.length === 0) continue;

      sanitized.push({
        name: String(s.name).trim().slice(0, 120),
        description: String(s.description).trim().slice(0, 400),
        effortLevel: s.effortLevel,
        estimatedTime: Math.max(10, Math.min(180, Math.round(s.estimatedTime))),
        servings: Math.max(1, Math.min(8, Math.round(s.servings || 4))),
        ingredients: cleanedIngredients,
        instructions: (s.instructions ?? [])
          .map((step) => String(step).trim())
          .filter(Boolean)
          .slice(0, 10),
        missingItems: Array.from(
          new Set(
            cleanedIngredients
              .filter((ing) => !ing.inPantry)
              .map((ing) => ing.name)
          )
        ),
      });
    }

    if (sanitized.length === 0) {
      throw new ConvexError(
        "Couldn't find safe dinner ideas with those items. Try adding more pantry items or removing dietary restrictions."
      );
    }

    const planId = await ctx.runMutation(internal.internal.publicDinner.savePlan, {
      pantryText: args.pantryText.slice(0, 2000),
      allergies,
      craving: args.craving?.trim() || undefined,
      suggestions: sanitized,
      sourcePage: args.sourcePage?.slice(0, 120),
      ipHash: args.fingerprint,
    });

    return { planId: planId as string, suggestions: sanitized };
  },
});
