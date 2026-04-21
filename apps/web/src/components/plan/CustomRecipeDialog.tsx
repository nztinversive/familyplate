"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { ChefHat, Plus, Trash2 } from "lucide-react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type EffortLevel = "easy" | "medium" | "hard";

type IngredientInput = {
  name: string;
  quantity: string;
  unit: string;
};

type NutritionInput = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

const EMPTY_INGREDIENT: IngredientInput = {
  name: "",
  quantity: "",
  unit: "",
};

function createInitialForm() {
  return {
    title: "",
    description: "",
    estimatedTime: "30",
    servings: "4",
    effortLevel: "easy" as EffortLevel,
    tags: "",
    instructions: "",
    ingredients: [{ ...EMPTY_INGREDIENT }, { ...EMPTY_INGREDIENT }],
    nutrition: {
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      fiber: "",
    } satisfies NutritionInput,
  };
}

export function CustomRecipeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (recipeId: Id<"recipeSuggestions">) => void;
}) {
  const createCustomRecipe = useMutation(api.mutations.recipes.createCustomRecipe);
  const { toast } = useToast();
  const [form, setForm] = useState(createInitialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(createInitialForm());
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const updateIngredient = (
    index: number,
    key: keyof IngredientInput,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, [key]: value } : ingredient
      ),
    }));
  };

  const addIngredient = () => {
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, { ...EMPTY_INGREDIENT }],
    }));
  };

  const removeIngredient = (index: number) => {
    setForm((current) => ({
      ...current,
      ingredients:
        current.ingredients.length === 1
          ? [{ ...EMPTY_INGREDIENT }]
          : current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const title = form.title.trim();
      if (!title) {
        throw new Error("Recipe title is required.");
      }

      const estimatedTime = Number(form.estimatedTime);
      if (!Number.isFinite(estimatedTime) || estimatedTime <= 0) {
        throw new Error("Estimated time must be greater than zero.");
      }

      const servings = Number(form.servings);
      if (!Number.isFinite(servings) || servings <= 0) {
        throw new Error("Servings must be greater than zero.");
      }

      const enteredIngredients = form.ingredients.filter(
        (ingredient) =>
          ingredient.name.trim() || ingredient.quantity.trim() || ingredient.unit.trim()
      );

      if (enteredIngredients.length === 0) {
        throw new Error("Add at least one ingredient.");
      }

      const ingredients = enteredIngredients.map((ingredient, index) => {
        const name = ingredient.name.trim();
        const quantity = Number(ingredient.quantity);
        const unit = ingredient.unit.trim();

        if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(
            `Ingredient ${index + 1} needs a name, quantity, and unit.`
          );
        }

        return { name, quantity, unit };
      });

      const instructions = form.instructions
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean);

      if (instructions.length === 0) {
        throw new Error("Add at least one instruction.");
      }

      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const nutritionFields = Object.values(form.nutrition).some((value) => value.trim());
      const nutrition = nutritionFields
        ? {
            calories: Number(form.nutrition.calories),
            protein: Number(form.nutrition.protein),
            carbs: Number(form.nutrition.carbs),
            fat: Number(form.nutrition.fat),
            ...(form.nutrition.fiber.trim()
              ? { fiber: Number(form.nutrition.fiber) }
              : {}),
          }
        : undefined;

      if (nutrition) {
        const fiber = nutrition.fiber;
        if (
          !Number.isFinite(nutrition.calories) ||
          !Number.isFinite(nutrition.protein) ||
          !Number.isFinite(nutrition.carbs) ||
          !Number.isFinite(nutrition.fat) ||
          nutrition.calories <= 0 ||
          nutrition.protein <= 0 ||
          nutrition.carbs <= 0 ||
          nutrition.fat <= 0 ||
          (fiber !== undefined && (!Number.isFinite(fiber) || fiber <= 0))
        ) {
          throw new Error(
            "Nutrition values must be numbers greater than zero when provided."
          );
        }
      }

      const recipeId = await createCustomRecipe({
        title,
        description: form.description.trim(),
        ingredients,
        instructions,
        effortLevel: form.effortLevel,
        estimatedTime,
        servings,
        tags,
        nutrition,
      });

      toast("Recipe added to your cookbook.", "success");
      onCreated(recipeId);
      onOpenChange(false);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Could not save recipe.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Add Your Recipe
          </DialogTitle>
          <DialogDescription>
            Save family staples, passed-down favorites, and your own weeknight winners.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="custom-recipe-title">Recipe title</Label>
            <Input
              id="custom-recipe-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Grandma's chicken enchiladas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-recipe-description">Short description</Label>
            <Textarea
              id="custom-recipe-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="A quick crowd-pleaser with crispy edges and a creamy filling."
              className="min-h-[90px]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custom-recipe-time">Estimated time (minutes)</Label>
              <Input
                id="custom-recipe-time"
                type="number"
                min="1"
                step="1"
                value={form.estimatedTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    estimatedTime: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-recipe-servings">Servings</Label>
              <Input
                id="custom-recipe-servings"
                type="number"
                min="1"
                step="1"
                value={form.servings}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    servings: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Effort level</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={form.effortLevel === option ? "default" : "outline"}
                  onClick={() =>
                    setForm((current) => ({ ...current, effortLevel: option }))
                  }
                  className="capitalize"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Ingredients</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add ingredient
              </Button>
            </div>

            <div className="space-y-3">
              {form.ingredients.map((ingredient, index) => (
                <div
                  key={`ingredient-${index}`}
                  className="grid gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-[1.6fr_0.8fr_0.8fr_auto]"
                >
                  <Input
                    value={ingredient.name}
                    onChange={(event) =>
                      updateIngredient(index, "name", event.target.value)
                    }
                    placeholder="Ingredient"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    value={ingredient.quantity}
                    onChange={(event) =>
                      updateIngredient(index, "quantity", event.target.value)
                    }
                    placeholder="Qty"
                  />
                  <Input
                    value={ingredient.unit}
                    onChange={(event) =>
                      updateIngredient(index, "unit", event.target.value)
                    }
                    placeholder="Unit"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    aria-label={`Remove ingredient ${index + 1}`}
                    className="h-10 w-10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-recipe-instructions">Instructions</Label>
            <Textarea
              id="custom-recipe-instructions"
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instructions: event.target.value,
                }))
              }
              placeholder={"One step per line\nBrown the chicken.\nAdd the sauce.\nBake until bubbly."}
              className="min-h-[140px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-recipe-tags">Tags</Label>
            <Input
              id="custom-recipe-tags"
              value={form.tags}
              onChange={(event) =>
                setForm((current) => ({ ...current, tags: event.target.value }))
              }
              placeholder="comfort food, weeknight, pasta"
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas so FamilyPlate can group similar meals later.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Optional nutrition (per serving)</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.nutrition.calories}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nutrition: {
                      ...current.nutrition,
                      calories: event.target.value,
                    },
                  }))
                }
                placeholder="Calories"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={form.nutrition.protein}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nutrition: {
                      ...current.nutrition,
                      protein: event.target.value,
                    },
                  }))
                }
                placeholder="Protein (g)"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={form.nutrition.carbs}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nutrition: {
                      ...current.nutrition,
                      carbs: event.target.value,
                    },
                  }))
                }
                placeholder="Carbs (g)"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={form.nutrition.fat}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nutrition: {
                      ...current.nutrition,
                      fat: event.target.value,
                    },
                  }))
                }
                placeholder="Fat (g)"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={form.nutrition.fiber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nutrition: {
                      ...current.nutrition,
                      fiber: event.target.value,
                    },
                  }))
                }
                placeholder="Fiber (g)"
                className="sm:col-span-2"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save to Cookbook"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
