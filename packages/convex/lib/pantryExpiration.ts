export type PantryExpirationSource = "estimated" | "manual";
export type PantryStorageLocation = "pantry" | "fridge" | "freezer";

const millisPerDay = 24 * 60 * 60 * 1000;

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function addDaysAtMidday(referenceTime: number, days: number) {
  const date = new Date(referenceTime + days * millisPerDay);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

function pantryDays(name: string, category: string) {
  if (/bread|bagel|bun|roll|tortilla|pita/.test(name)) return 7;
  if (/banana|berries?|strawberr|raspberr|blueberr/.test(name)) return 5;
  if (/apple/.test(name)) return 21;
  if (/orange|lemon|lime|citrus/.test(name)) return 14;
  if (/potato|onion|garlic/.test(name)) return 30;
  if (/tomato|avocado|peach|pear|melon/.test(name)) return 7;
  if (/canned|can\b|soup|broth|stock|beans?|chickpea|lentil/.test(name)) {
    return 730;
  }
  if (/spice|seasoning|salt|pepper|cinnamon|paprika|cumin/.test(name)) {
    return 730;
  }
  if (/rice|pasta|noodle|oats|quinoa|flour|sugar|grain/.test(name)) return 365;
  if (/cereal|granola|cracker|chips?|pretzel|cookie|snack|popcorn/.test(name)) {
    return 90;
  }
  if (/oil|vinegar|syrup|honey/.test(name)) return 365;
  if (/ketchup|mustard|mayo|dressing|sauce|salsa|jam|jelly|peanut butter/.test(name)) {
    return 180;
  }
  if (/coffee|tea|water|soda|juice|drink|beverage/.test(name)) return 180;

  if (category === "Canned") return 730;
  if (category === "Grains" || category === "Condiments") return 365;
  if (category === "Snacks" || category === "Beverages") return 90;
  if (category === "Produce" || category === "Fresh") return 7;
  return 90;
}

function fridgeDays(name: string, category: string) {
  if (/leftover|cooked|prepared|meal prep/.test(name)) return 4;
  if (/fish|salmon|tuna|shrimp|seafood/.test(name)) return 2;
  if (/ground beef|ground turkey|ground chicken|ground pork|ground meat/.test(name)) {
    return 2;
  }
  if (/chicken|turkey|beef|pork|meat/.test(name)) return 3;
  if (/deli|ham|bacon|sausage|hot dog/.test(name)) return 7;
  if (/milk|cream|half and half|kefir/.test(name)) return 7;
  if (/yogurt|sour cream|cottage cheese/.test(name)) return 14;
  if (/cheese|butter/.test(name)) return 30;
  if (/eggs?\b/.test(name)) return 28;
  if (/lettuce|spinach|kale|greens|herbs?|cilantro|parsley|basil/.test(name)) {
    return 5;
  }
  if (/berries?|strawberr|raspberr|blueberr/.test(name)) return 5;
  if (/tomato|avocado|mushroom|broccoli|pepper|cucumber|zucchini/.test(name)) {
    return 7;
  }
  if (/carrot|celery|apple|orange|lemon|lime/.test(name)) return 21;
  if (/tofu/.test(name)) return 5;
  if (/bread|bagel|bun|roll|tortilla/.test(name)) return 10;

  if (category === "Meat") return 3;
  if (category === "Dairy") return 14;
  if (category === "Produce" || category === "Fresh") return 7;
  return 7;
}

function freezerDays(name: string, category: string) {
  if (/ice cream|popsicle|dessert/.test(name)) return 90;
  if (/bread|bagel|bun|roll|tortilla/.test(name)) return 90;
  if (/fish|salmon|tuna|shrimp|seafood/.test(name)) return 90;
  if (/chicken|turkey|beef|pork|meat/.test(name)) return 120;
  if (/fruit|vegetable|veggie|peas|corn|broccoli|berries/.test(name)) return 240;

  if (category === "Meat") return 120;
  if (category === "Produce" || category === "Frozen") return 240;
  return 180;
}

export function estimateExpirationDate(args: {
  name: string;
  category: string;
  storageLocation: PantryStorageLocation;
  referenceTime?: number;
}) {
  const name = normalized(args.name);
  const category = args.category.trim();
  const referenceTime = args.referenceTime ?? Date.now();

  const days =
    args.storageLocation === "freezer"
      ? freezerDays(name, category)
      : args.storageLocation === "fridge"
        ? fridgeDays(name, category)
        : pantryDays(name, category);

  return addDaysAtMidday(referenceTime, days);
}

export function resolveExpirationDate(args: {
  name: string;
  category: string;
  storageLocation: PantryStorageLocation;
  expirationDate?: number;
  referenceTime?: number;
}): { expirationDate: number; expirationDateSource: PantryExpirationSource } {
  if (args.expirationDate !== undefined) {
    return {
      expirationDate: args.expirationDate,
      expirationDateSource: "manual",
    };
  }

  return {
    expirationDate: estimateExpirationDate(args),
    expirationDateSource: "estimated",
  };
}
