import { validateRecipeAllergens } from "./allergenCheck";
import {
  getUsedPantryItemsFromIngredients,
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
