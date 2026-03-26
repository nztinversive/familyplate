import {
  getUsedPantryItemsFromIngredients,
  normalizeUnit,
  pantryItemsForIngredient,
  roundQuantity,
} from "./mealPlanning";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

type PantryItemLike = {
  name: string;
};

export type RawRecipe = {
  name: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  effortLevel: "easy" | "medium" | "hard";
  estimatedTime: number;
  servings: number;
  tags: string[];
  usedPantryItems?: string[];
};

export async function generateStructuredJson<T>({
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
}: {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured in Convex environment variables.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return JSON.parse(content) as T;
}

export function sanitizeRecipe(
  recipe: RawRecipe,
  pantryItems: PantryItemLike[],
  fallbackServings: number
) {
  const ingredients = (recipe.ingredients ?? [])
    .map((ingredient) => ({
      name: ingredient.name.trim(),
      quantity: roundQuantity(Math.max(ingredient.quantity, 0.1)),
      unit: normalizeUnit(ingredient.unit || "count"),
    }))
    .filter((ingredient) => ingredient.name.length > 0);

  if (ingredients.length === 0) {
    throw new Error(`Recipe "${recipe.name}" did not include any ingredients.`);
  }

  const ingredientNames = ingredients.map((ingredient) => ingredient.name);
  const usedPantryItems = getUsedPantryItemsFromIngredients(ingredientNames, pantryItems);

  return {
    name: recipe.name.trim(),
    description: recipe.description.trim(),
    ingredients: ingredients.map((ingredient) => ({
      ...ingredient,
      inPantry: pantryItemsForIngredient(ingredient.name, pantryItems).length > 0,
    })),
    instructions: (recipe.instructions ?? [])
      .map((instruction) => instruction.trim())
      .filter(Boolean)
      .slice(0, 8),
    effortLevel: recipe.effortLevel,
    estimatedTime: Math.max(10, Math.round(recipe.estimatedTime)),
    servings: Math.max(1, Math.round(recipe.servings || fallbackServings)),
    tags: Array.from(
      new Set(
        (recipe.tags ?? [])
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 6)
      )
    ),
    usedPantryItems,
  };
}
