import { validateRecipeAllergens } from "./allergenCheck";
import {
  getUsedPantryItemsFromIngredients,
  normalizeIngredientName,
  pantryItemsForIngredient,
} from "./mealPlanning";

type PantryItemLike = {
  name: string;
};

type RecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
  inPantry: boolean;
};

/**
 * Check if a recipe contains any disliked ingredients.
 * Checks both the recipe name and all ingredient names.
 * Returns the list of matched dislikes.
 */
export function checkRecipeForDislikes(
  recipeName: string,
  ingredients: Array<{ name: string }>,
  dislikes: string[]
): string[] {
  if (dislikes.length === 0) return [];

  const normalizedDislikes = dislikes.map((d) => normalizeIngredientName(d));
  const matched: string[] = [];

  const normalizedRecipeName = normalizeIngredientName(recipeName);

  for (const dislike of normalizedDislikes) {
    // Check recipe name (e.g. "Taco Night" with beef tacos → "beef" in description)
    if (
      normalizedRecipeName.includes(dislike) ||
      dislike.includes(normalizedRecipeName)
    ) {
      matched.push(dislike);
      continue;
    }

    // Check each ingredient
    for (const ing of ingredients) {
      const normalizedIng = normalizeIngredientName(ing.name);
      if (
        normalizedIng.includes(dislike) ||
        dislike.includes(normalizedIng)
      ) {
        matched.push(dislike);
        break;
      }
    }
  }

  return Array.from(new Set(matched));
}

export function filterRecipeIngredientsForHouseholdSafety({
  recipeName,
  ingredients,
  allergies,
  pantryItems,
  contextLabel,
}: {
  recipeName: string;
  ingredients: RecipeIngredient[];
  allergies: string[];
  pantryItems: PantryItemLike[];
  contextLabel: string;
}) {
  const violations =
    allergies.length > 0 ? validateRecipeAllergens(ingredients, allergies) : [];

  if (violations.length > 0) {
    console.warn(
      `Allergen violation in ${contextLabel} "${recipeName}": ` +
        violations
          .map((violation) => {
            return `${violation.ingredient} (matched: ${violation.matchedAllergen})`;
          })
          .join(", ")
    );
  }

  const violatingIngredientNames = new Set(
    violations.map((violation) => violation.ingredient)
  );

  const safeIngredients = ingredients
    .filter((ingredient) => !violatingIngredientNames.has(ingredient.name))
    .map((ingredient) => ({
      ...ingredient,
      inPantry: pantryItemsForIngredient(ingredient.name, pantryItems).length > 0,
    }));

  if (safeIngredients.length === 0) {
    throw new Error(`Recipe "${recipeName}" did not contain any safe ingredients.`);
  }

  return {
    ingredients: safeIngredients,
    usedPantryItems: getUsedPantryItemsFromIngredients(
      safeIngredients.map((ingredient) => ingredient.name),
      pantryItems
    ),
  };
}
