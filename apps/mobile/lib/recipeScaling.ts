type IngredientLike = {
  name: string;
  quantity: number;
  unit: string;
};

type ShareableRecipeLike<TIngredient extends IngredientLike> = {
  title?: string;
  name?: string;
  description: string;
  servings: number;
  ingredients: TIngredient[];
  instructions: string[];
};

export function formatServingsLabel(servings: number) {
  return `${servings} serving${servings === 1 ? "" : "s"}`;
}

export function getScaleFactor(
  originalServings: number,
  targetServings: number,
) {
  if (!Number.isFinite(originalServings) || originalServings <= 0) return 1;
  return targetServings / originalServings;
}

export function scaleQuantity(quantity: number, scaleFactor: number) {
  return Math.round(quantity * scaleFactor * 100) / 100;
}

export function scaleIngredients<TIngredient extends IngredientLike>(
  ingredients: TIngredient[],
  originalServings: number,
  targetServings: number,
) {
  const scaleFactor = getScaleFactor(originalServings, targetServings);
  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: scaleQuantity(ingredient.quantity, scaleFactor),
  }));
}

export function buildScaledRecipeShareText<TIngredient extends IngredientLike>(
  recipe: ShareableRecipeLike<TIngredient>,
  targetServings = recipe.servings,
) {
  const scaledIngredients = scaleIngredients(
    recipe.ingredients,
    recipe.servings,
    targetServings,
  );
  const recipeName = recipe.title ?? recipe.name ?? "Recipe";
  const ingredients = scaledIngredients
    .map(
      (ingredient) =>
        `- ${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`,
    )
    .join("\n");
  const instructions = recipe.instructions
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");
  const servingsLine =
    targetServings === recipe.servings
      ? `Serves ${formatServingsLabel(recipe.servings)}`
      : `Scaled for ${formatServingsLabel(targetServings)} (originally ${formatServingsLabel(recipe.servings)})`;

  return `${recipeName}\n\n${recipe.description}\n\n${servingsLine}\n\nIngredients\n${ingredients}\n\nInstructions\n${instructions}\n\nShared from FamilyPlate`;
}
