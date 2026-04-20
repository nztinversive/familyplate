"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  ArrowDownToLine,
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  Shuffle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MealFeedbackCard } from "@/components/feedback/MealFeedbackCard";
import { RecipeFeedbackSummary } from "@/components/feedback/RecipeFeedbackSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatIngredientAmount(quantity: number, unit: string) {
  return `${quantity} ${unit}`;
}

export default function MealDetailPage() {
  const params = useParams<{ mealId: string }>();
  const mealId = params.mealId as Id<"plannedMeals">;
  const mealDetail = useQuery(api.queries.planner.getMealDetail, { mealId });
  const swapAction = useAction(api.actions.swapMeal.swapMeal);
  const swapMeal = useMutation(api.mutations.planner.swapMeal);

  const [isRefreshingAlternatives, setIsRefreshingAlternatives] = useState(false);
  const [isApplyingSwap, setIsApplyingSwap] =
    useState<Id<"recipeSuggestions"> | null>(null);

  const handleRefreshAlternatives = async () => {
    if (!mealDetail?.meal) return;
    setIsRefreshingAlternatives(true);
    try {
      await swapAction({ mealId: mealDetail.meal._id });
    } finally {
      setIsRefreshingAlternatives(false);
    }
  };

  const handleApplyAlternative = async (recipeId: Id<"recipeSuggestions">) => {
    if (!mealDetail?.meal) return;
    setIsApplyingSwap(recipeId);
    try {
      await swapMeal({ mealId: mealDetail.meal._id, recipeId });
    } finally {
      setIsApplyingSwap(null);
    }
  };

  const pantryMatchCount = (mealDetail?.recipe?.ingredients ?? []).filter(
    (ingredient) => isIngredientAvailable(ingredient)
  ).length;
  const ingredientCount = mealDetail?.recipe?.ingredients.length ?? 0;
  const canSwapMeal = !!mealDetail && mealDetail.meal.status !== "cooked";

  return (
    <AppShell
      header={
        <PageHeader
          title="Recipe details"
          subtitle={
            mealDetail
              ? `${formatDateLabel(mealDetail.meal.date)} - ${mealDetail.plan?.weekStartDate}`
              : "Loading dinner details"
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/plan">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4">
        {mealDetail === undefined ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !mealDetail ? (
          <EmptyState />
        ) : (
          <>
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {mealDetail.meal.status}
                  </p>
                  <h1 className="text-2xl font-bold leading-tight">
                    {mealDetail.recipe.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {mealDetail.recipe.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    <ChefHat className="mr-1 h-3 w-3" />
                    {mealDetail.recipe.effortLevel}
                  </Badge>
                  <Badge variant="outline">
                    <Clock3 className="mr-1 h-3 w-3" />
                    {mealDetail.recipe.estimatedTime} min
                  </Badge>
                  <Badge variant="outline">Serves {mealDetail.recipe.servings}</Badge>
                  {ingredientCount > 0 && (
                    <Badge
                      variant={
                        pantryMatchCount === ingredientCount ? "secondary" : "outline"
                      }
                    >
                      <ArrowDownToLine className="mr-1 h-3 w-3" />
                      {pantryMatchCount}/{ingredientCount} pantry matches
                    </Badge>
                  )}
                </div>

                {mealDetail.recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mealDetail.recipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <RecipeFeedbackSummary recipeId={mealDetail.recipe._id} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    Ingredients
                  </h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRefreshAlternatives()}
                    disabled={isRefreshingAlternatives || !canSwapMeal}
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    {isRefreshingAlternatives ? "Refreshing..." : "Swap options"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {mealDetail.recipe.ingredients.map((ingredient) => {
                    const isAvailable = isIngredientAvailable(ingredient);

                    return (
                      <div
                        key={`${ingredient.name}-${ingredient.unit}-${ingredient.quantity}`}
                        className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 px-3 py-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{ingredient.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatIngredientAmount(ingredient.quantity, ingredient.unit)}
                          </p>
                        </div>
                        <Badge
                          variant={isAvailable ? "secondary" : "outline"}
                          className="shrink-0"
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              In pantry
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-3 w-3" />
                              Need to buy
                            </>
                          )}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Instructions
                </h2>
                <ol className="space-y-3">
                  {mealDetail.recipe.instructions.map((step, index) => (
                    <li
                      key={`${mealDetail.recipe._id}-step-${index + 1}`}
                      className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Alternative dinners
                </h2>
                {!canSwapMeal ? (
                  <p className="text-sm text-muted-foreground">
                    Cooked meals are locked to preserve your dinner history and pantry usage.
                  </p>
                ) : mealDetail.alternatives.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tap <strong>Swap options</strong> to generate replacement dinner ideas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mealDetail.alternatives.map((alternative) => (
                      <div
                        key={alternative._id}
                        className="space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{alternative.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {alternative.estimatedTime} min - {alternative.effortLevel}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={isApplyingSwap === alternative._id || !canSwapMeal}
                            onClick={() => void handleApplyAlternative(alternative._id)}
                          >
                            {isApplyingSwap === alternative._id ? "Applying..." : "Use"}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alternative.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {mealDetail && mealDetail.meal.status === "cooked" && (
          <MealFeedbackCard recipeId={mealDetail.recipe._id} />
        )}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <XCircle className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Meal not found</h3>
      <p className="mb-4 max-w-[260px] text-sm text-muted-foreground">
        This meal no longer exists or is not in your household meal plan.
      </p>
      <Button asChild variant="outline">
        <Link href="/plan">Return to plan</Link>
      </Button>
    </div>
  );
}
