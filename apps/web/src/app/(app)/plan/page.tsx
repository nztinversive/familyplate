"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc, Id } from "@familyplate/convex/_generated/dataModel";
import {
  ArrowLeftRight,
  Ban,
  BookOpen,
  CheckSquare,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Flame,
  Heart,
  Home,
  ListChecks,
  PackageCheck,
  RefreshCw,
  Save,
  Share2,
  ShoppingCart,
  Shuffle,
  Smile,
  Sparkles,
  UtensilsCrossed,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { OnboardingGuide } from "@/components/layout/OnboardingGuide";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomRecipeDialog } from "@/components/plan/CustomRecipeDialog";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";
import { track } from "@/lib/analytics";
import * as Sentry from "@sentry/nextjs";

type RecipeDoc = Doc<"recipeSuggestions">;
type ProfileDoc = Doc<"userProfiles">;
type PlannedMeal = Doc<"plannedMeals"> & {
  recipe: RecipeDoc;
  alternatives: RecipeDoc[];
};
type MealAudience = "whole" | "me" | "selected";
type AdjustmentType =
  | "swap"
  | "faster"
  | "kid_friendly"
  | "use_pantry"
  | "avoid"
  | "regenerate_day";
type GroceryReviewItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

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

function getRecipeGradient(tags: string[]) {
  const t = tags.join(" ").toLowerCase();
  if (t.includes("asian") || t.includes("stir") || t.includes("thai") || t.includes("chinese") || t.includes("japanese"))
    return "bg-gradient-to-br from-red-400/30 via-orange-300/20 to-yellow-200/30";
  if (t.includes("italian") || t.includes("pasta") || t.includes("pizza") || t.includes("mediterranean"))
    return "bg-gradient-to-br from-green-400/25 via-red-300/15 to-yellow-200/25";
  if (t.includes("mexican") || t.includes("taco") || t.includes("burrito") || t.includes("latin"))
    return "bg-gradient-to-br from-yellow-400/30 via-red-400/20 to-green-300/25";
  if (t.includes("indian") || t.includes("curry") || t.includes("spic"))
    return "bg-gradient-to-br from-orange-400/30 via-yellow-300/20 to-red-300/25";
  if (t.includes("seafood") || t.includes("fish") || t.includes("shrimp"))
    return "bg-gradient-to-br from-blue-300/25 via-cyan-200/20 to-teal-200/25";
  if (t.includes("comfort") || t.includes("soup") || t.includes("stew"))
    return "bg-gradient-to-br from-amber-300/30 via-orange-200/20 to-yellow-100/25";
  if (t.includes("salad") || t.includes("healthy") || t.includes("vegetarian") || t.includes("vegan"))
    return "bg-gradient-to-br from-emerald-300/25 via-green-200/20 to-lime-200/25";
  if (t.includes("bbq") || t.includes("grill"))
    return "bg-gradient-to-br from-red-500/25 via-orange-400/20 to-amber-300/25";
  return "bg-gradient-to-br from-primary/15 via-primary/8 to-accent/10";
}

function getRecipeEmoji(tags: string[]) {
  const t = tags.join(" ").toLowerCase();
  if (t.includes("asian") || t.includes("stir") || t.includes("chinese") || t.includes("japanese")) return "🍜";
  if (t.includes("italian") || t.includes("pasta")) return "🍝";
  if (t.includes("pizza")) return "🍕";
  if (t.includes("mexican") || t.includes("taco")) return "🌮";
  if (t.includes("indian") || t.includes("curry")) return "🍛";
  if (t.includes("seafood") || t.includes("fish")) return "🐟";
  if (t.includes("salad") || t.includes("healthy")) return "🥗";
  if (t.includes("bbq") || t.includes("grill")) return "🔥";
  if (t.includes("soup") || t.includes("stew")) return "🍲";
  if (t.includes("chicken")) return "🍗";
  if (t.includes("beef") || t.includes("steak")) return "🥩";
  if (t.includes("breakfast")) return "🍳";
  return "🍽️";
}

function getRecipeSourceLabel(source: RecipeDoc["source"]) {
  if (source === "custom") return "Custom";
  if (source === "curated") return "Curated";
  return "AI";
}

function getErrorMessage(err: unknown) {
  if (err instanceof ConvexError) return err.data as string;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

function inferGroceryCategory(name: string) {
  const normalized = name.toLowerCase();

  if (
    normalized.includes("lettuce") ||
    normalized.includes("tomato") ||
    normalized.includes("potato") ||
    normalized.includes("carrot") ||
    normalized.includes("onion") ||
    normalized.includes("broccoli") ||
    normalized.includes("pepper") ||
    normalized.includes("cucumber") ||
    normalized.includes("avocado") ||
    normalized.includes("mushroom") ||
    normalized.includes("parsley") ||
    normalized.includes("ginger") ||
    normalized.includes("pea")
  ) {
    return "Produce";
  }

  if (
    normalized.includes("beef") ||
    normalized.includes("chicken") ||
    normalized.includes("salmon") ||
    normalized.includes("pork") ||
    normalized.includes("turkey")
  ) {
    return "Meat";
  }

  if (
    normalized.includes("cheese") ||
    normalized.includes("milk") ||
    normalized.includes("cream") ||
    normalized.includes("egg") ||
    normalized.includes("yogurt")
  ) {
    return "Dairy";
  }

  if (
    normalized.includes("pasta") ||
    normalized.includes("rice") ||
    normalized.includes("noodle") ||
    normalized.includes("bread") ||
    normalized.includes("bun") ||
    normalized.includes("tortilla")
  ) {
    return "Grains";
  }

  if (
    normalized.includes("sauce") ||
    normalized.includes("seasoning") ||
    normalized.includes("oil") ||
    normalized.includes("vinegar") ||
    normalized.includes("spice")
  ) {
    return "Condiments";
  }

  return "Other";
}

export default function PlanPage() {
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});
  const recipeSuggestions = useQuery(api.queries.planner.getMyRecipeSuggestions, {});
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const subscription = useQuery(api.subscriptions.getMySubscription, {});
  const mealPlanWeeks = useQuery(api.queries.planner.getMyMealPlanWeeks, {});
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const myProfile = useQuery(api.queries.profiles.getMyProfile, {});
  const householdProfiles = useQuery(
    api.queries.profiles.getProfiles,
    currentUser?.householdId ? { householdId: currentUser.householdId } : "skip"
  );
  const generatePlanAI = useAction(api.actions.generateMealPlan.generateMealPlan);
  const generateMealAdjustment = useAction(api.actions.swapMeal.swapMeal);
  const generatePlanFallback = useMutation(api.mutations.planner.generatePlaceholderPlan);
  const updateMealStatus = useMutation(api.mutations.planner.updateMealStatus);
  const swapMeal = useMutation(api.mutations.planner.swapMeal);
  const swapMealDates = useMutation(api.mutations.planner.swapMealDates);
  const saveRecipe = useMutation(api.mutations.savedRecipes.saveRecipe);
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);
  const generateGroceryList = useMutation(api.mutations.grocery.generateFromPlan);
  const addGroceryItem = useMutation(api.mutations.grocery.addMyCustomItem);
  const updateProfile = useMutation(api.mutations.profiles.updateProfile);
  const { toast } = useToast();

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
  const [viewingWeekIndex, setViewingWeekIndex] = useState(0);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showAddRecipeDialog, setShowAddRecipeDialog] = useState(false);
  const [showGroceryReview, setShowGroceryReview] = useState(false);
  const [addingToGrocery, setAddingToGrocery] = useState(false);
  const [mealAudience, setMealAudience] = useState<MealAudience>("whole");
  const [selectedProfileIds, setSelectedProfileIds] = useState<Id<"userProfiles">[]>([]);
  const [adjustingMealId, setAdjustingMealId] = useState<string | null>(null);
  const [adjustmentPanelMealId, setAdjustmentPanelMealId] = useState<string | null>(null);
  const [avoidText, setAvoidText] = useState("");
  const [savedAvoidText, setSavedAvoidText] = useState("");

  // Week navigation
  const sortedWeeks = useMemo(() => {
    return (mealPlanWeeks ?? []).sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }, [mealPlanWeeks]);
  const viewingWeekDate = sortedWeeks[viewingWeekIndex]?.weekStartDate ?? null;
  const viewingPastWeek = viewingWeekIndex > 0 && viewingWeekDate;
  const pastWeekPlan = useQuery(
    api.queries.planner.getMyMealPlanByWeek,
    viewingPastWeek ? { weekStartDate: viewingWeekDate } : "skip"
  );
  const activeMealPlan = viewingPastWeek ? pastWeekPlan : mealPlan;
  const canGoBack = viewingWeekIndex < sortedWeeks.length - 1;
  const canGoForward = viewingWeekIndex > 0;

  const isSelectedRecipeSaved = useQuery(
    api.queries.savedRecipes.isRecipeSaved,
    selectedRecipeId ? { recipeId: selectedRecipeId } : "skip"
  );

  // Use activeMealPlan for display (supports past week navigation)
  const displayPlan = activeMealPlan;
  const cookedCount = displayPlan?.meals.filter((m) => m.status === "cooked").length ?? 0;
  const totalMeals = displayPlan?.meals.length ?? 7;
  const progressPct = totalMeals > 0 ? Math.round((cookedCount / totalMeals) * 100) : 0;

  const weekSchedule = useMemo(() => {
    if (!displayPlan?.plan) return [];

    const mealsByDate = new Map(displayPlan.meals.map((meal) => [meal.date, meal]));
    const weekStart = parseDate(displayPlan.plan.weekStartDate);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateKey = formatDateKey(date);

      return {
        dateKey,
        meal: mealsByDate.get(dateKey) ?? null,
      };
    });
  }, [displayPlan]);

  const usedRecipeIds = new Set(displayPlan?.meals.map((m) => m.recipe._id) ?? []);
  const recipePool = (recipeSuggestions ?? []).filter((r) => !usedRecipeIds.has(r._id));
  const cookbookRecipes = savedRecipes ?? [];
  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) {
      return null;
    }

    return (
      displayPlan?.meals.find((meal) => meal.recipe._id === selectedRecipeId)?.recipe ??
      recipeSuggestions?.find((recipe) => recipe._id === selectedRecipeId) ??
      savedRecipes?.find((savedRecipe) => savedRecipe.recipe._id === selectedRecipeId)?.recipe ??
      (selectedRecipeSnapshot?._id === selectedRecipeId ? selectedRecipeSnapshot : null)
    );
  }, [displayPlan, recipeSuggestions, savedRecipes, selectedRecipeId, selectedRecipeSnapshot]);
  const movingMeal = displayPlan?.meals.find((meal) => meal._id === movingMealId) ?? null;
  const audienceProfileIds = useMemo(() => {
    if (mealAudience === "whole") return undefined;
    if (mealAudience === "me") {
      return currentUser?.profileId ? [currentUser.profileId] : [];
    }
    return selectedProfileIds;
  }, [currentUser?.profileId, mealAudience, selectedProfileIds]);
  const hasAudienceSelection =
    mealAudience === "whole" || (audienceProfileIds?.length ?? 0) > 0;
  const audienceLabel =
    mealAudience === "whole"
      ? "whole family"
      : mealAudience === "me"
        ? "just me"
        : `${audienceProfileIds?.length ?? 0} selected`;
  const groceryReview = useMemo(() => {
    const missing = new Map<string, GroceryReviewItem>();
    const pantryCovered: GroceryReviewItem[] = [];

    for (const meal of (displayPlan?.meals ?? []) as PlannedMeal[]) {
      if (meal.status !== "planned") continue;

      for (const ingredient of meal.recipe.ingredients) {
        const category = inferGroceryCategory(ingredient.name);

        if (isIngredientAvailable(ingredient)) {
          pantryCovered.push({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category,
          });
          continue;
        }

        const key = `${ingredient.name.trim().toLowerCase()}::${ingredient.unit.trim().toLowerCase()}`;
        const existing = missing.get(key);
        missing.set(key, {
          name: existing?.name ?? ingredient.name,
          quantity:
            Math.round(((existing?.quantity ?? 0) + ingredient.quantity) * 100) /
            100,
          unit: ingredient.unit,
          category: existing?.category ?? category,
        });
      }
    }

    const missingItems = Array.from(missing.values()).sort((a, b) =>
      a.category === b.category
        ? a.name.localeCompare(b.name)
        : a.category.localeCompare(b.category)
    );
    const groupedMissing = new Map<string, GroceryReviewItem[]>();

    for (const item of missingItems) {
      if (!groupedMissing.has(item.category)) groupedMissing.set(item.category, []);
      groupedMissing.get(item.category)!.push(item);
    }

    return {
      missingItems,
      groupedMissing: Array.from(groupedMissing.entries()),
      pantryCovered,
    };
  }, [displayPlan?.meals]);

  const openRecipeDialog = (recipe: RecipeDoc) => {
    setSelectedRecipeId(recipe._id);
    setSelectedRecipeSnapshot(recipe);
  };

  const closeRecipeDialog = () => {
    setSelectedRecipeId(null);
    setSelectedRecipeSnapshot(null);
  };

  const handleGeneratePlan = async () => {
    if (subscription && !subscription.canGenerate) {
      setGenerateError(`You've used ${subscription.plansUsed}/${subscription.plansLimit} free plans this month. Upgrade to Family for unlimited plans.`);
      return;
    }
    if (!hasAudienceSelection) {
      setGenerateError("Choose at least one eater for this plan.");
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);
    try {
      track("meal_plan_generation_started", {
        source: displayPlan ? "regenerate" : "empty_state",
        tier: subscription?.tier ?? "unknown",
        audience: mealAudience,
        selected_eater_count: audienceProfileIds?.length ?? householdProfiles?.length ?? 0,
      });
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
          profileIds: audienceProfileIds,
        });
        track("meal_plan_generated", {
          source: "ai",
          week_start_date: weekStartDate,
          tier: subscription?.tier ?? "unknown",
          audience: mealAudience,
          selected_eater_count: audienceProfileIds?.length ?? householdProfiles?.length ?? 0,
        });
        toast(`Fresh weekly plan generated for ${audienceLabel}.`, "success");
      } else {
        await generatePlanFallback({});
        track("meal_plan_generated", {
          source: "curated_fallback",
          tier: subscription?.tier ?? "unknown",
        });
      }
    } catch (err) {
      track("meal_plan_generation_failed", {
        tier: subscription?.tier ?? "unknown",
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "plan", action: "generate_plan", platform: "web" },
      });
      console.error("Plan generation failed:", err);
      setGenerateError(getErrorMessage(err));
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
      track("meal_status_updated", {
        status,
        source: "weekly_plan",
      });
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
      track("cta_clicked", {
        location: "weekly_plan",
        label: "swap_meal",
      });
      track("meal_swapped", {
        source: "weekly_plan",
        meal_id: mealId,
      });
      setSwappingMealId(null);
    } finally {
      setBusyMealId(null);
    }
  };

  const handleMoveMealSelect = async (targetMealId: Id<"plannedMeals">) => {
    if (!movingMealId || movingMealId === targetMealId) {
      setMovingMealId(null);
      return;
    }
    setBusyMealId(movingMealId);
    try {
      await swapMealDates({ mealId: movingMealId, targetMealId });
      setMovingMealId(null);
    } finally {
      setBusyMealId(null);
    }
  };

  const handleSharePlan = async () => {
    if (!displayPlan?.plan || !displayPlan.meals.length) return;

    const weekRange = formatWeekRange(displayPlan.plan.weekStartDate);
    const lines = [
      `🍽️ FamilyPlate — ${weekRange}`,
      "",
      ...displayPlan.meals.map((meal) => {
        const dayLabel = formatDateLabel(meal.date);
        const time = `${meal.recipe.estimatedTime}m`;
        return `${dayLabel}: ${meal.recipe.title} (${time})`;
      }),
      "",
      "Generated by FamilyPlate",
    ];
    const text = lines.join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `Meal Plan — ${weekRange}`, text });
        track("plan_shared", {
          method: "native_share",
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      track("plan_shared", {
        method: "clipboard",
      });
      toast("Plan copied to clipboard!", "success");
    } catch {
      toast("Unable to share", "error");
    }
  };

  const handleToggleSavedRecipe = async (recipeId: Id<"recipeSuggestions">) => {
    setSavingRecipeId(recipeId);
    try {
      const isSaved = savedRecipes?.some((s) => s.recipeId === recipeId);
      if (isSaved) {
        await unsaveRecipe({ recipeId });
        track("recipe_unsaved", {
          source: "weekly_plan",
        });
      } else {
        await saveRecipe({ recipeId });
        track("recipe_saved", {
          source: "weekly_plan",
        });
      }
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleAddMissingToGrocery = async (ingredients: Array<{ name: string; quantity: number; unit: string; inPantry: boolean }>) => {
    const missing = ingredients.filter((ing) => !isIngredientAvailable(ing));
    if (missing.length === 0) return;
    setAddingToGrocery(true);
    try {
      for (const ing of missing) {
        await addGroceryItem({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: "Other",
        });
      }
      track("grocery_item_added", {
        source: "plan_missing_ingredients",
        count: missing.length,
      });
      track("missing_ingredients_added_to_grocery", {
        source: "weekly_plan",
        count: missing.length,
      });
      toast(`Added ${missing.length} item${missing.length > 1 ? "s" : ""} to grocery list`, "success");
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "plan", action: "add_missing_to_grocery", platform: "web" },
      });
      console.error("Failed to add to grocery list:", err);
      toast("Failed to add items to grocery list", "error");
    } finally {
      setAddingToGrocery(false);
    }
  };

  const handleGenerateGroceries = async (source = "weekly_plan") => {
    setIsGeneratingGrocery(true);
    try {
      await generateGroceryList({});
      track("grocery_list_generated", {
        source,
      });
      track("grocery_items_added_from_plan", {
        source,
        item_count: groceryReview.missingItems.length,
        pantry_covered_count: groceryReview.pantryCovered.length,
      });
      setShowGroceryReview(false);
      toast("Grocery list updated from your planned dinners.", "success");
    } catch (err) {
      track("grocery_list_generation_failed", {
        source,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "grocery", action: "generate_from_plan", platform: "web" },
      });
      toast("Failed to generate grocery list", "error");
    } finally {
      setIsGeneratingGrocery(false);
    }
  };

  const handleMealAdjustment = async (
    meal: PlannedMeal,
    adjustmentType: AdjustmentType
  ) => {
    const trimmedAvoidText = avoidText.trim();
    if (adjustmentType === "avoid" && !trimmedAvoidText) {
      toast("Add what you want FamilyPlate to avoid first.", "error");
      return;
    }

    setAdjustingMealId(`${meal._id}:${adjustmentType}`);
    try {
      track("plan_adjustment_started", {
        adjustment_type: adjustmentType,
        meal_id: meal._id,
        has_avoid_text: !!trimmedAvoidText,
      });

      const result = await generateMealAdjustment({
        mealId: meal._id,
        adjustmentType,
        avoidText: adjustmentType === "avoid" ? trimmedAvoidText : undefined,
      });

      if (adjustmentType === "regenerate_day") {
        track("plan_regenerated", {
          source: "weekly_plan",
          meal_id: meal._id,
        });
        toast(
          result.appliedRecipeTitle
            ? `Regenerated ${formatDateLabel(meal.date)}: ${result.appliedRecipeTitle}.`
            : "Dinner regenerated for that day.",
          "success"
        );
        setAdjustmentPanelMealId(null);
      } else {
        toast("Fresh alternatives are ready below.", "success");
        setSwappingMealId(meal._id);
      }
    } catch (err) {
      track("meal_plan_generation_failed", {
        source: "meal_adjustment",
        adjustment_type: adjustmentType,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "plan", action: "adjust_meal", platform: "web" },
      });
      toast(getErrorMessage(err), "error");
    } finally {
      setAdjustingMealId(null);
    }
  };

  const handleSaveAvoidPreference = async () => {
    const trimmed = avoidText.trim();
    if (!trimmed || !myProfile) return;

    try {
      const nextDislikes = Array.from(
        new Set([...(myProfile.dislikes ?? []), trimmed])
      );
      await updateProfile({
        profileId: myProfile._id,
        dislikes: nextDislikes,
      });
      track("preference_saved_from_feedback", {
        source: "plan_adjustment",
        preference_type: "dislike",
      });
      setSavedAvoidText(trimmed);
      toast(`Saved "${trimmed}" to your dislikes for future plans.`, "success");
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "profile", action: "save_avoid_preference", platform: "web" },
      });
      toast(getErrorMessage(err), "error");
    }
  };

  const handleCustomRecipeCreated = () => {
    setActiveTab("cookbook");
  };

  return (
    <AppShell
      header={
        <PageHeader
          title="Weekly Plan"
          subtitle={
            displayPlan?.plan
              ? formatWeekRange(displayPlan.plan.weekStartDate)
              : "Dinner planning"
          }
          action={
            <Button
              size="sm"
              onClick={() => displayPlan ? setShowRegenConfirm(true) : void handleGeneratePlan()}
              disabled={isGenerating || !hasAudienceSelection}
              className="gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Creating plan..." : displayPlan ? "Regenerate" : "Generate"}
            </Button>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4 page-transition">
        <OnboardingGuide />

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

        <MealAudienceCard
          members={householdProfiles ?? []}
          currentProfileId={currentUser?.profileId ?? null}
          audience={mealAudience}
          selectedProfileIds={selectedProfileIds}
          onChangeAudience={(value) => {
            setMealAudience(value);
            setGenerateError(null);
            if (value !== "selected") {
              setSelectedProfileIds([]);
            }
          }}
          onToggleProfile={(profileId) => {
            setGenerateError(null);
            setSelectedProfileIds((current) =>
              current.includes(profileId)
                ? current.filter((id) => id !== profileId)
                : [...current, profileId]
            );
          }}
        />

        {/* Move mode banner */}
        {movingMealId && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-primary">Tap another meal to swap dates</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMovingMealId(null)} className="h-7 px-2 text-xs">
              Cancel
            </Button>
          </div>
        )}

        {!displayPlan || !recipeSuggestions ? (
          displayPlan === undefined || recipeSuggestions === undefined ? (
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
              {/* Week navigation */}
              {sortedWeeks.length > 1 && (
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={() => setViewingWeekIndex((i) => i + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/40 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="text-xs font-medium text-muted-foreground">
                    {displayPlan?.plan ? formatWeekRange(displayPlan.plan.weekStartDate) : ""}
                    {viewingWeekIndex > 0 && " (past)"}
                  </p>
                  <button
                    type="button"
                    disabled={!canGoForward}
                    onClick={() => setViewingWeekIndex((i) => i - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/40 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground/80">{viewingWeekIndex === 0 ? "This week\u2019s progress" : "Week progress"}</p>
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
                <span className="text-xs text-muted-foreground">{displayPlan.meals.filter(m => m.status === "skipped").length} skipped</span>
              </div>
              <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => void handleSharePlan()}
              >
                <Share2 className="h-4 w-4" />
                Share Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                disabled={isGeneratingGrocery}
                onClick={() => setShowGroceryReview(true)}
              >
                <ListChecks className="h-4 w-4" />
                {isGeneratingGrocery ? "Generating..." : "Review Groceries"}
              </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="recipes">Recipes</TabsTrigger>
                <TabsTrigger value="cookbook" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  Cookbook
                </TabsTrigger>
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

                  const plannedMeal = meal as PlannedMeal;
                  const swapOptions =
                    plannedMeal.alternatives.length > 0
                      ? plannedMeal.alternatives
                      : recipePool.filter((recipe) => recipe._id !== meal.recipe._id);
                  const isBusy = busyMealId === meal._id;
                  const isSwapOpen = swappingMealId === meal._id;
                  const isAdjustOpen = adjustmentPanelMealId === meal._id;
                  const isMoveSource = movingMealId === meal._id;
                  const canMoveMeal =
                    meal.status !== "cooked" && displayPlan.meals.length > 1;
                  const isMoveTarget =
                    movingMealId !== null &&
                    movingMealId !== meal._id &&
                    meal.status !== "cooked";
                  const canSwapMeal =
                    meal.status !== "cooked" && swapOptions.length > 0;
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
                      } ${isMoveSource ? "ring-2 ring-primary/40" : ""} ${isMoveTarget ? "ring-2 ring-primary cursor-pointer" : ""}`}
                    >
                      <CardContent className="p-0">
                        {/* Main content area */}
                        <button
                          type="button"
                          className="w-full p-4 pb-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
                          onClick={() => {
                            if (movingMealId) {
                              if (meal.status !== "cooked") {
                                void handleMoveMealSelect(meal._id);
                              }
                              return;
                            }
                            openRecipeDialog(meal.recipe);
                          }}
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
                          {canMoveMeal && (
                            <button
                              type="button"
                              onClick={() => {
                                setSwappingMealId(null);
                                setMovingMealId(isMoveSource ? null : meal._id);
                              }}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                isMoveSource ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"
                              }`}
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                            </button>
                          )}
                          {canSwapMeal && (
                            <button
                              onClick={() => {
                                setMovingMealId(null);
                                setAdjustmentPanelMealId(null);
                                setSwappingMealId(isSwapOpen ? null : meal._id);
                              }}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                            >
                              <Shuffle className="h-3 w-3" />
                            </button>
                          )}
                          {meal.status !== "cooked" && (
                            <button
                              onClick={() => {
                                setMovingMealId(null);
                                setSwappingMealId(null);
                                setAdjustmentPanelMealId(isAdjustOpen ? null : meal._id);
                              }}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                isAdjustOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"
                              }`}
                              aria-label="Adjust dinner"
                            >
                              <Sparkles className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => void handleToggleSavedRecipe(meal.recipe._id)}
                            disabled={savingRecipeId === meal.recipe._id}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              savedRecipes?.some((s) => s.recipe._id === meal.recipe._id)
                                ? "text-primary"
                                : "text-muted-foreground hover:bg-muted/60"
                            }`}
                            aria-label={savedRecipes?.some((s) => s.recipe._id === meal.recipe._id) ? "Remove from cookbook" : "Save to cookbook"}
                          >
                            <Heart className={`h-3 w-3 ${savedRecipes?.some((s) => s.recipe._id === meal.recipe._id) ? "fill-current" : ""}`} />
                          </button>
                        </div>

                        {/* Swap panel */}
                        {isSwapOpen && canSwapMeal && (
                          <div className="border-t bg-muted/20 px-3 py-3 animate-fade-in">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {plannedMeal.alternatives.length > 0 ? "Fresh alternatives:" : "Swap with:"}
                            </p>
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

                        {isAdjustOpen && (
                          <MealAdjustmentPanel
                            meal={plannedMeal}
                            adjustingMealId={adjustingMealId}
                            avoidText={avoidText}
                            savedAvoidText={savedAvoidText}
                            canSaveAvoidPreference={!!myProfile && avoidText.trim().length > 0}
                            onChangeAvoidText={setAvoidText}
                            onAdjustMeal={handleMealAdjustment}
                            onSaveAvoidPreference={handleSaveAvoidPreference}
                          />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="recipes" className="space-y-3">
                <Card className="overflow-hidden border-dashed bg-gradient-to-br from-primary/8 via-background to-primary/5">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <ChefHat className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold">Add your own recipes</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Save household favorites and let everyone in your family reuse them.
                      </p>
                    </div>
                    <Button type="button" onClick={() => setShowAddRecipeDialog(true)}>
                      Add Recipe
                    </Button>
                  </CardContent>
                </Card>

                {(recipeSuggestions ?? []).map((recipe, index) => (
                  <Card
                    key={recipe._id}
                    className={`overflow-hidden opacity-0 animate-fade-in card-interactive stagger-${index + 1}`}
                  >
                    <CardContent className="p-4">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => openRecipeDialog(recipe)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-semibold leading-tight">{recipe.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {recipe.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {recipe.source === "custom" && (
                              <Badge variant="outline">Custom</Badge>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-xs font-medium capitalize">
                              {getEffortIcon(recipe.effortLevel)} {recipe.effortLevel}
                            </span>
                          </div>
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

              <TabsContent value="cookbook" className="space-y-3">
                <Card className="overflow-hidden border-dashed bg-gradient-to-br from-primary/8 via-background to-primary/5">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">Build your family cookbook</h3>
                      <p className="text-sm text-muted-foreground">
                        Add handwritten staples, quick kid dinners, or any recipe you want in the rotation.
                      </p>
                    </div>
                    <Button type="button" onClick={() => setShowAddRecipeDialog(true)}>
                      Add Recipe
                    </Button>
                  </CardContent>
                </Card>

                {cookbookRecipes.length === 0 ? (
                  <Card className="overflow-hidden border-dashed">
                    <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Your cookbook is empty</h3>
                        <p className="text-sm text-muted-foreground">
                          Save recipes from your plan or add your own family favorites here.
                        </p>
                      </div>
                      <Button type="button" onClick={() => setShowAddRecipeDialog(true)}>
                        Add Your First Recipe
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  cookbookRecipes.map((saved, index) => (
                    <Card
                      key={saved._id}
                      className={`overflow-hidden opacity-0 animate-fade-in card-interactive stagger-${index + 1}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => openRecipeDialog(saved.recipe)}
                          >
                            <h3 className="font-semibold leading-tight">{saved.recipe.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {saved.recipe.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {saved.recipe.source === "custom" && (
                                <Badge variant="outline">Custom</Badge>
                              )}
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                                {getEffortIcon(saved.recipe.effortLevel)} {saved.recipe.effortLevel}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                                <Clock3 className="h-3 w-3" />
                                {saved.recipe.estimatedTime}m
                              </span>
                            </div>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 rounded-xl text-primary hover:text-primary"
                            disabled={savingRecipeId === saved.recipe._id}
                            onClick={() => void handleToggleSavedRecipe(saved.recipe._id)}
                            aria-label="Remove from cookbook"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showRegenConfirm}
        onOpenChange={setShowRegenConfirm}
        title="Regenerate meal plan?"
        description="This will replace your current week's plan with a new AI-generated one. Any feedback or cooking status will be lost."
        confirmLabel="Regenerate"
        onConfirm={() => {
          setShowRegenConfirm(false);
          void handleGeneratePlan();
        }}
      />

      <CustomRecipeDialog
        open={showAddRecipeDialog}
        onOpenChange={setShowAddRecipeDialog}
        onCreated={handleCustomRecipeCreated}
      />

      <GroceryReviewDialog
        open={showGroceryReview}
        onOpenChange={setShowGroceryReview}
        missingGroups={groceryReview.groupedMissing}
        pantryCoveredCount={groceryReview.pantryCovered.length}
        isGenerating={isGeneratingGrocery}
        onGenerate={() => void handleGenerateGroceries("plan_review_dialog")}
      />

      <Dialog
        open={selectedRecipeId !== null}
        onOpenChange={(open) => {
          if (!open) closeRecipeDialog();
        }}
      >
        <DialogContent className="fixed top-auto bottom-0 left-0 right-0 max-h-[85vh] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-t-3xl rounded-b-none border-x-0 border-b-0 p-0 sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border animate-slide-in-bottom" style={{ touchAction: "pan-y" }}>
          {selectedRecipe && (
            <>
              {/* Cuisine gradient hero */}
              <div className={`h-24 sm:h-28 relative overflow-hidden ${getRecipeGradient(selectedRecipe.tags)}`}>
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.12]">
                  <span className="text-7xl sm:text-8xl select-none">{getRecipeEmoji(selectedRecipe.tags)}</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
              </div>

              <DialogHeader className="border-b px-5 pb-4 pt-3 sm:px-6 -mt-6 relative">
                <div className="flex items-start gap-3 pr-8">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-left text-xl tracking-tight">
                      {selectedRecipe.title}
                    </DialogTitle>
                    <DialogDescription className="text-left mt-1">
                      {selectedRecipe.description}
                    </DialogDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    disabled={savingRecipeId === selectedRecipe._id || isSelectedRecipeSaved === undefined}
                    onClick={() => void handleToggleSavedRecipe(selectedRecipe._id)}
                    aria-label={isSelectedRecipeSaved ? "Remove from cookbook" : "Save to cookbook"}
                  >
                    <Heart className={`h-5 w-5 ${isSelectedRecipeSaved ? "fill-current text-primary" : "text-muted-foreground"}`} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-3">
                  <Badge variant="outline">{getRecipeSourceLabel(selectedRecipe.source)}</Badge>
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

              <div className="space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6" style={{ maxHeight: "60vh", WebkitOverflowScrolling: "touch" }}>
                {selectedRecipe.nutrition && (
                  <section className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Nutrition <span className="normal-case font-normal">(per serving)</span>
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-xl bg-muted/40 px-2 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cal</p>
                        <p className="mt-1 text-sm font-semibold">{formatNutritionValue(selectedRecipe.nutrition.calories, "")}</p>
                      </div>
                      <div className="rounded-xl bg-muted/40 px-2 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Protein</p>
                        <p className="mt-1 text-sm font-semibold">{formatNutritionValue(selectedRecipe.nutrition.protein, "g")}</p>
                      </div>
                      <div className="rounded-xl bg-muted/40 px-2 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Carbs</p>
                        <p className="mt-1 text-sm font-semibold">{formatNutritionValue(selectedRecipe.nutrition.carbs, "g")}</p>
                      </div>
                      <div className="rounded-xl bg-muted/40 px-2 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fat</p>
                        <p className="mt-1 text-sm font-semibold">{formatNutritionValue(selectedRecipe.nutrition.fat, "g")}</p>
                      </div>
                    </div>
                  </section>
                )}

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Ingredients
                  </h4>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient) => {
                      const isAvailable = isIngredientAvailable(ingredient);

                      return (
                        <div
                          key={`${ingredient.name}-${ingredient.unit}-${ingredient.quantity}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3.5 py-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${
                              isAvailable ? "bg-primary" : "bg-muted-foreground/25"
                            }`} />
                            <div>
                              <p className="text-sm font-medium">{ingredient.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatIngredientAmount(ingredient.quantity, ingredient.unit)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isAvailable
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/10 text-accent"
                          }`}>
                            {isAvailable ? "Have it" : "Need it"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {selectedRecipe.ingredients.some((ing) => !isIngredientAvailable(ing)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 gap-2 rounded-xl"
                      disabled={addingToGrocery}
                      onClick={() => void handleAddMissingToGrocery(selectedRecipe.ingredients)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {addingToGrocery
                        ? "Adding..."
                        : `Add ${selectedRecipe.ingredients.filter((ing) => !isIngredientAvailable(ing)).length} missing to grocery list`}
                    </Button>
                  )}
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
                  {selectedRecipe.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags yet.</p>
                  )}
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

function MealAudienceCard({
  members,
  currentProfileId,
  audience,
  selectedProfileIds,
  onChangeAudience,
  onToggleProfile,
}: {
  members: ProfileDoc[];
  currentProfileId: Id<"userProfiles"> | null;
  audience: MealAudience;
  selectedProfileIds: Id<"userProfiles">[];
  onChangeAudience: (value: MealAudience) => void;
  onToggleProfile: (profileId: Id<"userProfiles">) => void;
}) {
  const selectedCount =
    audience === "whole"
      ? members.length
      : audience === "me"
        ? currentProfileId
          ? 1
          : 0
        : selectedProfileIds.length;

  return (
    <Card className="overflow-hidden border-dashed bg-muted/20">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Who is this plan for?</h3>
              <Badge variant="secondary">{selectedCount} selected</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              FamilyPlate merges allergies, dislikes, and preferences only for the eaters you choose.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <AudienceButton
            label="Family"
            icon={<Home className="h-4 w-4" />}
            active={audience === "whole"}
            onClick={() => onChangeAudience("whole")}
          />
          <AudienceButton
            label="Me"
            icon={<User className="h-4 w-4" />}
            active={audience === "me"}
            onClick={() => onChangeAudience("me")}
          />
          <AudienceButton
            label="Pick"
            icon={<CheckSquare className="h-4 w-4" />}
            active={audience === "selected"}
            onClick={() => onChangeAudience("selected")}
          />
        </div>

        {audience === "selected" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {members.length > 0 ? (
              members.map((member) => {
                const selected = selectedProfileIds.includes(member._id);
                return (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => onToggleProfile(member._id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {member.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.isChild ? "Kid" : "Adult"} · {member.allergies.length} allergies · {member.dislikes.length} dislikes
                      </p>
                    </div>
                    <CheckCircle2 className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground/35"}`} />
                  </button>
                );
              })
            ) : (
              <p className="rounded-xl bg-background p-3 text-sm text-muted-foreground">
                Add eater profiles in Settings to plan for selected people.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-background p-3 text-sm text-muted-foreground">
            {audience === "whole"
              ? "Planning will include every household eater profile."
              : "Planning will use your own profile only."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AudienceButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MealAdjustmentPanel({
  meal,
  adjustingMealId,
  avoidText,
  savedAvoidText,
  canSaveAvoidPreference,
  onChangeAvoidText,
  onAdjustMeal,
  onSaveAvoidPreference,
}: {
  meal: PlannedMeal;
  adjustingMealId: string | null;
  avoidText: string;
  savedAvoidText: string;
  canSaveAvoidPreference: boolean;
  onChangeAvoidText: (value: string) => void;
  onAdjustMeal: (meal: PlannedMeal, adjustmentType: AdjustmentType) => Promise<void>;
  onSaveAvoidPreference: () => Promise<void>;
}) {
  const disabled = !!adjustingMealId || meal.status === "cooked";

  return (
    <div className="border-t bg-muted/20 px-3 py-3 animate-fade-in">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Adjust this dinner</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <AdjustmentButton
          label="Swap"
          icon={<Shuffle className="h-3.5 w-3.5" />}
          busy={adjustingMealId === `${meal._id}:swap`}
          disabled={disabled}
          onClick={() => void onAdjustMeal(meal, "swap")}
        />
        <AdjustmentButton
          label="Faster"
          icon={<Zap className="h-3.5 w-3.5" />}
          busy={adjustingMealId === `${meal._id}:faster`}
          disabled={disabled}
          onClick={() => void onAdjustMeal(meal, "faster")}
        />
        <AdjustmentButton
          label="Kid"
          icon={<Smile className="h-3.5 w-3.5" />}
          busy={adjustingMealId === `${meal._id}:kid_friendly`}
          disabled={disabled}
          onClick={() => void onAdjustMeal(meal, "kid_friendly")}
        />
        <AdjustmentButton
          label="Pantry"
          icon={<PackageCheck className="h-3.5 w-3.5" />}
          busy={adjustingMealId === `${meal._id}:use_pantry`}
          disabled={disabled}
          onClick={() => void onAdjustMeal(meal, "use_pantry")}
        />
        <AdjustmentButton
          label="Regen"
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          busy={adjustingMealId === `${meal._id}:regenerate_day`}
          disabled={disabled}
          onClick={() => void onAdjustMeal(meal, "regenerate_day")}
        />
      </div>

      <div className="mt-3 rounded-xl bg-background p-3">
        <label className="text-sm font-semibold" htmlFor={`avoid-${meal._id}`}>
          Avoid something next time
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            id={`avoid-${meal._id}`}
            value={avoidText}
            onChange={(event) => onChangeAvoidText(event.target.value)}
            placeholder="Example: beef, spicy meals, casseroles"
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={!!adjustingMealId}
          />
          <Button
            type="button"
            size="sm"
            disabled={disabled || avoidText.trim().length === 0}
            onClick={() => void onAdjustMeal(meal, "avoid")}
            className="gap-2"
          >
            <Ban className="h-3.5 w-3.5" />
            Adjust
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canSaveAvoidPreference || savedAvoidText === avoidText.trim()}
            onClick={() => void onSaveAvoidPreference()}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            {savedAvoidText === avoidText.trim() ? "Saved" : "Save dislike"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdjustmentButton({
  label,
  icon,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-xl border bg-background px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function GroceryReviewDialog({
  open,
  onOpenChange,
  missingGroups,
  pantryCoveredCount,
  isGenerating,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingGroups: [string, GroceryReviewItem[]][];
  pantryCoveredCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const missingCount = missingGroups.reduce(
    (count, [, items]) => count + items.length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Grocery Review</DialogTitle>
          <DialogDescription>
            FamilyPlate will add missing planned-dinner ingredients and leave pantry-covered items out.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-2xl font-bold">{missingCount}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">To buy</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-2xl font-bold">{pantryCoveredCount}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">In pantry</p>
          </div>
        </div>

        {missingGroups.length === 0 ? (
          <div className="rounded-xl border bg-muted/20 p-5 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-primary" />
            <h3 className="mt-2 font-semibold">Pantry covers this plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No missing ingredients were found for planned dinners.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {missingGroups.map(([category, items]) => (
              <div key={category}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {category}
                  </p>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={`${item.name}-${item.unit}`}
                      className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5"
                    >
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">
                        {item.quantity} {item.unit} {item.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isGenerating}
            onClick={() => onOpenChange(false)}
          >
            Not Now
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            disabled={isGenerating || missingCount === 0}
            onClick={onGenerate}
          >
            {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            {isGenerating ? "Adding..." : "Add to Grocery"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
