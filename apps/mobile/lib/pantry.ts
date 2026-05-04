export const PANTRY_CATEGORIES = [
  "Produce",
  "Fresh",
  "Dairy",
  "Meat",
  "Grains",
  "Canned",
  "Snacks",
  "Beverages",
  "Condiments",
  "Frozen",
  "Other",
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export const PANTRY_UNITS = [
  "items",
  "lb",
  "oz",
  "kg",
  "g",
  "cups",
  "tbsp",
  "tsp",
  "ml",
  "L",
  "gal",
  "fl oz",
  "dozen",
  "bunch",
  "bag",
  "box",
  "can",
  "jar",
  "bottle",
  "pack",
  "slices",
] as const;

export const STORAGE_LOCATIONS = ["pantry", "fridge", "freezer"] as const;
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export function getStorageIconName(location: StorageLocation): string {
  switch (location) {
    case "freezer":
      return "snowflake";
    case "fridge":
      return "thermometer.medium";
    case "pantry":
    default:
      return "shippingbox.fill";
  }
}

export function getStorageTint(location: StorageLocation): {
  bg: string;
  fg: string;
} {
  switch (location) {
    case "freezer":
      return { bg: "#dbeafe", fg: "#2563eb" };
    case "fridge":
      return { bg: "#cffafe", fg: "#0891b2" };
    case "pantry":
    default:
      return { bg: "#fef3c7", fg: "#b45309" };
  }
}

export function formatExpirationLabel(timestamp?: number): string {
  if (!timestamp) return "No expiration";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(timestamp);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return `Expired ${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return "Expires today";
  if (diffDays <= 7) return `Expires in ${diffDays}d`;
  return `Exp ${expiry.toLocaleDateString()}`;
}

export function getExpirationColor(timestamp?: number): string {
  if (!timestamp) return "#6b7280";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(timestamp);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "#dc2626";
  if (diffDays <= 3) return "#d97706";
  return "#6b7280";
}

export function inferCategory(name: string): PantryCategory {
  const n = name.trim().toLowerCase();
  if (!n) return "Other";
  if (/frozen|ice cream|popsicle/.test(n)) return "Frozen";
  if (/chicken|beef|pork|turkey|bacon|sausage|ham|salmon|tuna|fish|shrimp|seafood|meat/.test(n)) return "Meat";
  if (/milk|cheese|yogurt|butter|cream|kefir/.test(n)) return "Dairy";
  if (/lettuce|spinach|kale|broccoli|cauliflower|carrot|celery|cucumber|zucchini|onion|garlic|potato|tomato|pepper|avocado|mushroom|cilantro|parsley|basil|ginger|lime|lemon|apple|banana|berry|melon|peach|fruit|vegetable|veggie/.test(n)) return "Produce";
  if (/egg|bread|bagel|roll|bun|tofu/.test(n)) return "Fresh";
  if (/rice|pasta|cereal|oats|flour|noodle|quinoa|tortilla|wrap|grain/.test(n)) return "Grains";
  if (/canned|soup|broth|stock|beans?|chickpea|lentil/.test(n)) return "Canned";
  if (/sauce|dressing|ketchup|mustard|mayo|oil|vinegar|syrup|spice|seasoning|salsa|jam|jelly|peanut butter/.test(n)) return "Condiments";
  if (/juice|soda|water|coffee|tea|drink|beverage/.test(n)) return "Beverages";
  if (/chip|cracker|cookie|pretzel|popcorn|candy|chocolate|snack/.test(n)) return "Snacks";
  return "Other";
}
