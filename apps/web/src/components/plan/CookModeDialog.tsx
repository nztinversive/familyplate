"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Leaf, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";

type Recipe = Doc<"recipeSuggestions">;

export function CookModeDialog({
  open,
  recipe,
  isFinishing,
  onOpenChange,
  onStepViewed,
  onFinishCooking,
}: {
  open: boolean;
  recipe: Recipe | null;
  isFinishing: boolean;
  onOpenChange: (open: boolean) => void;
  onStepViewed?: (stepIndex: number) => void;
  onFinishCooking: (leftoverNote?: string) => Promise<void>;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [leftoverNote, setLeftoverNote] = useState("");
  const lastTrackedStep = useRef<number | null>(null);

  const steps = recipe?.instructions ?? [];
  const totalSteps = Math.max(steps.length, 1);
  const isFinalStep = stepIndex >= totalSteps - 1;
  const pantryCount = useMemo(
    () => recipe?.ingredients.filter(isIngredientAvailable).length ?? 0,
    [recipe]
  );

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setLeftoverNote("");
    lastTrackedStep.current = null;
  }, [open, recipe?._id]);

  useEffect(() => {
    if (!open) return;
    if (lastTrackedStep.current === stepIndex) return;
    lastTrackedStep.current = stepIndex;
    onStepViewed?.(stepIndex + 1);
  }, [onStepViewed, open, stepIndex]);

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cook Mode</DialogTitle>
          <DialogDescription>{recipe.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline">
                <Clock3 className="mr-1 h-3 w-3" />
                {recipe.estimatedTime} min
              </Badge>
              <Badge variant="outline">
                <Users className="mr-1 h-3 w-3" />
                Serves {recipe.servings}
              </Badge>
              <Badge variant="outline">
                <Leaf className="mr-1 h-3 w-3" />
                {pantryCount}/{recipe.ingredients.length} in pantry
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{recipe.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-xl border border-border p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ingredients
              </h3>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={`${ingredient.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-2 text-sm"
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        isIngredientAvailable(ingredient)
                          ? "text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                    <span>
                      {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {stepIndex + 1} of {totalSteps}
                </h3>
                <Badge variant="secondary">
                  {Math.round(((stepIndex + 1) / totalSteps) * 100)}%
                </Badge>
              </div>
              <p className="text-xl font-semibold leading-8">
                {steps[stepIndex] ?? "Cook this recipe using the ingredients listed."}
              </p>

              {isFinalStep ? (
                <div className="mt-5 rounded-xl bg-muted/50 p-3">
                  <label className="text-sm font-semibold">Save leftovers?</label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional. This adds a fridge pantry item for future planning.
                  </p>
                  <Input
                    value={leftoverNote}
                    onChange={(event) => setLeftoverNote(event.target.value)}
                    disabled={isFinishing}
                    placeholder={`Example: 2 servings of ${recipe.title}`}
                    className="mt-3"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={stepIndex === 0 || isFinishing}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {isFinalStep ? (
              <Button
                className="flex-1"
                disabled={isFinishing}
                onClick={() => void onFinishCooking(leftoverNote.trim() || undefined)}
              >
                {isFinishing ? "Finishing..." : "Finish Cooking"}
              </Button>
            ) : (
              <Button
                className="flex-1"
                disabled={isFinishing}
                onClick={() =>
                  setStepIndex((current) => Math.min(totalSteps - 1, current + 1))
                }
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
