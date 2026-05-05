function normalizeIngredientName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(\w+)s\b/g, "$1")
    .trim();
}

export function isAlwaysAvailableIngredient(name: string) {
  const normalized = normalizeIngredientName(name);

  return ["water", "cold water", "warm water", "hot water"].includes(
    normalized,
  );
}

export function isIngredientAvailable(ingredient: {
  name: string;
  inPantry: boolean;
}) {
  return ingredient.inPantry || isAlwaysAvailableIngredient(ingredient.name);
}
