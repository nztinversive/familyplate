import assert from "node:assert/strict";
import test from "node:test";
import { getSafeFallbackIngredients } from "./curatedFallback.ts";

test("checks dislikes after removing allergen ingredients", () => {
  const ingredients = [{ name: "Sour cream" }, { name: "Ground beef" }];
  let checkedIngredients = [];

  const result = getSafeFallbackIngredients({
    ingredients,
    violatingIngredientNames: ["Sour cream"],
    rejectForAllergens: false,
    isDisliked: (safeIngredients) => {
      checkedIngredients = safeIngredients;
      return safeIngredients.some((ingredient) => ingredient.name === "Ground beef");
    },
  });

  assert.deepEqual(checkedIngredients, [{ name: "Ground beef" }]);
  assert.equal(result, null);
});

test("rejects heavily allergenic fallbacks before dislike evaluation", () => {
  let checkedDislikes = false;

  const result = getSafeFallbackIngredients({
    ingredients: [{ name: "Milk" }, { name: "Cheese" }],
    violatingIngredientNames: ["Milk", "Cheese"],
    rejectForAllergens: true,
    isDisliked: () => {
      checkedDislikes = true;
      return false;
    },
  });

  assert.equal(result, null);
  assert.equal(checkedDislikes, false);
});
