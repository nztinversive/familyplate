/**
 * Maps common allergens to their derivative ingredients.
 * Used for server-side validation of AI-generated recipes.
 */
const ALLERGEN_DERIVATIVES: Record<string, string[]> = {
  milk: [
    "milk", "cream", "butter", "cheese", "yogurt", "whey", "casein",
    "lactose", "ghee", "curd", "custard", "sour cream", "ice cream",
    "mozzarella", "parmesan", "cheddar", "ricotta", "brie", "feta",
    "gouda", "swiss cheese", "cream cheese", "cottage cheese",
    "half and half", "heavy cream", "whipped cream", "buttermilk",
    "condensed milk", "evaporated milk", "whole milk", "skim milk",
    "dairy", "milkfat",
  ],
  wheat: [
    "wheat", "flour", "bread", "pasta", "noodle", "spaghetti",
    "fettuccine", "linguine", "penne", "macaroni", "tortilla",
    "pita", "naan", "croissant", "baguette", "breadcrumb",
    "panko", "crouton", "couscous", "semolina", "bulgur",
    "seitan", "soy sauce", "teriyaki", "worcestershire",
    "all-purpose flour", "self-rising flour", "cake flour",
    "pastry", "pie crust", "pizza dough", "dumpling",
    "wonton", "ramen", "udon",
  ],
  egg: [
    "egg", "eggs", "mayonnaise", "mayo", "meringue", "custard",
    "aioli", "hollandaise", "quiche", "frittata", "omelette",
    "egg wash", "egg noodle",
  ],
  peanut: [
    "peanut", "peanuts", "peanut butter", "peanut oil",
    "peanut sauce", "groundnut",
  ],
  "tree nut": [
    "almond", "cashew", "walnut", "pecan", "pistachio",
    "macadamia", "hazelnut", "brazil nut", "pine nut",
    "chestnut", "praline", "marzipan", "nougat",
    "almond milk", "almond flour", "cashew cream",
  ],
  soy: [
    "soy", "soybean", "tofu", "tempeh", "edamame",
    "soy sauce", "soy milk", "miso", "soy protein",
    "soy lecithin",
  ],
  fish: [
    "fish", "salmon", "tuna", "cod", "tilapia", "halibut",
    "sardine", "anchovy", "trout", "bass", "catfish",
    "swordfish", "mahi", "snapper", "grouper",
    "fish sauce", "worcestershire",
  ],
  shellfish: [
    "shrimp", "crab", "lobster", "scallop", "clam",
    "mussel", "oyster", "crawfish", "prawn", "langoustine",
    "shellfish",
  ],
  sesame: [
    "sesame", "sesame oil", "sesame seed", "tahini",
    "halva", "hummus",
  ],
  gluten: [
    "wheat", "flour", "bread", "pasta", "noodle", "spaghetti",
    "barley", "rye", "oat", "couscous", "semolina",
    "soy sauce", "teriyaki", "breadcrumb", "panko",
    "tortilla", "pita", "naan", "seitan", "bulgur",
    "beer", "malt",
  ],
};

function normalizeForCheck(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
}

/**
 * Get all derivative terms for a list of allergens.
 */
export function getAllergenTerms(allergies: string[]): Set<string> {
  const terms = new Set<string>();

  for (const allergy of allergies) {
    const normalized = normalizeForCheck(allergy);
    terms.add(normalized);

    // Check if this matches a known allergen category
    for (const [category, derivatives] of Object.entries(ALLERGEN_DERIVATIVES)) {
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
 * Check if an ingredient name contains any allergen.
 * Returns the matching allergen term if found, null if safe.
 */
export function checkIngredientForAllergens(
  ingredientName: string,
  allergenTerms: Set<string>
): string | null {
  const normalized = normalizeForCheck(ingredientName);

  for (const term of allergenTerms) {
    if (
      normalized === term ||
      normalized.includes(term) ||
      term.includes(normalized)
    ) {
      return term;
    }
  }

  return null;
}

/**
 * Validate a recipe's ingredients against household allergies.
 * Returns list of violations (empty if safe).
 */
export function validateRecipeAllergens(
  ingredients: Array<{ name: string }>,
  allergies: string[]
): Array<{ ingredient: string; matchedAllergen: string }> {
  if (allergies.length === 0) return [];

  const allergenTerms = getAllergenTerms(allergies);
  const violations: Array<{ ingredient: string; matchedAllergen: string }> = [];

  for (const ing of ingredients) {
    const match = checkIngredientForAllergens(ing.name, allergenTerms);
    if (match) {
      violations.push({ ingredient: ing.name, matchedAllergen: match });
    }
  }

  return violations;
}
