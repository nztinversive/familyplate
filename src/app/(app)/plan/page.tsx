"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Ban,
  ChefHat,
  Clock3,
  Shuffle,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  cooked: "Cooked",
  skipped: "Skipped",
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
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function PlanPage() {
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});
  const recipeSuggestions = useQuery(api.queries.planner.getMyRecipeSuggestions, {});

  const generatePlan = useMutation(api.mutations.planner.generatePlaceholderPlan);
  const updateMealStatus = useMutation(api.mutations.planner.updateMealStatus);
  const swapMeal = useMutation(api.mutations.planner.swapMeal);

  const [isGenerating, setIsGenerating] = useState(false);
  const [busyMealId, setBusyMealId] = useState<string | null>(null);
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("week");

  const cookedCount = mealPlan?.meals.filter((m) => m.status === "cooked").length ?? 0;

  const usedRecipeIds = new Set(mealPlan?.meals.map((m) => m.recipe._id) ?? []);
  const recipePool = (recipeSuggestions ?? []).filter((r) => !usedRecipeIds.has(r._id));

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      await generatePlan({});
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
              ? `${formatWeekRange(mealPlan.plan.weekStartDate)} • ${cookedCount}/7 cooked`
              : "Dinner planning"
          }
          action={
            <Button
              size="sm"
              onClick={() => void handleGeneratePlan()}
              disabled={isGenerating}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : mealPlan ? "Regenerate" : "Generate Plan"}
            </Button>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4">
        {!mealPlan || !recipeSuggestions ? (
          mealPlan === undefined || recipeSuggestions === undefined ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <EmptyPlanState
              onGenerate={() => void handleGeneratePlan()}
              isGenerating={isGenerating}
            />
          )
        ) : (
          <>
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">This week&apos;s dinners</p>
                  <p className="text-sm text-muted-foreground">
                    Seven dinners ready to review, mark, or swap.
                  </p>
                </div>
                <Badge variant="secondary">{cookedCount} cooked</Badge>
              </CardContent>
            </Card>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Pool</TabsTrigger>
              </TabsList>

              <TabsContent value="week" className="space-y-3">
                {mealPlan.meals.map((meal) => {
                  const swapOptions = recipePool.filter(
                    (recipe) => recipe._id !== meal.recipe._id
                  );
                  const isBusy = busyMealId === meal._id;
                  const isSwapOpen = swappingMealId === meal._id;

                  return (
                    <Card key={meal._id} className="overflow-hidden">
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                              {formatDateLabel(meal.date)}
                            </p>
                            <h3 className="text-lg font-semibold leading-tight">
                              {meal.recipe.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {meal.recipe.description}
                            </p>
                          </div>
                          <Badge
                            variant={
                              meal.status === "cooked"
                                ? "default"
                                : meal.status === "skipped"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="shrink-0"
                          >
                            {STATUS_LABELS[meal.status]}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            <ChefHat className="mr-1 h-3 w-3" />
                            {meal.recipe.effortLevel}
                          </Badge>
                          <Badge variant="outline">
                            <Clock3 className="mr-1 h-3 w-3" />
                            {meal.recipe.estimatedTime} min
                          </Badge>
                          <Badge variant="outline">
                            Serves {meal.recipe.servings}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant={meal.status === "planned" ? "default" : "outline"}
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleStatusChange(meal._id, "planned")}
                          >
                            Planned
                          </Button>
                          <Button
                            variant={meal.status === "cooked" ? "default" : "outline"}
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleStatusChange(meal._id, "cooked")}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Cooked
                          </Button>
                          <Button
                            variant={meal.status === "skipped" ? "destructive" : "outline"}
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleStatusChange(meal._id, "skipped")}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Skip
                          </Button>
                        </div>

                        {swapOptions.length > 0 && (
                          <div className="space-y-3 rounded-lg bg-muted/40 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium">Swap dinner</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSwappingMealId(isSwapOpen ? null : meal._id)
                                }
                              >
                                <Shuffle className="mr-2 h-4 w-4" />
                                {isSwapOpen ? "Hide" : "Swap"}
                              </Button>
                            </div>

                            {isSwapOpen && (
                              <div className="grid gap-2">
                                {swapOptions.slice(0, 4).map((recipe) => (
                                  <button
                                    key={recipe._id}
                                    type="button"
                                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleSwapMeal(meal._id, recipe._id)
                                    }
                                  >
                                    <div>
                                      <p className="text-sm font-medium">
                                        {recipe.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {recipe.estimatedTime} min • {recipe.effortLevel}
                                      </p>
                                    </div>
                                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="recipes" className="space-y-3">
                {(recipeSuggestions ?? []).map((recipe) => (
                  <Card key={recipe._id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold">{recipe.title}</h3>
                          <Badge variant="secondary" className="capitalize">
                            {recipe.effortLevel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {recipe.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{recipe.estimatedTime} min</Badge>
                        <Badge variant="outline">Serves {recipe.servings}</Badge>
                        {recipe.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
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
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <CalendarDays className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No meal plan yet</h3>
      <p className="mb-6 max-w-[260px] text-sm text-muted-foreground">
        Generate a full seven-night dinner lineup, then mark meals cooked or skipped as the week moves.
      </p>
      <Button onClick={onGenerate} disabled={isGenerating}>
        <Sparkles className="mr-2 h-4 w-4" />
        {isGenerating ? "Generating..." : "Generate Plan"}
      </Button>
    </div>
  );
}
