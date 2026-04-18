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

const CATEGORY_KEYWORDS: Array<{ category: PantryCategory; keywords: string[] }> = [
  {
    category: "Frozen",
    keywords: ["frozen", "ice cream", "popsicle", "sorbet"],
  },
  {
    category: "Meat",
    keywords: [
      "meat",
      "chicken",
      "beef",
      "steak",
      "pork",
      "turkey",
      "bacon",
      "sausage",
      "ham",
      "salmon",
      "tuna",
      "fish",
      "shrimp",
      "seafood",
    ],
  },
  {
    category: "Dairy",
    keywords: [
      "milk",
      "cheese",
      "yogurt",
      "butter",
      "cream",
      "sour cream",
      "cottage cheese",
      "half and half",
      "half-and-half",
      "kefir",
    ],
  },
  {
    category: "Produce",
    keywords: [
      "produce",
      "fruit",
      "vegetable",
      "veggie",
      "salad",
      "lettuce",
      "spinach",
      "kale",
      "arugula",
      "cabbage",
      "broccoli",
      "cauliflower",
      "carrot",
      "celery",
      "cucumber",
      "zucchini",
      "squash",
      "onion",
      "shallot",
      "garlic",
      "potato",
      "tomato",
      "pepper",
      "jalapeno",
      "avocado",
      "mushroom",
      "herb",
      "cilantro",
      "parsley",
      "basil",
      "dill",
      "chive",
      "mint",
      "ginger",
      "lime",
      "lemon",
      "orange",
      "apple",
      "banana",
      "grape",
      "berry",
      "strawberry",
      "blueberry",
      "raspberry",
      "blackberry",
      "melon",
      "watermelon",
      "peach",
      "pear",
      "plum",
      "mango",
      "pineapple",
      "kiwi",
      "cherry",
    ],
  },
  {
    category: "Fresh",
    keywords: [
      "egg",
      "bread",
      "bagel",
      "roll",
      "bun",
      "bakery",
      "muffin",
      "croissant",
      "donut",
      "deli",
      "rotisserie",
      "tofu",
    ],
  },
  {
    category: "Grains",
    keywords: [
      "grain",
      "rice",
      "pasta",
      "cereal",
      "oat",
      "oats",
      "flour",
      "noodle",
      "quinoa",
      "barley",
      "tortilla",
      "wrap",
    ],
  },
  {
    category: "Canned",
    keywords: [
      "canned",
      "soup",
      "broth",
      "stock",
      "black bean",
      "pinto bean",
      "garbanzo",
      "chickpea",
      "bean",
      "lentil",
    ],
  },
  {
    category: "Snacks",
    keywords: [
      "snack",
      "chip",
      "cracker",
      "cookie",
      "pretzel",
      "popcorn",
      "granola bar",
      "candy",
      "chocolate",
      "trail mix",
    ],
  },
  {
    category: "Beverages",
    keywords: [
      "drink",
      "beverage",
      "juice",
      "soda",
      "water",
      "coffee",
      "tea",
      "beer",
      "wine",
      "kombucha",
      "sparkling water",
    ],
  },
  {
    category: "Condiments",
    keywords: [
      "condiment",
      "sauce",
      "dressing",
      "ketchup",
      "mustard",
      "mayo",
      "mayonnaise",
      "relish",
      "pickle",
      "oil",
      "vinegar",
      "syrup",
      "spice",
      "seasoning",
      "hot sauce",
      "salsa",
      "jam",
      "jelly",
      "peanut butter",
    ],
  },
];

export function normalizePantryCategory(category?: string): PantryCategory {
  if (!category) {
    return "Other";
  }

  const exactMatch = PANTRY_CATEGORIES.find(
    (option) => option.toLowerCase() === category.trim().toLowerCase()
  );

  if (exactMatch) {
    return exactMatch;
  }

  return inferPantryCategory(category);
}

export function inferPantryCategory(name: string, unit?: string): PantryCategory {
  const normalizedName = name.trim().toLowerCase();
  const normalizedUnit = unit?.trim().toLowerCase();

  if (!normalizedName) {
    return "Other";
  }

  if (normalizedUnit === "can") {
    return "Canned";
  }

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      return category;
    }
  }

  return "Other";
}
