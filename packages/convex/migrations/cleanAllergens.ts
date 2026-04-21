import { internalMutation } from "../_generated/server";
import { validateRecipeAllergens } from "../lib/allergenCheck";

/**
 * One-time migration: scan all existing recipes and strip allergen-violating
 * ingredients based on each household's current allergy profiles.
 */
export const cleanExistingRecipes = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all households
    const households = await ctx.db.query("households").collect();
    let totalFixed = 0;
    let totalScanned = 0;

    for (const household of households) {
      // Get all profiles for this household to collect allergies
      const profiles = await ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", household._id))
        .collect();

      const allAllergies = Array.from(
        new Set(
          profiles
            .flatMap((p) => p.allergies ?? [])
            .map((a) => a.toLowerCase().trim())
            .filter(Boolean)
        )
      );

      // Skip households with no allergies
      if (allAllergies.length === 0) continue;

      // Get all recipes for this household
      const recipes = await ctx.db
        .query("recipeSuggestions")
        .withIndex("by_householdId", (q) => q.eq("householdId", household._id))
        .collect();

      for (const recipe of recipes) {
        totalScanned++;
        const violations = validateRecipeAllergens(recipe.ingredients, allAllergies);

        if (violations.length > 0) {
          const violatingNames = new Set(violations.map((v) => v.ingredient));
          const cleanedIngredients = recipe.ingredients.filter(
            (ing) => !violatingNames.has(ing.name)
          );

          // Also clean usedPantryItems if present
          const cleanedPantryItems = (recipe.usedPantryItems ?? []).filter(
            (name) => !violatingNames.has(name)
          );

          await ctx.db.patch(recipe._id, {
            ingredients: cleanedIngredients,
            usedPantryItems: cleanedPantryItems,
          });

          totalFixed++;
          console.log(
            `Fixed recipe "${recipe.title}" in household "${household.name}": ` +
            `removed ${violations.length} allergen ingredient(s): ` +
            violations.map((v) => `${v.ingredient} (${v.matchedAllergen})`).join(", ")
          );
        }
      }
    }

    console.log(
      `Allergen migration complete: scanned ${totalScanned} recipes, fixed ${totalFixed}`
    );

    return { totalScanned, totalFixed };
  },
});
