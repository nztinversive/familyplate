import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { normalizeIngredientName } from "../lib/mealPlanning";
import { validateRecipeAllergens } from "../lib/allergenCheck";
import { checkRecipeForDislikes } from "../lib/recipeSafety";

const PLACEHOLDER_DINNERS = [
  {
    title: "Taco Night",
    description: "Seasoned beef tacos with crisp toppings and a quick lime crema.",
    effortLevel: "easy" as const,
    estimatedTime: 30,
    servings: 4,
    tags: ["mexican", "family favorite", "weeknight"],
    ingredients: [
      { name: "Ground beef", quantity: 1, unit: "lb", inPantry: false },
      { name: "Corn tortillas", quantity: 12, unit: "count", inPantry: false },
      { name: "Shredded lettuce", quantity: 1, unit: "head", inPantry: false },
      { name: "Tomatoes", quantity: 2, unit: "count", inPantry: false },
      { name: "Cheddar cheese", quantity: 8, unit: "oz", inPantry: false },
      { name: "Sour cream", quantity: 8, unit: "oz", inPantry: false },
      { name: "Taco seasoning", quantity: 1, unit: "packet", inPantry: true },
    ],
    instructions: [
      "Brown the beef in a skillet and stir in taco seasoning with a splash of water.",
      "Warm the tortillas while you chop lettuce and tomatoes.",
      "Set out the toppings and build tacos at the table.",
    ],
  },
  {
    title: "Sheet Pan Chicken",
    description: "Roasted chicken thighs with potatoes, carrots, and onions on one tray.",
    effortLevel: "easy" as const,
    estimatedTime: 40,
    servings: 4,
    tags: ["one pan", "roasted", "high protein"],
    ingredients: [
      { name: "Chicken thighs", quantity: 2, unit: "lb", inPantry: false },
      { name: "Baby potatoes", quantity: 1.5, unit: "lb", inPantry: false },
      { name: "Carrots", quantity: 1, unit: "lb", inPantry: false },
      { name: "Yellow onion", quantity: 1, unit: "count", inPantry: false },
      { name: "Olive oil", quantity: 2, unit: "tbsp", inPantry: true },
      { name: "Garlic powder", quantity: 1, unit: "tbsp", inPantry: true },
      { name: "Italian seasoning", quantity: 1, unit: "tbsp", inPantry: true },
    ],
    instructions: [
      "Toss the vegetables with oil and seasonings directly on a sheet pan.",
      "Nestle chicken thighs between the vegetables and roast until golden and cooked through.",
      "Serve everything straight from the pan with the pan juices spooned over top.",
    ],
  },
  {
    title: "Spaghetti and Meatballs",
    description: "Classic spaghetti night with tender meatballs and marinara.",
    effortLevel: "medium" as const,
    estimatedTime: 45,
    servings: 4,
    tags: ["italian", "comfort food", "pasta"],
    ingredients: [
      { name: "Spaghetti", quantity: 1, unit: "lb", inPantry: false },
      { name: "Ground beef", quantity: 1, unit: "lb", inPantry: false },
      { name: "Breadcrumbs", quantity: 1, unit: "cup", inPantry: true },
      { name: "Eggs", quantity: 1, unit: "count", inPantry: false },
      { name: "Parmesan", quantity: 0.5, unit: "cup", inPantry: false },
      { name: "Marinara sauce", quantity: 24, unit: "oz", inPantry: false },
      { name: "Fresh parsley", quantity: 0.25, unit: "cup", inPantry: false },
    ],
    instructions: [
      "Mix beef, breadcrumbs, egg, parmesan, and parsley, then form meatballs.",
      "Brown the meatballs, add marinara, and simmer until cooked through.",
      "Boil the spaghetti and serve with meatballs, sauce, and extra parmesan.",
    ],
  },
  {
    title: "Salmon Rice Bowls",
    description: "Teriyaki salmon bowls with rice, cucumber, avocado, and edamame.",
    effortLevel: "medium" as const,
    estimatedTime: 35,
    servings: 4,
    tags: ["bowls", "seafood", "fresh"],
    ingredients: [
      { name: "Salmon fillets", quantity: 1.5, unit: "lb", inPantry: false },
      { name: "Jasmine rice", quantity: 2, unit: "cups", inPantry: false },
      { name: "Cucumber", quantity: 1, unit: "count", inPantry: false },
      { name: "Avocados", quantity: 2, unit: "count", inPantry: false },
      { name: "Shelled edamame", quantity: 12, unit: "oz", inPantry: false },
      { name: "Teriyaki sauce", quantity: 0.5, unit: "cup", inPantry: false },
      { name: "Sesame seeds", quantity: 1, unit: "tbsp", inPantry: true },
    ],
    instructions: [
      "Cook the rice and warm the edamame while the salmon bakes.",
      "Brush salmon with teriyaki sauce and roast until it flakes easily.",
      "Assemble bowls with rice, salmon, cucumber, avocado, and a sesame seed finish.",
    ],
  },
  {
    title: "Veggie Stir Fry",
    description: "Colorful stir fry with broccoli, peppers, snap peas, and a gingery sauce.",
    effortLevel: "easy" as const,
    estimatedTime: 25,
    servings: 4,
    tags: ["vegetarian", "quick", "veggies"],
    ingredients: [
      { name: "Rice noodles", quantity: 8, unit: "oz", inPantry: false },
      { name: "Broccoli", quantity: 1, unit: "head", inPantry: false },
      { name: "Bell peppers", quantity: 2, unit: "count", inPantry: false },
      { name: "Snap peas", quantity: 8, unit: "oz", inPantry: false },
      { name: "Carrots", quantity: 2, unit: "count", inPantry: false },
      { name: "Soy sauce", quantity: 0.25, unit: "cup", inPantry: true },
      { name: "Fresh ginger", quantity: 1, unit: "tbsp", inPantry: false },
    ],
    instructions: [
      "Soak or boil the noodles according to the package directions.",
      "Stir fry the vegetables over high heat until crisp-tender.",
      "Add the noodles, soy sauce, and ginger, then toss until glossy and hot.",
    ],
  },
  {
    title: "Burger Night",
    description: "Juicy burgers with oven fries and all the classic toppings.",
    effortLevel: "easy" as const,
    estimatedTime: 35,
    servings: 4,
    tags: ["american", "grill", "kids"],
    ingredients: [
      { name: "Ground beef", quantity: 1.5, unit: "lb", inPantry: false },
      { name: "Burger buns", quantity: 4, unit: "count", inPantry: false },
      { name: "Russet potatoes", quantity: 2, unit: "lb", inPantry: false },
      { name: "Cheddar cheese", quantity: 4, unit: "slices", inPantry: false },
      { name: "Lettuce", quantity: 1, unit: "head", inPantry: false },
      { name: "Tomatoes", quantity: 2, unit: "count", inPantry: false },
      { name: "Pickles", quantity: 0.5, unit: "cup", inPantry: false },
    ],
    instructions: [
      "Cut the potatoes into wedges, season them, and roast until crisp.",
      "Shape and cook the burger patties, adding cheese for the last minute.",
      "Toast the buns and serve with lettuce, tomato, pickles, and fries.",
    ],
  },
  {
    title: "Homemade Pizza",
    description: "Sheet pan pizza with mozzarella, pepperoni, and plenty of sauce.",
    effortLevel: "medium" as const,
    estimatedTime: 50,
    servings: 4,
    tags: ["pizza", "family night", "bake"],
    ingredients: [
      { name: "Pizza dough", quantity: 1, unit: "lb", inPantry: false },
      { name: "Pizza sauce", quantity: 1, unit: "cup", inPantry: false },
      { name: "Mozzarella", quantity: 12, unit: "oz", inPantry: false },
      { name: "Pepperoni", quantity: 4, unit: "oz", inPantry: false },
      { name: "Mushrooms", quantity: 8, unit: "oz", inPantry: false },
      { name: "Bell pepper", quantity: 1, unit: "count", inPantry: false },
      { name: "Olive oil", quantity: 1, unit: "tbsp", inPantry: true },
    ],
    instructions: [
      "Stretch the dough onto an oiled sheet pan and let it rest briefly.",
      "Top with sauce, cheese, pepperoni, mushrooms, and bell pepper.",
      "Bake until the crust is browned and the cheese is bubbling, then slice and serve.",
    ],
  },
];

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const generatePlaceholderPlan = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) throw new Error("No profile found");

    const householdId = profile.householdId;

    // Collect ALL household allergies and dislikes separately
    const allProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();
    const allAllergies = Array.from(
      new Set(
        allProfiles
          .flatMap((p) => p.allergies ?? [])
          .map((a) => a.toLowerCase().trim())
          .filter(Boolean)
      )
    );
    const allDislikes = Array.from(
      new Set(
        allProfiles
          .flatMap((p) => p.dislikes ?? [])
          .map((d) => d.toLowerCase().trim())
          .filter(Boolean)
      )
    );

    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();
    const pantryNames = new Set(
      pantryItems.map((item) => normalizeIngredientName(item.name))
    );
    const existingPlans = await ctx.db
      .query("weeklyMealPlans")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();

    for (const plan of existingPlans) {
      if (plan.status === "active") {
        await ctx.db.patch(plan._id, { status: "completed" });
      }
    }

    const weekStart = getStartOfWeek(new Date());
    const weekStartDate = formatDate(weekStart);
    const createdAt = Date.now();
    // Filter out placeholder dinners that contain allergens OR dislikes
    const safeDinners = PLACEHOLDER_DINNERS.map((dinner, index) => {
      // Check allergens
      if (allAllergies.length > 0) {
        const violations = validateRecipeAllergens(
          dinner.ingredients,
          allAllergies
        );
        if (violations.length > dinner.ingredients.length / 2) {
          return { ...dinner, originalIndex: index, safe: false };
        }
        if (violations.length > 0) {
          const violatingNames = new Set(violations.map((v) => v.ingredient));
          return {
            ...dinner,
            ingredients: dinner.ingredients.filter((ing) => !violatingNames.has(ing.name)),
            originalIndex: index,
            safe: true,
          };
        }
      }

      // Check dislikes — if recipe contains disliked items, skip entirely
      if (allDislikes.length > 0) {
        const dislikeHits = checkRecipeForDislikes(
          dinner.title,
          dinner.ingredients,
          allDislikes
        );
        if (dislikeHits.length > 0) {
          return { ...dinner, originalIndex: index, safe: false };
        }
      }

      return { ...dinner, originalIndex: index, safe: true };
    }).filter((d) => d.safe);

    const dinners = safeDinners.map((dinner) => ({
      ...dinner,
      pantryScore: dinner.ingredients.reduce((score, ingredient) => {
        return pantryNames.has(normalizeIngredientName(ingredient.name))
          ? score + 1
          : score;
      }, 0),
    }))
      .sort((a, b) => b.pantryScore - a.pantryScore || a.originalIndex - b.originalIndex)
      .slice(0, 7);

    const mealPlanId = await ctx.db.insert("weeklyMealPlans", {
      householdId,
      weekStartDate,
      status: "active",
      createdAt,
    });

    for (let index = 0; index < dinners.length; index += 1) {
      const dinner = dinners[index];
      const mealDate = new Date(weekStart);
      mealDate.setDate(weekStart.getDate() + index);
      const ingredients = dinner.ingredients.map((ingredient) => ({
        ...ingredient,
        inPantry: pantryNames.has(normalizeIngredientName(ingredient.name)),
      }));

      const recipeId = await ctx.db.insert("recipeSuggestions", {
        householdId,
        title: dinner.title,
        description: dinner.description,
        ingredients,
        instructions: dinner.instructions,
        effortLevel: dinner.effortLevel,
        estimatedTime: dinner.estimatedTime,
        servings: dinner.servings,
        tags: dinner.tags,
        usedPantryItems: ingredients
          .filter((ingredient) => ingredient.inPantry)
          .map((ingredient) => ingredient.name),
        source: "curated",
        createdAt: createdAt + index,
      });

      await ctx.db.insert("plannedMeals", {
        mealPlanId,
        recipeId,
        alternativeRecipeIds: [],
        date: formatDate(mealDate),
        mealType: "dinner",
        status: "planned",
      });
    }

    return mealPlanId;
  },
});

export const updateMealStatus = mutation({
  args: {
    mealId: v.id("plannedMeals"),
    status: v.union(
      v.literal("planned"),
      v.literal("cooked"),
      v.literal("skipped")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) throw new Error("No profile found");

    const householdId = profile.householdId;
    const meal = await ctx.db.get(args.mealId);
    if (!meal) throw new Error("Meal not found");

    const plan = await ctx.db.get(meal.mealPlanId);
    if (!plan || plan.householdId !== householdId) {
      throw new Error("Meal does not belong to your household");
    }

    await ctx.db.patch(args.mealId, { status: args.status });
    return args.mealId;
  },
});

export const swapMeal = mutation({
  args: {
    mealId: v.id("plannedMeals"),
    recipeId: v.id("recipeSuggestions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) throw new Error("No profile found");

    const householdId = profile.householdId;
    const meal = await ctx.db.get(args.mealId);
    if (!meal) throw new Error("Meal not found");

    const plan = await ctx.db.get(meal.mealPlanId);
    if (!plan || plan.householdId !== householdId) {
      throw new Error("Meal does not belong to your household");
    }

    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.householdId !== householdId) {
      throw new Error("Recipe does not belong to your household");
    }

    await ctx.db.patch(args.mealId, {
      recipeId: args.recipeId,
      status: "planned",
    });

    return args.mealId;
  },
});
