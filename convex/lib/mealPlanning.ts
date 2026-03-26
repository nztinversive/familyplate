export type GeneratedIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type GeneratedRecipe = {
  name: string;
  description: string;
  ingredients: GeneratedIngredient[];
  instructions: string[];
  effortLevel: "easy" | "medium" | "hard";
  estimatedTime: number;
  servings: number;
  tags: string[];
  usedPantryItems: string[];
};

export type GeneratedMealSlot = {
  primary: GeneratedRecipe;
  alternatives: GeneratedRecipe[];
};

type PantryItemSortMetadata = {
  expirationDate?: number;
  addedAt?: number;
};

export function normalizeIngredientName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(\w+)s\b/g, "$1")
    .trim();
}

export function roundQuantity(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export function getWeekDates(weekStartDate: string) {
  const start = parseDateOnly(weekStartDate);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    return formatDate(current);
  });
}

export function getCurrentWeekStartDate() {
  const today = new Date();
  const current = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const day = current.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setUTCDate(current.getUTCDate() + diff);
  return formatDate(current);
}

export function inferCategory(name: string) {
  const normalized = normalizeIngredientName(name);

  if (
    normalized.includes("lettuce") ||
    normalized.includes("tomato") ||
    normalized.includes("potato") ||
    normalized.includes("carrot") ||
    normalized.includes("onion") ||
    normalized.includes("broccoli") ||
    normalized.includes("pepper") ||
    normalized.includes("cucumber") ||
    normalized.includes("avocado") ||
    normalized.includes("mushroom") ||
    normalized.includes("parsley") ||
    normalized.includes("ginger") ||
    normalized.includes("pea") ||
    normalized.includes("spinach") ||
    normalized.includes("lime") ||
    normalized.includes("lemon")
  ) {
    return "Produce";
  }

  if (
    normalized.includes("beef") ||
    normalized.includes("chicken") ||
    normalized.includes("salmon") ||
    normalized.includes("turkey") ||
    normalized.includes("pork") ||
    normalized.includes("sausage") ||
    normalized.includes("shrimp")
  ) {
    return "Meat";
  }

  if (
    normalized.includes("cheese") ||
    normalized.includes("mozzarella") ||
    normalized.includes("parmesan") ||
    normalized.includes("sour cream") ||
    normalized.includes("egg") ||
    normalized.includes("milk") ||
    normalized.includes("yogurt")
  ) {
    return "Dairy";
  }

  if (
    normalized.includes("spaghetti") ||
    normalized.includes("rice") ||
    normalized.includes("noodle") ||
    normalized.includes("bun") ||
    normalized.includes("tortilla") ||
    normalized.includes("dough") ||
    normalized.includes("breadcrumb") ||
    normalized.includes("oat") ||
    normalized.includes("pasta")
  ) {
    return "Grains";
  }

  if (
    normalized.includes("sauce") ||
    normalized.includes("seasoning") ||
    normalized.includes("soy") ||
    normalized.includes("oil") ||
    normalized.includes("pickle") ||
    normalized.includes("seed") ||
    normalized.includes("vinegar") ||
    normalized.includes("mustard") ||
    normalized.includes("ketchup")
  ) {
    return "Condiments";
  }

  if (
    normalized.includes("frozen") ||
    normalized.includes("ice cream") ||
    normalized.includes("edamame")
  ) {
    return "Frozen";
  }

  return "Other";
}

export function makeIngredientKey(name: string, unit: string) {
  return `${normalizeIngredientName(name)}::${normalizeUnit(unit)}`;
}

export function normalizeUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();

  if (["item", "items", "count", "whole"].includes(normalized)) {
    return "count";
  }

  if (["lb", "lbs", "pound", "pounds"].includes(normalized)) {
    return "lb";
  }

  if (["oz", "ounce", "ounces"].includes(normalized)) {
    return "oz";
  }

  if (["tbsp", "tablespoon", "tablespoons"].includes(normalized)) {
    return "tbsp";
  }

  if (["tsp", "teaspoon", "teaspoons"].includes(normalized)) {
    return "tsp";
  }

  if (["cup", "cups"].includes(normalized)) {
    return "cup";
  }

  return normalized;
}

export function pantryItemsForIngredient(
  ingredientName: string,
  pantryItems: Array<{ name: string }>
) {
  const normalizedIngredient = normalizeIngredientName(ingredientName);

  return pantryItems.filter((item) => {
    const normalizedItem = normalizeIngredientName(item.name);
    return (
      normalizedIngredient === normalizedItem ||
      normalizedIngredient.includes(normalizedItem) ||
      normalizedItem.includes(normalizedIngredient)
    );
  });
}

export function getUsedPantryItemsFromIngredients(
  ingredientNames: string[],
  pantryItems: Array<{ name: string }>
) {
  return Array.from(
    new Set(
      ingredientNames.flatMap((ingredientName) =>
        pantryItemsForIngredient(ingredientName, pantryItems).map((item) => item.name)
      )
    )
  );
}

export function sortPantryItemsForPrompt<T>(
  items: T[]
) {
  const getExpirationDate = (item: T): number | undefined =>
    (item as PantryItemSortMetadata).expirationDate;
  const getAddedAt = (item: T): number => (item as PantryItemSortMetadata).addedAt ?? 0;

  return [...items].sort((a, b) => {
    const aExpiration = getExpirationDate(a);
    const bExpiration = getExpirationDate(b);

    if (aExpiration && bExpiration) {
      return aExpiration - bExpiration;
    }

    if (aExpiration) return -1;
    if (bExpiration) return 1;

    return getAddedAt(b) - getAddedAt(a);
  });
}

export function daysUntilExpiration(expirationDate?: number) {
  if (!expirationDate) return null;
  const millisPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((expirationDate - Date.now()) / millisPerDay);
}
