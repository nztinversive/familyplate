type IngredientLike = { name: string };

export function getSafeFallbackIngredients<TIngredient extends IngredientLike>({
  ingredients,
  violatingIngredientNames,
  rejectForAllergens,
  isDisliked,
}: {
  ingredients: TIngredient[];
  violatingIngredientNames: string[];
  rejectForAllergens: boolean;
  isDisliked: (safeIngredients: TIngredient[]) => boolean;
}) {
  if (rejectForAllergens) return null;

  const violatingNames = new Set(violatingIngredientNames);
  const safeIngredients = ingredients.filter(
    (ingredient) => !violatingNames.has(ingredient.name),
  );

  return isDisliked(safeIngredients) ? null : safeIngredients;
}
