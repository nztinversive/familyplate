"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  ArrowLeftRight,
  Ban,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  ListChecks,
  RefreshCw,
  Shuffle,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RecipeDoc = Doc<"recipeSuggestions">;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  cooked: "Cooked",
  skipped: "Skipped",
};

const STATUS_ICONS: Record<string, typeof CalendarDays> = {
  planned: CalendarDays,
  cooked: CheckCircle2,
  skipped: Ban,
};

function formatDateLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  const day = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? "";
  return `${day}, ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function formatWeekRange(weekStartDate: string) {
  const start = new Date(`${weekStartDate}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} - ${fmt(end)}`;
}

function parseDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isToday(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatIngredientAmount(quantity: number, unit: string) {
  return `${quantity} ${unit}`;
}

function formatNutritionValue(value: number, suffix: string) {
  return `${Math.round(value)}${suffix}`;
}

function getEffortIcon(level: string) {
  if (level === "easy") return "🟢";
  if (level === "medium") return "🟡";
  return "🔴";
}

export default function PlanPage() {
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});
  const recipeSuggestions = useQuery(api.queries.planner.getMyRecipeSuggestions, {});
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const generatePlanAI = useAction(api.actions.generateMealPlan.generateMealPlan);
  const generatePlanFallback = useMutation(api.mutations.planner.generatePlaceholderPlan);
  const updateMealStatus = useMutation(api.mutations.planner.updateMealStatus);
  const swapMeal = useMutation(api.mutations.planner.swapMeal);
  const swapMealDates = useMutation(api.mutations.planner.swapMealDates);
  const saveRecipe = useMutation(api.mutations.savedRecipes.saveRecipe);
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);
  const generateGroceryList = useMutation(api.mutations.grocery.generateFromPlan);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGrocery, setIsGeneratingGrocery] = useState(false);
  const [isMovingMeal, setIsMovingMeal] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [busyMealId, setBusyMealId] = useState<string | null>(null);
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const [movingMealId, setMovingMealId] = useState<Id<"plannedMeals"> | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<Id<"recipeSuggestions"> | null>(null);
  const [activeTab, setActiveTab] = useState("week");
  const [selectedRecipeId, setSelectedRecipeId] = useState<Id<"recipeSuggestions"> | null>(
    null
  );
  const [selectedRecipeSnapshot, setSelectedRecipeSnapshot] = useState<RecipeDoc | null>(null);

  const isSelectedRecipeSaved = useQuery(
    api.queries.savedRecipes.isRecipeSaved,
    selectedRecipeId ? { recipeId: selectedRecipeId } : "skip"
  );

  const cookedCount = mealPlan?.meals.filter((m) => m.status === "cooked").length ?? 0;
  const totalMeals = mealPlan?.meals.length ?? 7;
  const progressPct = totalMeals > 0 ? Math.round((cookedCount / totalMeals) * 100) : 0;

  const weekSchedule = useMemo(() => {
    if (!mealPlan?.plan) return [];

    const mealsByDate = new Map(mealPlan.meals.map((meal) => [meal.date, meal]));
    const weekStart = parseDate(mealPlan.plan.weekStartDate);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateKey = formatDateKey(date);

      return {
        dateKey,
        meal: mealsByDate.get(dateKey) ?? null,
      };
    });
  }, [mealPlan]);

  const usedRecipeIds = new Set(mealPlan?.meals.map((m) => m.recipe._id) ?? []);
  const recipePool = (recipeSuggestions ?? []).filter((r) => !usedRecipeIds.has(r._id));
  const cookbookRecipes = savedRecipes ?? [];
  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) {
      return null;
    }

    return (
      mealPlan?.meals.find((meal) => meal.recipe._id === selectedRecipeId)?.recipe ??
      recipeSuggestions?.find((recipe) => recipe._id === selectedRecipeId) ??
      savedRecipes?.find((savedRecipe) => savedRecipe.recipe._id === selectedRecipeId)?.recipe ??
      (selectedRecipeSnapshot?._id === selectedRecipeId ? selectedRecipeSnapshot : null)
    );
  }, [mealPlan, recipeSuggestions, savedRecipes, selectedRecipeId, selectedRecipeSnapshot]);
  const movingMeal = mealPlan?.meals.find((meal) => meal._id === movingMealId) ?? null;

  const openRecipeDialog = (recipe: RecipeDoc) => {
    setSelectedRecipeId(recipe._id);
    setSelectedRecipeSnapshot(recipe);
  };

  const closeRecipeDialog = () => {
    setSelectedRecipeId(null);
    setSelectedRecipeSnapshot(null);
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      if (currentUser?.householdId) {
        const today = new Date();
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + diff);
        const weekStartDate = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;

        await generatePlanAI({
          weekStartDate,
          householdId: currentUser.householdId,
        });
      } else {
        await generatePlanFallback({});
      }
    } catch (err) {
      console.error("Plan generation failed:", err);
      setGenerateError("Something went wrong generating your plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (
    mealId: Id<"plannedMeals">,
    status: "planned" | "cooked" | "skipped"
  ) => {
    setBusyMealId(mealId);
    try {
      await updateMealStatus({ mealId, status });
    } finally {
      setBusyMealId(null);
    }
  };

  const handleSwapMeal = async (
    mealId: Id<"plannedMeals">,
    recipeId: Id<"recipeSuggestions">
  ) => {
    setBusyMealId(mealId);
    try {
      await swapMeal({ mealId, recipeId });
      setSwappingMealId(null);
    } finally {
      setBusyMealId(null);
    }
  };

  return (
    <AppShell
      header={
        <PageHeader
          title="Weekly Plan"
          subtitle={
            mealPlan?.plan
              ? formatWeekRange(mealPlan.plan.weekStartDate)
              : "Dinner planning"
          }
          action={
            <Button size="sm" onClick={() => void handleGeneratePlan()} disabled={isGenerating} className="gap-2">
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Creating plan..." : mealPlan ? "Regenerate" : "Generate"}
            </Button>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4 page-transition">
        {/* Error banner */}
        {generateError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 animate-fade-in">
            <p className="text-sm text-destructive font-medium">{generateError}</p>
            <button
              type="button"
              className="text-xs text-destructive/70 underline mt-1"
              onClick={() => setGenerateError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Generating overlay */}
        {isGenerating && (
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center animate-fade-in">
            <div className="mb-3 flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground/80">Creating your personalized plan...</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Analyzing your pantry, preferences, and past feedback
            </p>
          </div>
        )}

        {!mealPlan || !recipeSuggestions ? (
          mealPlan === undefined || recipeSuggestions === undefined ? (
            <div className="space-y-3 pt-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton-shimmer h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <EmptyPlanState
              onGenerate={() => void handleGeneratePlan()}
              isGenerating={isGenerating}
            />
          )
        ) : (
          <>
            {/* Week progress */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/8 to-primary/3 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground/80">This week&apos;s progress</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-accent" />
                  <span className="text-sm font-bold text-accent">{cookedCount}/{totalMeals}</span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-background/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">{cookedCount} cooked</span>
                <span className="text-xs text-muted-foreground">{mealPlan.meals.filter(m => m.status === "skipped").length} skipped</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 gap-2"
                disabled={isGeneratingGrocery}
                onClick={async () => {
                  setIsGeneratingGrocery(true);
                  try {
                    await generateGroceryList({});
                  } catch (err) {
                    console.error("Grocery list generation failed:", err);
                  } finally {
                    setIsGeneratingGrocery(false);
                  }
                }}
              >
                <ListChecks className="h-4 w-4" />
                {isGeneratingGrocery ? "Generating..." : "Generate Grocery List"}
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Pool</TabsTrigger>
              </TabsList>

              <TabsContent value="week" className="space-y-3">
                {weekSchedule.map(({ dateKey, meal }, index) => {
                  const today = isToday(dateKey);

                  if (!meal) {
                    return (
                      <Card
                        key={dateKey}
                        className={`overflow-hidden border-dashed opacity-0 animate-fade-in stagger-${index + 1}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                  {formatDateLabel(dateKey)}
                                </p>
                                {today && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Today</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                No meal assigned
                              </p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                              <UtensilsCrossed className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  const swapOptions = recipePool.filter(
                    (recipe) => recipe._id !== meal.recipe._id
                  );
                  const isBusy = busyMealId === meal._id;
                  const isSwapOpen = swappingMealId === meal._id;
                  const StatusIcon = STATUS_ICONS[meal.status] ?? CalendarDays;

                  return (
                    <Card
                      key={meal._id}
                      className={`overflow-hidden opacity-0 animate-fade-in card-interactive stagger-${index + 1} ${
                        meal.status === "cooked"
                          ? "status-cooked"
                          : meal.status === "skipped"
                            ? "status-skipped"
                            : today
                              ? "status-planned ring-1 ring-primary/20"
                              : "status-planned"
                      }`}
                    >
                      <CardContent className="p-0">
                        {/* Main content area */}
                        <button
                          type="button"
                          className="w-full p-4 pb-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
                          onClick={() => setSelectedRecipeId(meal.recipe._id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                  {formatDateLabel(meal.date)}
                                </p>
                                {today && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0">Today</Badge>
                                )}
                              </div>
                              <h3 className="text-lg font-semibold leading-tight tracking-tight">
                                {meal.recipe.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {meal.recipe.description}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-4" />
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                              {getEffortIcon(meal.recipe.effortLevel)} {meal.recipe.effortLevel}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                              <Clock3 className="h-3 w-3" />
                              {meal.recipe.estimatedTime}m
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                              Serves {meal.recipe.servings}
                            </span>
                          </div>
                        </button>

                        {/* Action bar */}
                        <div className="flex items-center gap-1 px-3 pb-3 pt-1">
                          <div className="flex items-center gap-1 flex-1">
                            {(["planned", "cooked", "skipped"] as const).map((status) => {
                              const isActive = meal.status === status;
                              const Icon = STATUS_ICONS[status];
                              return (
                                <button
                                  key={status}
                                  disabled={isBusy}
                                  onClick={() => void handleStatusChange(meal._id, status)}
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                                    isActive
                                      ? status === "cooked"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : status === "skipped"
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-muted/60"
                                  }`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {STATUS_LABELS[status]}
                                </button>
                              );
                            })}
                          </div>
                          {swapOptions.length > 0 && (
                            <button
                              onClick={() =>
                                setSwappingMealId(isSwapOpen ? null : meal._id)
                              }
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                            >
                              <Shuffle className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Swap panel */}
                        {isSwapOpen && swapOptions.length > 0 && (
                          <div className="border-t bg-muted/20 px-3 py-3 animate-fade-in">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Swap with:</p>
                            <div className="grid gap-1.5">
                              {swapOptions.slice(0, 4).map((recipe) => (
                                <button
                                  key={recipe._id}
                                  type="button"
                                  className="flex items-center justify-between rounded-xl border bg-background px-3 py-2.5 text-left transition-all hover:bg-accent/5 hover:border-primary/20 disabled:opacity-50 card-interactive"
                                  disabled={isBusy}
                                  onClick={() => void handleSwapMeal(meal._id, recipe._id)}
                                >
                                  <div>
                                    <p className="text-sm font-medium">{recipe.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {getEffortIcon(recipe.effortLevel)} {recipe.estimatedTime}m
                                    </p>
                                  </div>
                                  <RefreshCw className="h-3.5 w-3.5 text-primary/60" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="recipes" className="space-y-3">
                {(recipeSuggestions ?? []).map((recipe, index) => (
                  <Card
                    key={recipe._id}
                    className={`overflow-hidden opacity-0 animate-fade-in card-interactive stagger-${index + 1}`}
                  >
                    <CardContent className="p-4">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedRecipeId(recipe._id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-semibold leading-tight">{recipe.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {recipe.description}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-xs font-medium capitalize shrink-0">
                            {getEffortIcon(recipe.effortLevel)} {recipe.effortLevel}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                            <Clock3 className="h-3 w-3" />
                            {recipe.estimatedTime}m
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                            Serves {recipe.servings}
                          </span>
                          {recipe.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog
        open={selectedRecipeId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRecipeId(null);
        }}
      >
        <DialogContent className="top-auto bottom-0 left-0 right-0 max-h-[90vh] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-t-3xl rounded-b-none border-x-0 border-b-0 p-0 sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border animate-slide-in-bottom">
          {selectedRecipe && (
            <>
              <DialogHeader className="border-b px-5 pb-4 pt-6 sm:px-6">
                <DialogTitle className="pr-8 text-left text-xl tracking-tight">
                  {selectedRecipe.title}
                </DialogTitle>
                <DialogDescription className="pr-8 text-left">
                  {selectedRecipe.description}
                </DialogDescription>
                <div className="flex flex-wrap gap-2 pt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium capitalize">
                    {getEffortIcon(selectedRecipe.effortLevel)} {selectedRecipe.effortLevel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium">
                    <Clock3 className="h-3 w-3" />
                    {selectedRecipe.estimatedTime} min
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium">
                    Serves {selectedRecipe.servings}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Ingredients
                  </h4>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient) => (
                      <div
                        key={`${ingredient.name}-${ingredient.unit}-${ingredient.quantity}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3.5 py-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            ingredient.inPantry ? "bg-primary" : "bg-muted-foreground/25"
                          }`} />
                          <div>
                            <p className="text-sm font-medium">{ingredient.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatIngredientAmount(ingredient.quantity, ingredient.unit)}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          ingredient.inPantry
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/10 text-accent"
                        }`}>
                          {ingredient.inPantry ? "Have it" : "Need it"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Instructions
                  </h4>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions.map((step, index) => (
                      <li
                        key={`${selectedRecipe._id}-step-${index + 1}`}
                        className="flex items-start gap-3 rounded-xl bg-muted/30 px-3.5 py-3"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-relaxed pt-0.5">{step}</p>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="space-y-3 pb-1">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </section>
              </div>

              <div className="border-t px-5 py-4 sm:px-6">
                <DialogClose asChild>
                  <Button variant="outline" className="w-full">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function EmptyPlanState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in-up">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5">
        <CalendarDays className="h-11 w-11 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight">No meal plan yet</h3>
      <p className="mb-8 max-w-[280px] text-sm text-muted-foreground leading-relaxed">
        Generate a full seven-night dinner lineup, then mark meals cooked or skipped as the
        week moves.
      </p>
      <Button onClick={onGenerate} disabled={isGenerating} size="lg" className="gap-2">
        {isGenerating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isGenerating ? "Creating plan..." : "Generate Plan"}
      </Button>
    </div>
  );
}
