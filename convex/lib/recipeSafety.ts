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
 * Maps disliked items to derivative terms, similar to allergen derivatives.
 * This ensures "beef" catches "ground beef", "steak", etc.
 */
const DISLIKE_DERIVATIVES: Record<string, string[]> = {
  beef: [
    "beef", "ground beef", "steak", "sirloin", "ribeye", "brisket",
    "chuck", "flank", "tenderloin", "filet mignon", "roast beef",
    "corned beef", "beef broth", "beef stock", "meatball", "meatloaf",
    "hamburger", "burger patty", "short rib", "prime rib", "veal",
    "beef taco", "beef stew",
  ],
  pork: [
    "pork", "bacon", "ham", "sausage", "pork chop", "pork loin",
    "pork belly", "pulled pork", "prosciutto", "pancetta", "chorizo",
    "bratwurst", "pork shoulder", "spare rib", "pork tenderloin",
    "hot dog", "pepperoni", "salami",
  ],
  chicken: [
    "chicken", "chicken breast", "chicken thigh", "chicken wing",
    "chicken drumstick", "chicken tender", "rotisserie chicken",
    "chicken broth", "chicken stock", "poultry",
  ],
  turkey: [
    "turkey", "turkey breast", "ground turkey", "turkey bacon",
    "turkey sausage",
  ],
  lamb: [
    "lamb", "lamb chop", "lamb shank", "ground lamb", "mutton",
    "lamb shoulder", "rack of lamb",
  ],
  fish: [
    "fish", "salmon", "tuna", "cod", "tilapia", "halibut",
    "sardine", "anchovy", "trout", "bass", "catfish",
    "swordfish", "mahi", "snapper", "grouper", "fish sauce",
  ],
  shellfish: [
    "shrimp", "crab", "lobster", "scallop", "clam",
    "mussel", "oyster", "crawfish", "prawn", "shellfish",
  ],
  mushroom: [
    "mushroom", "shiitake", "portobello", "cremini", "oyster mushroom",
    "chanterelle", "truffle", "porcini",
  ],
  onion: [
    "onion", "red onion", "white onion", "yellow onion", "green onion",
    "scallion", "shallot", "leek", "spring onion", "pearl onion",
  ],
  tofu: [
    "tofu", "bean curd", "silken tofu", "firm tofu",
  ],
  spicy: [
    "jalapeno", "habanero", "sriracha", "cayenne", "hot sauce",
    "chili flake", "red pepper flake", "ghost pepper", "tabasco",
    "gochujang", "chipotle",
  ],
};

/**
 * Expand a list of dislikes into all derivative terms.
 */
function expandDislikeTerms(dislikes: string[]): Set<string> {
  const terms = new Set<string>();

  for (const dislike of dislikes) {
    const normalized = dislike.toLowerCase().trim();
    terms.add(normalized);

    for (const [category, derivatives] of Object.entries(DISLIKE_DERIVATIVES)) {
      if (
        normalized === category ||
        normalized.includes(category) ||
        category.includes(normalized)
      ) {
        for (const d of derivatives) {
          terms.add(d);
        }
      }
    }
  }

  return terms;
}

/**
 * Check if a recipe contains any disliked ingredients.
 * Checks both the recipe name and all ingredient names.
 * Expands dislikes using derivative mapping (e.g. "beef" → "ground beef", "steak", etc.)
 * Returns the list of matched dislikes.
 */
export function checkRecipeForDislikes(
  recipeName: string,
  ingredients: Array<{ name: string }>,
  dislikes: string[]
): string[] {
  if (dislikes.length === 0) return [];

  const expandedTerms = expandDislikeTerms(dislikes);
  const matched: string[] = [];

  const normalizedRecipeName = normalizeIngredientName(recipeName);

  // Check recipe name against all expanded terms
  for (const term of Array.from(expandedTerms)) {
    if (normalizedRecipeName.includes(term)) {
      matched.push(term);
    }
  }

  // Check each ingredient against all expanded terms
  for (const ing of ingredients) {
    const normalizedIng = normalizeIngredientName(ing.name);
    for (const term of Array.from(expandedTerms)) {
      if (
        normalizedIng.includes(term) ||
        term.includes(normalizedIng)
      ) {
        matched.push(term);
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
