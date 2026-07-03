import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc, Id } from "@familyplate/convex/_generated/dataModel";
import { usePostHog } from "posthog-react-native";
import {
  CookModeModal,
  type CookModeLeftover,
} from "@/components/CookModeModal";
import { RecipeFeedback } from "@/components/RecipeFeedback";
import { RecipeNutrition } from "@/components/RecipeNutrition";
import { ScreenShell } from "@/components/ScreenShell";
import { LoadingCard } from "@/components/LoadingCard";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { ensureAiConsent } from "@/lib/aiConsent";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";
import {
  buildScaledRecipeShareText,
  formatServingsLabel,
  scaleIngredients,
} from "@/lib/recipeScaling";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type Recipe = Doc<"recipeSuggestions">;
type Profile = Doc<"userProfiles">;
type PantryItem = Doc<"pantryItems">;
type PlannedMeal = Doc<"plannedMeals"> & {
  recipe: Recipe;
  alternatives: Recipe[];
};
type MealStatus = PlannedMeal["status"];
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

const STATUS_STYLES: Record<
  MealStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    bg: string;
    fg: string;
  }
> = {
  planned: {
    label: "Planned",
    icon: "calendar-outline",
    bg: "#fef3c7",
    fg: "#92400e",
  },
  cooked: {
    label: "Cooked",
    icon: "checkmark-circle",
    bg: "#dcfce7",
    fg: "#166534",
  },
  skipped: {
    label: "Skipped",
    icon: "play-skip-forward",
    bg: "#fee2e2",
    fg: "#991b1b",
  },
};

const PAST_WEEK_READ_ONLY_NOTICE =
  "Past weeks are read-only. Return to Current Week to make changes.";

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

function formatWeekRange(weekStartDate?: string) {
  if (!weekStartDate) return "This week";
  const start = parseDate(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

function formatMealDate(date: string) {
  const value = parseDate(date);
  return {
    weekday: value.toLocaleDateString(undefined, { weekday: "short" }),
    day: value.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  };
}

function getEffortColor(level: Recipe["effortLevel"]) {
  if (level === "easy") return { bg: "#dcfce7", fg: "#166534" };
  if (level === "medium") return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

function getPantryMatch(recipe: Recipe) {
  const available = recipe.ingredients.filter(isIngredientAvailable).length;
  const total = recipe.ingredients.length;
  return {
    available,
    total,
    label: total > 0 ? `${available}/${total} in pantry` : "No ingredients",
  };
}

function getUseFirstItems(items: PantryItem[]) {
  const now = Date.now();
  const fourDays = 4 * 24 * 60 * 60 * 1000;

  return items
    .filter((item) => {
      const isLeftover =
        item.category.toLowerCase() === "leftovers" ||
        item.name.toLowerCase().includes("leftover");
      const isExpiring =
        item.expirationDate !== undefined && item.expirationDate <= now + fourDays;
      return isLeftover || isExpiring;
    })
    .sort((a, b) => {
      const aLeftover =
        a.category.toLowerCase() === "leftovers" ||
        a.name.toLowerCase().includes("leftover");
      const bLeftover =
        b.category.toLowerCase() === "leftovers" ||
        b.name.toLowerCase().includes("leftover");
      if (aLeftover !== bLeftover) return aLeftover ? -1 : 1;
      return (a.expirationDate ?? Number.MAX_SAFE_INTEGER) -
        (b.expirationDate ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, 5);
}

function getUseFirstLabel(item: PantryItem) {
  if (
    item.category.toLowerCase() === "leftovers" ||
    item.name.toLowerCase().includes("leftover")
  ) {
    return "Leftovers";
  }

  if (!item.expirationDate) return "Use soon";

  return new Date(item.expirationDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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

export default function PlanScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});
  const mealPlanWeeks = useQuery(api.queries.planner.getMyMealPlanWeeks, {});
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const myProfile = useQuery(api.queries.profiles.getMyProfile, {});
  const members = useQuery(
    api.queries.profiles.getProfiles,
    currentUser?.householdId
      ? { householdId: currentUser.householdId }
      : "skip",
  );
  const subscription = useQuery(api.subscriptions.getMySubscription, {});
  const generateAiPlan = useAction(
    api.actions.generateMealPlan.generateMealPlan,
  );
  const generateMealAdjustment = useAction(api.actions.swapMeal.swapMeal);
  const generateCuratedPlan = useMutation(
    api.mutations.planner.generatePlaceholderPlan,
  );
  const updateMealStatus = useMutation(api.mutations.planner.updateMealStatus);
  const swapMeal = useMutation(api.mutations.planner.swapMeal);
  const swapMealDates = useMutation(api.mutations.planner.swapMealDates);
  const generateGroceryList = useMutation(
    api.mutations.grocery.generateFromPlan,
  );
  const addGroceryItem = useMutation(api.mutations.grocery.addMyCustomItem);
  const addPantryItem = useMutation(api.mutations.pantry.addItem);
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const pantryItems = useQuery(api.queries.pantry.getMyPantryItems, {});
  const saveRecipe = useMutation(api.mutations.savedRecipes.saveRecipe);
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);
  const updateProfile = useMutation(api.mutations.profiles.updateProfile);

  const [selectedMeal, setSelectedMeal] = useState<PlannedMeal | null>(null);
  const [cookingMeal, setCookingMeal] = useState<PlannedMeal | null>(null);
  const [busyMealId, setBusyMealId] = useState<string | null>(null);
  const [finishingCookMode, setFinishingCookMode] = useState(false);
  const [movingMealId, setMovingMealId] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGroceries, setIsGeneratingGroceries] = useState(false);
  const [showGroceryReview, setShowGroceryReview] = useState(false);
  const [mealAudience, setMealAudience] = useState<MealAudience>("whole");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [adjustingMealId, setAdjustingMealId] = useState<string | null>(null);
  const [addingMissingMealId, setAddingMissingMealId] = useState<string | null>(
    null,
  );
  const [avoidText, setAvoidText] = useState("");
  const [savedAvoidText, setSavedAvoidText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [viewingWeekIndex, setViewingWeekIndex] = useState(0);
  const trackedLimitPaywallForCycle = useRef<string | null>(null);

  const sortedWeeks = useMemo(
    () =>
      (mealPlanWeeks ?? []).sort((a, b) =>
        b.weekStartDate.localeCompare(a.weekStartDate),
      ),
    [mealPlanWeeks],
  );
  const viewingWeekDate = sortedWeeks[viewingWeekIndex]?.weekStartDate ?? null;
  const viewingPastWeek = viewingWeekIndex > 0 && !!viewingWeekDate;
  const pastWeekPlan = useQuery(
    api.queries.planner.getMyMealPlanByWeek,
    viewingPastWeek && viewingWeekDate
      ? { weekStartDate: viewingWeekDate }
      : "skip",
  );
  const displayPlan = viewingPastWeek ? pastWeekPlan : mealPlan;
  const planIsEditable = !viewingPastWeek;
  const canGoBack = viewingWeekIndex < sortedWeeks.length - 1;
  const canGoForward = viewingWeekIndex > 0;

  const meals = useMemo(
    () => (displayPlan?.meals ?? []) as PlannedMeal[],
    [displayPlan?.meals],
  );
  const cookedCount = meals.filter((meal) => meal.status === "cooked").length;
  const skippedCount = meals.filter((meal) => meal.status === "skipped").length;
  const activeCount = meals.length - skippedCount;
  const progressPct =
    activeCount > 0 ? Math.round((cookedCount / activeCount) * 100) : 0;
  const savedRecipeIds = useMemo(() => {
    return new Set(savedRecipes?.map((saved) => saved.recipe._id) ?? []);
  }, [savedRecipes]);
  const groceryReview = useMemo(() => {
    const missing = new Map<string, GroceryReviewItem>();
    const pantryCovered: GroceryReviewItem[] = [];

    for (const meal of meals) {
      if (meal.status !== "planned") continue;

      for (const ingredient of meal.recipe.ingredients) {
        if (isIngredientAvailable(ingredient)) {
          pantryCovered.push({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: inferGroceryCategory(ingredient.name),
          });
          continue;
        }

        const category = inferGroceryCategory(ingredient.name);
        const key = `${ingredient.name.trim().toLowerCase()}::${ingredient.unit.trim().toLowerCase()}`;
        const existing = missing.get(key);
        missing.set(key, {
          name: existing?.name ?? ingredient.name,
          quantity:
            Math.round(
              ((existing?.quantity ?? 0) + ingredient.quantity) * 100,
            ) / 100,
          unit: ingredient.unit,
          category: existing?.category ?? category,
        });
      }
    }

    const missingItems = Array.from(missing.values()).sort((a, b) =>
      a.category === b.category
        ? a.name.localeCompare(b.name)
        : a.category.localeCompare(b.category),
    );
    const groupedMissing = new Map<string, GroceryReviewItem[]>();

    for (const item of missingItems) {
      if (!groupedMissing.has(item.category))
        groupedMissing.set(item.category, []);
      groupedMissing.get(item.category)!.push(item);
    }

    return {
      missingItems,
      groupedMissing: Array.from(groupedMissing.entries()),
      pantryCovered,
    };
  }, [meals]);
  const useFirstItems = useMemo(
    () => getUseFirstItems(pantryItems ?? []),
    [pantryItems],
  );
  const audienceProfileIds = useMemo(() => {
    if (mealAudience === "whole") return undefined;
    if (mealAudience === "me") {
      return currentUser?.profileId ? [currentUser.profileId] : [];
    }
    return selectedProfileIds as Id<"userProfiles">[];
  }, [currentUser?.profileId, mealAudience, selectedProfileIds]);
  const hasAudienceSelection =
    mealAudience === "whole" || (audienceProfileIds?.length ?? 0) > 0;
  const audienceLabel =
    mealAudience === "whole"
      ? "whole family"
      : mealAudience === "me"
        ? "just me"
        : `${audienceProfileIds?.length ?? 0} selected`;
  const isFamilyPlan = subscription?.tier === "family";
  const isAtPlanLimit = subscription?.canGenerate === false;
  const planUsageLabel =
    subscription === undefined
      ? "Checking plan usage..."
      : isFamilyPlan
        ? "Unlimited weekly plans"
        : `${subscription.plansUsed}/${subscription.plansLimit} free weekly plans used`;
  const planUsagePercent =
    subscription && !isFamilyPlan
      ? Math.min(
          100,
          Math.round((subscription.plansUsed / subscription.plansLimit) * 100),
        )
      : 0;
  const generateDisabled =
    isGenerating ||
    subscription === undefined ||
    isAtPlanLimit ||
    !hasAudienceSelection ||
    !currentUser?.householdId;
  const generateDisabledReason = !currentUser?.householdId
    ? "Finish setting up your household before generating a plan."
    : !hasAudienceSelection
      ? "Choose at least one eater for this plan."
      : subscription === undefined
        ? "Checking your plan limit..."
        : isAtPlanLimit
          ? "Free plan limit reached for this month."
          : "";
  const shouldShowUpgradeNudge =
    subscription !== undefined &&
    !isFamilyPlan &&
    !isAtPlanLimit &&
    subscription.plansUsed > 0;

  useEffect(() => {
    setSelectedMeal(null);
    setCookingMeal(null);
    setMovingMealId(null);
    setShowGroceryReview(false);
    setNotice("");
    setError("");
  }, [viewingWeekIndex]);

  useEffect(() => {
    if (!subscription || subscription.canGenerate || isFamilyPlan) return;
    const key = `${currentUser?.householdId ?? "unknown"}:${subscription.plansUsed}:${subscription.plansLimit}`;
    if (trackedLimitPaywallForCycle.current === key) return;

    trackedLimitPaywallForCycle.current = key;
    track(posthog, "paywall_viewed", {
      source: "weekly_plan_limit",
      plans_used: subscription.plansUsed,
      plans_limit: subscription.plansLimit,
    });
  }, [currentUser?.householdId, isFamilyPlan, posthog, subscription]);

  useEffect(() => {
    if (!selectedMeal) return;
    const updatedMeal = meals.find((meal) => meal._id === selectedMeal._id);
    if (updatedMeal && updatedMeal !== selectedMeal) {
      setSelectedMeal(updatedMeal);
    }
  }, [meals, selectedMeal]);

  const openFamilyPlan = (source: string) => {
    track(posthog, "paywall_cta_tapped", {
      source,
      tier: subscription?.tier ?? "unknown",
      plans_used: subscription?.plansUsed,
      plans_limit: subscription?.plansLimit,
    });
    router.push("/settings");
  };

  const handleGeneratePlan = async () => {
    if (subscription && !subscription.canGenerate) {
      track(posthog, "paywall_viewed", {
        source: "weekly_plan_generate_blocked",
        plans_used: subscription.plansUsed,
        plans_limit: subscription.plansLimit,
      });
      setError(
        `You've used ${subscription.plansUsed}/${subscription.plansLimit} free plans this month. Pantry, cookbook, and grocery list tools are still available.`,
      );
      return;
    }

    const consented = await ensureAiConsent();
    if (!consented) {
      setError(
        "AI meal planning needs your permission before it can use your household details.",
      );
      return;
    }
    track(posthog, "ai_consent_accepted", {
      feature: "weekly_plan",
    });

    setIsGenerating(true);
    setError("");
    setNotice("");

    try {
      track(posthog, "meal_plan_generation_started", {
        source: meals.length ? "refresh" : "empty_state",
        tier: subscription?.tier ?? "unknown",
        audience: mealAudience,
        selected_eater_count:
          audienceProfileIds?.length ?? members?.length ?? 0,
      });
      const householdId = currentUser?.householdId;
      if (!householdId) {
        throw new Error("Finish setting up your household before planning.");
      }

      try {
        await generateAiPlan({
          householdId: householdId as Id<"households">,
          weekStartDate: formatDate(getStartOfWeek(new Date())),
          profileIds: audienceProfileIds,
        });
        track(posthog, "meal_plan_generated", {
          source: "ai",
          week_start_date: formatDate(getStartOfWeek(new Date())),
          tier: subscription?.tier ?? "unknown",
          audience: mealAudience,
          selected_eater_count:
            audienceProfileIds?.length ?? members?.length ?? 0,
        });
        setNotice(`Fresh weekly plan generated for ${audienceLabel}.`);
      } catch {
        await generateCuratedPlan({});
        track(posthog, "meal_plan_generated", {
          source: "curated_fallback",
          tier: subscription?.tier ?? "unknown",
        });
        setNotice(
          "Used a curated weekly plan because AI planning was unavailable.",
        );
      }
    } catch (err) {
      track(posthog, "meal_plan_generation_failed", {
        tier: subscription?.tier ?? "unknown",
        audience: mealAudience,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "plan", action: "generate_plan", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetStatus = async (meal: PlannedMeal, status: MealStatus) => {
    if (!planIsEditable) {
      setError("");
      setNotice(PAST_WEEK_READ_ONLY_NOTICE);
      return;
    }

    if (status === "cooked" && meal.status !== "cooked") {
      Alert.alert(
        "Mark dinner cooked?",
        "This will deduct pantry ingredients for this recipe.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark Cooked",
            onPress: () => {
              void updateStatus(meal, status);
            },
          },
        ],
      );
      return;
    }

    await updateStatus(meal, status);
  };

  const updateStatus = async (meal: PlannedMeal, status: MealStatus) => {
    setBusyMealId(meal._id);
    setError("");
    setNotice("");
    try {
      await updateMealStatus({
        mealId: meal._id as Id<"plannedMeals">,
        status,
      });
      if (status === "cooked" && meal.status !== "cooked") {
        setSelectedMeal({ ...meal, status });
        setNotice(
          "Dinner marked cooked. Add the quick check-in so future plans learn what worked.",
        );
        track(posthog, "recipe_cooked", {
          source: "weekly_plan",
          recipe_id: meal.recipe._id,
          meal_id: meal._id,
        });
      } else if (selectedMeal?._id === meal._id) {
        setSelectedMeal({ ...meal, status });
      }
      track(posthog, "meal_status_updated", {
        status,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyMealId(null);
    }
  };

  const handleStartCookMode = (meal: PlannedMeal) => {
    if (!planIsEditable) {
      setError("");
      setNotice(PAST_WEEK_READ_ONLY_NOTICE);
      return;
    }

    setError("");
    setNotice("");
    const openCookMode = () => {
      setCookingMeal(meal);
      track(posthog, "cook_mode_started", {
        source: "weekly_plan",
        recipe_id: meal.recipe._id,
        meal_id: meal._id,
      });
    };

    if (selectedMeal) {
      setSelectedMeal(null);
      setTimeout(openCookMode, 250);
      return;
    }

    openCookMode();
  };

  const handleFinishCookMode = async (leftover?: CookModeLeftover) => {
    if (!cookingMeal) return;

    setFinishingCookMode(true);
    setError("");
    setNotice("");

    try {
      if (cookingMeal.status !== "cooked") {
        await updateStatus(cookingMeal, "cooked");
      }

      if (leftover && currentUser?.householdId) {
        await addPantryItem({
          householdId: currentUser.householdId as Id<"households">,
          name: leftover.name,
          quantity: leftover.quantity,
          unit: leftover.unit,
          category: "Leftovers",
          storageLocation: leftover.storageLocation,
          ...(leftover.expirationDate
            ? { expirationDate: leftover.expirationDate }
            : {}),
        });
        track(posthog, "leftovers_saved", {
          source: "cook_mode",
          recipe_id: cookingMeal.recipe._id,
          storage_location: leftover.storageLocation,
          has_expiration: !!leftover.expirationDate,
        });
      }

      setSelectedMeal({ ...cookingMeal, status: "cooked" });
      setCookingMeal(null);
      setNotice(
        "Cook Mode finished. Add feedback so future plans learn what worked.",
      );
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "cook_mode", action: "finish", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setFinishingCookMode(false);
    }
  };

  const handleGenerateGroceries = async (source = "weekly_plan") => {
    if (!planIsEditable) {
      setError("");
      setNotice(
        "Past weeks are read-only. Return to Current Week to update groceries.",
      );
      return;
    }

    setIsGeneratingGroceries(true);
    setError("");
    setNotice("");
    try {
      await generateGroceryList({});
      track(posthog, "grocery_list_generated", {
        source,
        meal_count: meals.length,
      });
      track(posthog, "grocery_items_added_from_plan", {
        source,
        item_count: groceryReview.missingItems.length,
        pantry_covered_count: groceryReview.pantryCovered.length,
      });
      setShowGroceryReview(false);
      setNotice("Grocery list updated from your planned dinners.");
    } catch (err) {
      track(posthog, "grocery_list_generation_failed", {
        source,
        meal_count: meals.length,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: {
          area: "grocery",
          action: "generate_from_plan",
          platform: "ios",
        },
      });
      setError(getErrorMessage(err));
    } finally {
      setIsGeneratingGroceries(false);
    }
  };

  const handleToggleSavedRecipe = async (recipeId: Id<"recipeSuggestions">) => {
    setSavingRecipeId(recipeId);
    setError("");
    setNotice("");
    try {
      if (savedRecipeIds.has(recipeId)) {
        await unsaveRecipe({ recipeId });
        track(posthog, "recipe_unsaved", {
          source: "weekly_plan",
        });
        setNotice("Recipe removed from Cookbook.");
      } else {
        await saveRecipe({ recipeId });
        track(posthog, "recipe_saved", {
          source: "weekly_plan",
        });
        setNotice("Recipe saved to Cookbook.");
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "recipe", action: "toggle_save", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleShareRecipe = async (
    recipe: Recipe,
    source: string,
    targetServings: number,
  ) => {
    try {
      await Share.share({
        title: recipe.title,
        message: buildScaledRecipeShareText(recipe, targetServings),
      });
      track(posthog, "recipe_shared", {
        source,
        recipe_id: recipe._id,
        target_servings: targetServings,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "plan", action: "share_recipe", platform: "ios" },
      });
      setError(getErrorMessage(err));
    }
  };

  const handleAddMissingIngredients = async (
    meal: PlannedMeal,
    targetServings: number,
  ) => {
    if (!planIsEditable) {
      setError("");
      setNotice(
        "Past weeks are read-only. Return to Current Week to add groceries.",
      );
      return;
    }

    const missingIngredients = scaleIngredients(
      meal.recipe.ingredients,
      meal.recipe.servings,
      targetServings,
    ).filter((ingredient) => !isIngredientAvailable(ingredient));

    if (missingIngredients.length === 0) {
      setNotice("Everything for this dinner is already in your pantry.");
      return;
    }

    setAddingMissingMealId(meal._id);
    setError("");
    setNotice("");

    try {
      for (const ingredient of missingIngredients) {
        await addGroceryItem({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: inferGroceryCategory(ingredient.name),
        });
      }
      track(posthog, "grocery_item_added", {
        source: "weekly_plan_missing_ingredients",
        count: missingIngredients.length,
      });
      track(posthog, "missing_ingredients_added_to_grocery", {
        source: "weekly_plan",
        count: missingIngredients.length,
        target_servings: targetServings,
      });
      setNotice(
        `Added ${missingIngredients.length} missing item${
          missingIngredients.length === 1 ? "" : "s"
        } for ${formatServingsLabel(targetServings)} to Grocery List.`,
      );
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          area: "plan",
          action: "add_missing_to_grocery",
          platform: "ios",
        },
      });
      setError(getErrorMessage(err));
    } finally {
      setAddingMissingMealId(null);
    }
  };

  const handleSwapMeal = async (
    meal: PlannedMeal,
    recipeId: Id<"recipeSuggestions">,
  ) => {
    setBusyMealId(meal._id);
    setError("");
    setNotice("");
    try {
      await swapMeal({
        mealId: meal._id as Id<"plannedMeals">,
        recipeId,
      });
      track(posthog, "meal_swapped", {
        source: "meal_detail",
        meal_id: meal._id,
      });
      setMovingMealId(null);
      setSelectedMeal(null);
      setNotice("Dinner swapped with an alternative.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyMealId(null);
    }
  };

  const handleMealAdjustment = async (
    meal: PlannedMeal,
    adjustmentType: AdjustmentType,
  ) => {
    if (!planIsEditable) {
      setError("");
      setNotice(PAST_WEEK_READ_ONLY_NOTICE);
      return;
    }

    if (meal.status === "cooked") {
      setError("Cooked dinners are locked to preserve pantry history.");
      return;
    }

    const trimmedAvoidText = avoidText.trim();
    if (adjustmentType === "avoid" && !trimmedAvoidText) {
      setError("Add what you want FamilyPlate to avoid first.");
      return;
    }

    const consented = await ensureAiConsent();
    if (!consented) {
      setError(
        "AI meal adjustments need your permission before they can use your household details.",
      );
      return;
    }

    setAdjustingMealId(`${meal._id}:${adjustmentType}`);
    setError("");
    setNotice("");

    try {
      track(posthog, "plan_adjustment_started", {
        adjustment_type: adjustmentType,
        meal_id: meal._id,
        has_avoid_text: !!trimmedAvoidText,
      });

      const result = await generateMealAdjustment({
        mealId: meal._id as Id<"plannedMeals">,
        adjustmentType,
        avoidText: adjustmentType === "avoid" ? trimmedAvoidText : undefined,
      });

      if (adjustmentType === "regenerate_day") {
        track(posthog, "plan_regenerated", {
          source: "meal_detail",
          meal_id: meal._id,
        });
        setSelectedMeal(null);
        setNotice(
          result.appliedRecipeTitle
            ? `Regenerated ${formatMealDate(meal.date).weekday}: ${result.appliedRecipeTitle}.`
            : "Dinner regenerated for that day.",
        );
      } else {
        setNotice("Fresh alternatives are ready in dinner details.");
      }
    } catch (err) {
      track(posthog, "meal_plan_generation_failed", {
        source: "meal_adjustment",
        adjustment_type: adjustmentType,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "plan", action: "adjust_meal", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setAdjustingMealId(null);
    }
  };

  const handleSaveAvoidPreference = async () => {
    const trimmed = avoidText.trim();
    if (!trimmed || !myProfile) return;

    setError("");
    setNotice("");
    try {
      const nextDislikes = Array.from(
        new Set([...(myProfile.dislikes ?? []), trimmed]),
      );
      await updateProfile({
        profileId: myProfile._id,
        dislikes: nextDislikes,
      });
      track(posthog, "preference_saved_from_feedback", {
        source: "plan_adjustment",
        preference_type: "dislike",
      });
      setSavedAvoidText(trimmed);
      setNotice(`Saved "${trimmed}" to your dislikes for future plans.`);
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          area: "profile",
          action: "save_avoid_preference",
          platform: "ios",
        },
      });
      setError(getErrorMessage(err));
    }
  };

  const handleStartMove = (meal: PlannedMeal) => {
    if (!planIsEditable) {
      setError("");
      setNotice(PAST_WEEK_READ_ONLY_NOTICE);
      return;
    }

    setError("");
    setNotice("");

    if (meal.status === "cooked") {
      setError("Cooked dinners are locked to preserve pantry history.");
      return;
    }

    setMovingMealId((current) => (current === meal._id ? null : meal._id));
    setSelectedMeal(null);
    setNotice(
      movingMealId === meal._id
        ? "Move canceled."
        : "Choose another dinner slot to swap dates.",
    );
  };

  const handleMoveToTarget = async (targetMeal: PlannedMeal) => {
    if (!planIsEditable) {
      setError("");
      setNotice(PAST_WEEK_READ_ONLY_NOTICE);
      return;
    }

    if (!movingMealId || movingMealId === targetMeal._id) return;

    setBusyMealId(targetMeal._id);
    setError("");
    setNotice("");
    try {
      await swapMealDates({
        mealId: movingMealId as Id<"plannedMeals">,
        targetMealId: targetMeal._id as Id<"plannedMeals">,
      });
      setMovingMealId(null);
      setSelectedMeal(null);
      setNotice("Dinner moved to the selected day.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyMealId(null);
    }
  };

  return (
    <ScreenShell
      title="Weekly Plan"
      subtitle={
        displayPlan
          ? `${formatWeekRange(displayPlan.plan.weekStartDate)} dinner plan`
          : "Build a seven-night dinner plan."
      }
    >
      <View className="mb-4 rounded-2xl border border-border bg-card p-4">
        {sortedWeeks.length > 1 ? (
          <View className="mb-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setViewingWeekIndex((current) => current + 1)}
              disabled={!canGoBack}
              className="h-10 w-10 items-center justify-center rounded-xl bg-muted"
              style={{ opacity: canGoBack ? 1 : 0.35 }}
              accessibilityRole="button"
              accessibilityLabel="View older week"
            >
              <Ionicons name="chevron-back" size={18} color="#26211b" />
            </TouchableOpacity>
            <View className="items-center px-3">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {viewingWeekIndex === 0 ? "Current week" : "Past week"}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-foreground">
                {displayPlan
                  ? formatWeekRange(displayPlan.plan.weekStartDate)
                  : "Loading week..."}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewingWeekIndex((current) => current - 1)}
              disabled={!canGoForward}
              className="h-10 w-10 items-center justify-center rounded-xl bg-muted"
              style={{ opacity: canGoForward ? 1 : 0.35 }}
              accessibilityRole="button"
              accessibilityLabel="View newer week"
            >
              <Ionicons name="chevron-forward" size={18} color="#26211b" />
            </TouchableOpacity>
          </View>
        ) : null}

        {viewingPastWeek ? (
          <View className="mb-4 flex-row items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons name="lock-closed-outline" size={18} color="#b45309" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                History view is locked
              </Text>
              <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                Review past dinners without changing statuses, groceries, or
                pantry history. Return to Current Week when you are ready to
                edit.
              </Text>
            </View>
          </View>
        ) : null}

        <View className="mb-4 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {viewingWeekIndex === 0 ? "This week" : "Past week"}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-foreground">
              {formatWeekRange(displayPlan?.plan.weekStartDate)}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              {meals.length > 0
                ? `${cookedCount}/${activeCount} dinners cooked`
                : viewingWeekIndex === 0
                  ? "Generate a plan to fill the week."
                  : "No saved dinners for this week."}
            </Text>
          </View>
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Text className="text-xl font-bold text-primary">
              {progressPct}%
            </Text>
          </View>
        </View>

        <MealAudienceCard
          members={members ?? []}
          currentProfileId={currentUser?.profileId ?? null}
          audience={mealAudience}
          selectedProfileIds={selectedProfileIds}
          onChangeAudience={(value) => {
            setMealAudience(value);
            setError("");
            if (value !== "selected") {
              setSelectedProfileIds([]);
            }
          }}
          onToggleProfile={(profileId) => {
            setError("");
            setSelectedProfileIds((current) =>
              current.includes(profileId)
                ? current.filter((id) => id !== profileId)
                : [...current, profileId],
            );
          }}
        />

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => {
              if (viewingWeekIndex > 0) {
                setViewingWeekIndex(0);
                return;
              }
              void handleGeneratePlan();
            }}
            disabled={viewingWeekIndex > 0 ? false : generateDisabled}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
            style={{
              opacity:
                viewingWeekIndex > 0 || !generateDisabled ? 1 : 0.55,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              viewingWeekIndex > 0
                ? "Return to current week"
                : meals.length
                  ? "Refresh weekly plan"
                  : "Generate weekly plan"
            }
            accessibilityHint={
              viewingWeekIndex > 0
                ? "Go back to the active week to refresh or regenerate dinners."
                : generateDisabledReason || undefined
            }
          >
            {viewingWeekIndex > 0 ? (
              <Ionicons name="return-up-back-outline" size={18} color="white" />
            ) : isGenerating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="sparkles" size={18} color="white" />
            )}
            <Text className="font-semibold text-white">
              {viewingWeekIndex > 0
                ? "Current Week"
                : isGenerating
                  ? "Building plan..."
                  : meals.length
                    ? "Refresh"
                    : "Generate"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowGroceryReview(true)}
            disabled={
              viewingWeekIndex > 0 || isGeneratingGroceries || meals.length === 0
            }
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
            style={{
              opacity:
                viewingWeekIndex > 0 || isGeneratingGroceries || meals.length === 0
                  ? 0.55
                  : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Review groceries"
            accessibilityHint={
              viewingWeekIndex > 0
                ? "Return to the current week before updating groceries."
                : undefined
            }
          >
            {isGeneratingGroceries ? (
              <ActivityIndicator color="#248f58" />
            ) : (
              <Ionicons name="basket" size={18} color="#248f58" />
            )}
            <Text className="font-semibold text-primary">Groceries</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-4 rounded-xl bg-muted p-3">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons
              name={isAtPlanLimit ? "alert-circle" : "calendar"}
              size={17}
              color={isAtPlanLimit ? "#c2410c" : "#248f58"}
            />
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {planUsageLabel}
            </Text>
          </View>
          {!isFamilyPlan && subscription !== undefined ? (
            <>
              <View className="h-2 overflow-hidden rounded-full bg-border">
                <View
                  className={`h-full rounded-full ${
                    isAtPlanLimit ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${planUsagePercent}%` }}
                />
              </View>
              <Text className="mt-2 text-xs leading-4 text-muted-foreground">
                {isAtPlanLimit
                  ? "You've reached the free monthly limit. Pantry, cookbook, and grocery list tools are still available."
                  : "Free households can generate two weekly plans each month."}
              </Text>
            </>
          ) : null}
          {generateDisabledReason && !isAtPlanLimit ? (
            <Text className="mt-2 text-xs leading-4 text-muted-foreground">
              {generateDisabledReason}
            </Text>
          ) : null}
        </View>
      </View>

      {isAtPlanLimit ? (
        <PlanLimitNotice
          onUpgrade={() => openFamilyPlan("weekly_plan_limit")}
        />
      ) : shouldShowUpgradeNudge ? (
        <PlanUpgradeNudge
          plansUsed={subscription.plansUsed}
          plansLimit={subscription.plansLimit}
          onUpgrade={() => openFamilyPlan("weekly_plan_usage_nudge")}
        />
      ) : null}

      {useFirstItems.length > 0 ? (
        <UseFirstCard items={useFirstItems} />
      ) : null}

      {notice ? (
        <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3">
          <Ionicons name="checkmark-circle" size={18} color="#248f58" />
          <Text className="flex-1 text-sm leading-5 text-primary">
            {notice}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
          <Ionicons name="alert-circle" size={18} color="#c2410c" />
          <Text className="flex-1 text-sm leading-5 text-destructive">
            {error}
          </Text>
        </View>
      ) : null}

      {displayPlan === undefined ? (
        <LoadingCard
          icon="calendar-outline"
          title="Loading weekly plan"
          detail={
            viewingWeekIndex === 0
              ? "Checking this week's dinners and pantry matches."
              : "Loading dinners from a past week."
          }
        />
      ) : meals.length === 0 ? (
        <View className="items-center rounded-2xl border border-border bg-card p-6">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons name="calendar" size={26} color="#248f58" />
          </View>
          <Text className="mb-1 text-center text-lg font-semibold text-foreground">
            {viewingWeekIndex === 0 ? "No dinner plan yet" : "No dinners saved"}
          </Text>
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            {viewingWeekIndex === 0
              ? "Generate a weekly plan from your pantry, preferences, and household size."
              : "This past week does not have a saved dinner plan to review."}
          </Text>
          <View className="mt-5 w-full gap-2">
            <EmptyGuideRow
              icon="people-outline"
              label="Pick Family, Me, or selected eater profiles above."
            />
            <EmptyGuideRow
              icon="cube-outline"
              label="Add pantry items first for better ingredient matches."
            />
            <EmptyGuideRow
              icon="cart-outline"
              label="After planning, send missing items to Grocery."
            />
          </View>
        </View>
      ) : (
        <View className="gap-3">
          {meals.map((meal) => (
            <MealCard
              key={meal._id}
              meal={meal}
              busy={busyMealId === meal._id}
              movingMealId={movingMealId}
              readOnly={viewingPastWeek}
              saved={savedRecipeIds.has(meal.recipe._id)}
              saving={savingRecipeId === meal.recipe._id}
              onOpen={() => setSelectedMeal(meal)}
              onSetStatus={handleSetStatus}
              onStartMove={handleStartMove}
              onMoveToTarget={handleMoveToTarget}
              onToggleSavedRecipe={handleToggleSavedRecipe}
              onStartCookMode={handleStartCookMode}
            />
          ))}
        </View>
      )}

      <MealDetailModal
        meal={selectedMeal}
        busy={busyMealId === selectedMeal?._id}
        readOnly={viewingPastWeek}
        saved={
          selectedMeal ? savedRecipeIds.has(selectedMeal.recipe._id) : false
        }
        saving={
          selectedMeal ? savingRecipeId === selectedMeal.recipe._id : false
        }
        onClose={() => setSelectedMeal(null)}
        onSetStatus={handleSetStatus}
        onStartMove={handleStartMove}
        onSwapMeal={handleSwapMeal}
        onAdjustMeal={handleMealAdjustment}
        onToggleSavedRecipe={handleToggleSavedRecipe}
        onShareRecipe={(recipe, targetServings) =>
          void handleShareRecipe(recipe, "plan_detail", targetServings)
        }
        onStartCookMode={handleStartCookMode}
        onAddMissingIngredients={(meal, targetServings) =>
          void handleAddMissingIngredients(meal, targetServings)
        }
        addingMissingMealId={addingMissingMealId}
        adjustingMealId={adjustingMealId}
        avoidText={avoidText}
        savedAvoidText={savedAvoidText}
        canSaveAvoidPreference={!!myProfile && avoidText.trim().length > 0}
        onChangeAvoidText={setAvoidText}
        onSaveAvoidPreference={handleSaveAvoidPreference}
      />

      <CookModeModal
        visible={!!cookingMeal}
        recipe={cookingMeal?.recipe ?? null}
        isFinishing={finishingCookMode}
        onClose={() => setCookingMeal(null)}
        onStepViewed={(step) => {
          if (!cookingMeal) return;
          track(posthog, "cook_step_viewed", {
            source: "weekly_plan",
            recipe_id: cookingMeal.recipe._id,
            step,
          });
        }}
        onFinishCooking={handleFinishCookMode}
      />

      <GroceryReviewModal
        visible={showGroceryReview}
        missingGroups={groceryReview.groupedMissing}
        pantryCoveredCount={groceryReview.pantryCovered.length}
        isGenerating={isGeneratingGroceries}
        onClose={() => setShowGroceryReview(false)}
        onGenerate={() => void handleGenerateGroceries("plan_review_modal")}
      />
    </ScreenShell>
  );
}

function EmptyGuideRow({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-muted p-3">
      <Ionicons name={icon} size={16} color="#248f58" />
      <Text className="flex-1 text-xs font-semibold leading-4 text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function PlanLimitNotice({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
          <Ionicons name="sparkles" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Monthly planning limit reached
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            You can keep using pantry tracking, saved recipes, and grocery lists
            until weekly planning resets. Upgrade to Family to unlock unlimited
            weekly plans for everyone in the household.
          </Text>
          <TouchableOpacity
            onPress={onUpgrade}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
            accessibilityRole="button"
            accessibilityLabel="View Family plan"
          >
            <Ionicons name="people-outline" size={17} color="white" />
            <Text className="font-semibold text-white">View Family Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function UseFirstCard({ items }: { items: PantryItem[] }) {
  return (
    <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <View className="mb-3 flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
          <Ionicons name="time-outline" size={20} color="#b45309" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            Use this first
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Weekly planning prioritizes leftovers and pantry items closest to
            expiration.
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <View key={item._id} className="rounded-xl bg-white px-3 py-2">
            <Text className="text-sm font-semibold text-foreground">
              {item.name}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {getUseFirstLabel(item)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlanUpgradeNudge({
  plansUsed,
  plansLimit,
  onUpgrade,
}: {
  plansUsed: number;
  plansLimit: number;
  onUpgrade: () => void;
}) {
  const remaining = Math.max(plansLimit - plansUsed, 0);

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name="sparkles-outline" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            Planning for more than one week?
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            You have {remaining} free weekly plan
            {remaining === 1 ? "" : "s"} left this month. Family unlocks
            unlimited weekly planning and selected-eater plans.
          </Text>
          <TouchableOpacity
            onPress={onUpgrade}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 py-3"
            accessibilityRole="button"
            accessibilityLabel="See Family plan options"
          >
            <Ionicons name="people-outline" size={17} color="#248f58" />
            <Text className="font-semibold text-primary">See Family Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  members: Profile[];
  currentProfileId: string | null;
  audience: MealAudience;
  selectedProfileIds: string[];
  onChangeAudience: (value: MealAudience) => void;
  onToggleProfile: (profileId: string) => void;
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
    <View className="mb-4 rounded-xl bg-muted p-3">
      <View className="mb-3 flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name="people-outline" size={20} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            Who is this plan for?
          </Text>
          <Text className="mt-1 text-xs leading-4 text-muted-foreground">
            FamilyPlate merges allergies, dislikes, and preferences only for the
            eaters you choose.
          </Text>
        </View>
        <View className="rounded-full bg-card px-2 py-1">
          <Text className="text-xs font-bold text-muted-foreground">
            {selectedCount} selected
          </Text>
        </View>
      </View>

      <View className="mb-3 flex-row gap-2">
        <AudienceButton
          label="Family"
          icon="home-outline"
          active={audience === "whole"}
          onPress={() => onChangeAudience("whole")}
        />
        <AudienceButton
          label="Me"
          icon="person-outline"
          active={audience === "me"}
          onPress={() => onChangeAudience("me")}
        />
        <AudienceButton
          label="Pick"
          icon="checkbox-outline"
          active={audience === "selected"}
          onPress={() => onChangeAudience("selected")}
        />
      </View>

      {audience === "selected" ? (
        <View className="gap-2">
          {members.length > 0 ? (
            members.map((member) => {
              const selected = selectedProfileIds.includes(member._id);
              return (
                <TouchableOpacity
                  key={member._id}
                  onPress={() => onToggleProfile(member._id)}
                  className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-xl ${
                      selected ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        selected ? "text-white" : "text-foreground"
                      }`}
                    >
                      {member.name[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">
                      {member.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {member.isChild ? "Kid" : "Adult"} ·{" "}
                      {member.allergies.length} allergies ·{" "}
                      {member.dislikes.length} dislikes
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={selected ? "#248f58" : "#9a9489"}
                  />
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="rounded-xl bg-card p-3">
              <Text className="text-sm leading-5 text-muted-foreground">
                Add eater profiles in Settings to plan for selected people.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className="rounded-xl bg-card p-3">
          <Text className="text-xs leading-4 text-muted-foreground">
            {audience === "whole"
              ? "Planning will include every household eater profile."
              : "Planning will use your own profile only."}
          </Text>
        </View>
      )}
    </View>
  );
}

function AudienceButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1 rounded-xl border px-2 py-2.5 ${
        active ? "border-primary bg-primary/10" : "border-border bg-card"
      }`}
    >
      <Ionicons name={icon} size={15} color={active ? "#248f58" : "#686158"} />
      <Text
        className={`text-sm font-semibold ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MealCard({
  meal,
  busy,
  movingMealId,
  readOnly,
  saved,
  saving,
  onOpen,
  onSetStatus,
  onStartMove,
  onMoveToTarget,
  onToggleSavedRecipe,
  onStartCookMode,
}: {
  meal: PlannedMeal;
  busy: boolean;
  movingMealId: string | null;
  readOnly: boolean;
  saved: boolean;
  saving: boolean;
  onOpen: () => void;
  onSetStatus: (meal: PlannedMeal, status: MealStatus) => Promise<void>;
  onStartMove: (meal: PlannedMeal) => void;
  onMoveToTarget: (meal: PlannedMeal) => Promise<void>;
  onToggleSavedRecipe: (recipeId: Id<"recipeSuggestions">) => Promise<void>;
  onStartCookMode: (meal: PlannedMeal) => void;
}) {
  const date = formatMealDate(meal.date);
  const status = STATUS_STYLES[meal.status];
  const effort = getEffortColor(meal.recipe.effortLevel);
  const pantry = getPantryMatch(meal.recipe);
  const isMoveSource = movingMealId === meal._id;
  const isMoveTarget = !!movingMealId && movingMealId !== meal._id;
  const canMoveTarget = !readOnly && isMoveTarget && meal.status !== "cooked";

  return (
    <View
      className="rounded-2xl border border-border bg-card p-4"
      style={{
        borderColor: isMoveSource || canMoveTarget ? "#248f58" : "#e7e0d6",
      }}
    >
      {isMoveSource ? (
        <View className="mb-3 flex-row items-center gap-2 rounded-xl bg-primary/10 p-3">
          <Ionicons name="move-outline" size={16} color="#248f58" />
          <Text className="flex-1 text-sm font-semibold text-primary">
            Pick another dinner slot to swap dates.
          </Text>
        </View>
      ) : null}

      <View className="mb-3 flex-row items-start gap-3">
        <View className="w-14 items-center rounded-xl bg-muted px-2 py-2">
          <Text className="text-xs font-semibold uppercase text-muted-foreground">
            {date.weekday}
          </Text>
          <Text className="mt-1 text-sm font-bold text-foreground">
            {date.day}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (canMoveTarget) {
              void onMoveToTarget(meal);
              return;
            }

            if (isMoveSource) {
              onStartMove(meal);
              return;
            }

            onOpen();
          }}
          className="flex-1"
          accessibilityRole="button"
          accessibilityLabel={`Open ${meal.recipe.title} details`}
        >
          <View className="mb-2 flex-row items-center gap-2">
            <View
              className="flex-row items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: status.bg }}
            >
              <Ionicons name={status.icon} size={13} color={status.fg} />
              <Text
                className="text-xs font-semibold"
                style={{ color: status.fg }}
              >
                {status.label}
              </Text>
            </View>
            <View
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: effort.bg }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: effort.fg }}
              >
                {meal.recipe.effortLevel}
              </Text>
            </View>
          </View>
          <Text className="text-lg font-bold text-foreground">
            {meal.recipe.title}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            {meal.recipe.description}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mb-3 flex-row flex-wrap gap-2">
        <InfoPill
          icon="time-outline"
          label={`${meal.recipe.estimatedTime} min`}
        />
        <InfoPill
          icon="people-outline"
          label={`${meal.recipe.servings} servings`}
        />
        {meal.recipe.nutrition ? (
          <InfoPill
            icon="stats-chart-outline"
            label={`${Math.round(meal.recipe.nutrition.calories)} cal`}
          />
        ) : null}
        <InfoPill icon="leaf-outline" label={pantry.label} />
      </View>

      {readOnly ? (
        <View className="rounded-xl bg-muted p-3">
          <Text className="text-sm font-semibold text-foreground">
            Past week history
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Open dinner details to review ingredients and progress. Return to
            Current Week to cook, move, or update this dinner.
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation();
              onStartCookMode(meal);
            }}
            disabled={busy}
            className="mb-2 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2.5"
            style={{ opacity: busy ? 0.55 : 1 }}
            accessibilityRole="button"
            accessibilityLabel="Start Cook Mode"
          >
            <Ionicons name="restaurant-outline" size={16} color="white" />
            <Text className="font-semibold text-white">Start Cook Mode</Text>
          </TouchableOpacity>

          <View className="flex-row gap-2">
            {meal.status !== "cooked" ? (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  void onSetStatus(meal, "cooked");
                }}
                disabled={busy}
                className="flex-1 items-center rounded-xl bg-primary py-2.5"
                style={{ opacity: busy ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Mark dinner cooked"
              >
                <Text className="font-semibold text-white">
                  {busy ? "Saving..." : "Cooked"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  void onSetStatus(meal, "planned");
                }}
                disabled={busy}
                className="flex-1 items-center rounded-xl border border-border bg-card py-2.5"
                style={{ opacity: busy ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Plan dinner again"
              >
                <Text className="font-semibold text-primary">Plan Again</Text>
              </TouchableOpacity>
            )}

            {meal.status !== "skipped" ? (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  void onSetStatus(meal, "skipped");
                }}
                disabled={busy}
                className="flex-1 items-center rounded-xl border border-border bg-card py-2.5"
                style={{ opacity: busy ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Skip dinner"
              >
                <Text className="font-semibold text-foreground">Skip</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  void onSetStatus(meal, "planned");
                }}
                disabled={busy}
                className="flex-1 items-center rounded-xl border border-border bg-card py-2.5"
                style={{ opacity: busy ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Plan dinner"
              >
                <Text className="font-semibold text-foreground">Plan</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mt-2 flex-row gap-2">
            {isMoveTarget ? (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  if (canMoveTarget) void onMoveToTarget(meal);
                }}
                disabled={busy || !canMoveTarget}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2.5"
                style={{ opacity: busy || !canMoveTarget ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel={
                  canMoveTarget ? "Move dinner here" : "Dinner slot locked"
                }
              >
                <Ionicons name="swap-horizontal" size={16} color="white" />
                <Text className="font-semibold text-white">
                  {canMoveTarget ? "Move Here" : "Locked"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  onStartMove(meal);
                }}
                disabled={busy || meal.status === "cooked"}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5"
                style={{ opacity: busy || meal.status === "cooked" ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel={
                  isMoveSource ? "Cancel dinner move" : "Move dinner"
                }
              >
                <Ionicons name="move-outline" size={16} color="#248f58" />
                <Text className="font-semibold text-primary">
                  {isMoveSource ? "Cancel Move" : "Move"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                void onToggleSavedRecipe(meal.recipe._id);
              }}
              disabled={saving}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5"
              style={{ opacity: saving ? 0.55 : 1 }}
              accessibilityRole="button"
              accessibilityLabel={
                saved ? "Remove from cookbook" : "Save to cookbook"
              }
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={16}
                color="#248f58"
              />
              <Text className="font-semibold text-primary">
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function InfoPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-muted px-2 py-1">
      <Ionicons name={icon} size={13} color="#686158" />
      <Text className="text-xs font-semibold text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function AdjustmentButton({
  label,
  icon,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="min-w-[46%] flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
      style={{ opacity: disabled && !busy ? 0.55 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator color="#248f58" />
      ) : (
        <Ionicons name={icon} size={16} color="#248f58" />
      )}
      <Text className="text-sm font-semibold text-primary">{label}</Text>
    </TouchableOpacity>
  );
}

function GroceryReviewModal({
  visible,
  missingGroups,
  pantryCoveredCount,
  isGenerating,
  onClose,
  onGenerate,
}: {
  visible: boolean;
  missingGroups: [string, GroceryReviewItem[]][];
  pantryCoveredCount: number;
  isGenerating: boolean;
  onClose: () => void;
  onGenerate: () => void;
}) {
  const missingCount = missingGroups.reduce(
    (count, [, items]) => count + items.length,
    0,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[82%] rounded-t-3xl bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-bold text-foreground">
              Grocery Review
            </Text>
            <Pressable
              onPress={onClose}
              disabled={isGenerating}
              className="h-10 w-10 items-center justify-center rounded-full bg-muted"
            >
              <Ionicons name="close" size={22} color="#26211b" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          >
            <View className="mb-4 rounded-2xl border border-border bg-card p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Ionicons name="basket-outline" size={22} color="#248f58" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">
                    Review before adding
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                    FamilyPlate will add missing planned-dinner ingredients to
                    Grocery and leave pantry-covered items out.
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row gap-2">
                <View className="flex-1 rounded-xl bg-muted p-3">
                  <Text className="text-2xl font-bold text-foreground">
                    {missingCount}
                  </Text>
                  <Text className="text-xs font-semibold text-muted-foreground">
                    to buy
                  </Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted p-3">
                  <Text className="text-2xl font-bold text-foreground">
                    {pantryCoveredCount}
                  </Text>
                  <Text className="text-xs font-semibold text-muted-foreground">
                    already in pantry
                  </Text>
                </View>
              </View>
            </View>

            {missingGroups.length === 0 ? (
              <View className="items-center rounded-2xl border border-border bg-card p-5">
                <Ionicons name="checkmark-circle" size={28} color="#248f58" />
                <Text className="mt-2 text-center text-base font-bold text-foreground">
                  Pantry covers this plan
                </Text>
                <Text className="mt-1 text-center text-sm leading-5 text-muted-foreground">
                  No missing ingredients were found for planned dinners.
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {missingGroups.map(([category, items]) => (
                  <View key={category}>
                    <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {category}
                    </Text>
                    <View className="gap-2">
                      {items.map((item) => (
                        <View
                          key={`${item.name}-${item.unit}`}
                          className="flex-row items-center gap-3 rounded-xl bg-card p-3"
                        >
                          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Ionicons
                              name="cart-outline"
                              size={16}
                              color="#248f58"
                            />
                          </View>
                          <Text className="flex-1 text-sm font-semibold text-foreground">
                            {item.quantity} {item.unit} {item.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View className="mt-5 flex-row gap-2">
              <TouchableOpacity
                onPress={onClose}
                disabled={isGenerating}
                className="flex-1 items-center rounded-xl border border-border bg-card py-3"
              >
                <Text className="font-semibold text-muted-foreground">
                  Not Now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onGenerate}
                disabled={isGenerating || missingCount === 0}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
                style={{
                  opacity: isGenerating || missingCount === 0 ? 0.55 : 1,
                }}
              >
                {isGenerating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="cart" size={17} color="white" />
                )}
                <Text className="font-semibold text-white">
                  {isGenerating ? "Adding..." : "Add to Grocery"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MealDetailModal({
  meal,
  busy,
  readOnly,
  saved,
  saving,
  onClose,
  onSetStatus,
  onStartMove,
  onSwapMeal,
  onAdjustMeal,
  onToggleSavedRecipe,
  onShareRecipe,
  onStartCookMode,
  onAddMissingIngredients,
  addingMissingMealId,
  adjustingMealId,
  avoidText,
  savedAvoidText,
  canSaveAvoidPreference,
  onChangeAvoidText,
  onSaveAvoidPreference,
}: {
  meal: PlannedMeal | null;
  busy: boolean;
  readOnly: boolean;
  saved: boolean;
  saving: boolean;
  onClose: () => void;
  onSetStatus: (meal: PlannedMeal, status: MealStatus) => Promise<void>;
  onStartMove: (meal: PlannedMeal) => void;
  onSwapMeal: (
    meal: PlannedMeal,
    recipeId: Id<"recipeSuggestions">,
  ) => Promise<void>;
  onAdjustMeal: (
    meal: PlannedMeal,
    adjustmentType: AdjustmentType,
  ) => Promise<void>;
  onToggleSavedRecipe: (recipeId: Id<"recipeSuggestions">) => Promise<void>;
  onShareRecipe: (recipe: Recipe, targetServings: number) => void;
  onStartCookMode: (meal: PlannedMeal) => void;
  onAddMissingIngredients: (
    meal: PlannedMeal,
    targetServings: number,
  ) => void;
  addingMissingMealId: string | null;
  adjustingMealId: string | null;
  avoidText: string;
  savedAvoidText: string;
  canSaveAvoidPreference: boolean;
  onChangeAvoidText: (value: string) => void;
  onSaveAvoidPreference: () => Promise<void>;
}) {
  const mealId = meal?._id;
  const mealServings = meal?.recipe.servings ?? 1;
  const [targetServings, setTargetServings] = useState(
    mealServings,
  );

  useEffect(() => {
    if (!mealId) return;
    setTargetServings(mealServings);
  }, [mealId, mealServings]);

  if (!meal) return null;

  const recipe = meal.recipe;
  const status = STATUS_STYLES[meal.status];
  const pantry = getPantryMatch(recipe);

  const scaledIngredients = scaleIngredients(
    recipe.ingredients,
    recipe.servings,
    targetServings,
  );
  const missingIngredients = scaledIngredients.filter(
    (ingredient) => !isIngredientAvailable(ingredient),
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[86%] rounded-t-3xl bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-bold text-foreground">
              Dinner Details
            </Text>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-muted"
            >
              <Ionicons name="close" size={22} color="#26211b" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          >
            <View
              className="mb-3 self-start flex-row items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: status.bg }}
            >
              <Ionicons name={status.icon} size={13} color={status.fg} />
              <Text
                className="text-xs font-semibold"
                style={{ color: status.fg }}
              >
                {status.label}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-foreground">
              {recipe.title}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted-foreground">
              {recipe.description}
            </Text>

            {readOnly ? (
              <View className="mt-4 flex-row items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#b45309"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    Past week dinners are locked
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                    Review this recipe without changing dinner status, groceries,
                    pantry history, or cook-mode progress. Return to Current
                    Week for edits.
                  </Text>
                </View>
              </View>
            ) : null}

            <View className="my-4 flex-row flex-wrap gap-2">
              <InfoPill
                icon="time-outline"
                label={`${recipe.estimatedTime} min`}
              />
              <InfoPill
                icon="people-outline"
                label={formatServingsLabel(recipe.servings)}
              />
              <InfoPill icon="leaf-outline" label={pantry.label} />
            </View>

            {recipe.nutrition ? (
              <View className="mb-5">
                <RecipeNutrition nutrition={recipe.nutrition} />
              </View>
            ) : null}

            <ServingsAdjuster
              title="Adjust servings"
              subtitle="Scale ingredient quantities before you cook, share, or send just this dinner's missing items to Grocery."
              originalServings={recipe.servings}
              targetServings={targetServings}
              disabled={busy || saving || addingMissingMealId === meal._id}
              onChangeServings={setTargetServings}
            />

            {!readOnly ? (
              <>
                <TouchableOpacity
                  onPress={() =>
                    void onAddMissingIngredients(meal, targetServings)
                  }
                  disabled={
                    addingMissingMealId === meal._id ||
                    missingIngredients.length === 0
                  }
                  className="mb-5 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
                  style={{
                    opacity:
                      addingMissingMealId === meal._id ||
                      missingIngredients.length === 0
                        ? 0.55
                        : 1,
                  }}
                >
                  {addingMissingMealId === meal._id ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Ionicons name="cart-outline" size={18} color="white" />
                  )}
                  <Text className="font-semibold text-white">
                    {addingMissingMealId === meal._id
                      ? "Adding..."
                      : `Add missing for ${formatServingsLabel(targetServings)}`}
                  </Text>
                </TouchableOpacity>

                <Text className="mb-2 text-base font-bold text-foreground">
                  Adjust This Dinner
                </Text>
                <View className="mb-5 rounded-2xl border border-border bg-card p-3">
                  <View className="flex-row flex-wrap gap-2">
                    <AdjustmentButton
                      label="Swap meal"
                      icon="swap-horizontal"
                      busy={adjustingMealId === `${meal._id}:swap`}
                      disabled={
                        busy || meal.status === "cooked" || !!adjustingMealId
                      }
                      onPress={() => void onAdjustMeal(meal, "swap")}
                    />
                    <AdjustmentButton
                      label="Make faster"
                      icon="flash-outline"
                      busy={adjustingMealId === `${meal._id}:faster`}
                      disabled={
                        busy || meal.status === "cooked" || !!adjustingMealId
                      }
                      onPress={() => void onAdjustMeal(meal, "faster")}
                    />
                    <AdjustmentButton
                      label="Kid-friendly"
                      icon="happy-outline"
                      busy={adjustingMealId === `${meal._id}:kid_friendly`}
                      disabled={
                        busy || meal.status === "cooked" || !!adjustingMealId
                      }
                      onPress={() => void onAdjustMeal(meal, "kid_friendly")}
                    />
                    <AdjustmentButton
                      label="Use pantry"
                      icon="cube-outline"
                      busy={adjustingMealId === `${meal._id}:use_pantry`}
                      disabled={
                        busy || meal.status === "cooked" || !!adjustingMealId
                      }
                      onPress={() => void onAdjustMeal(meal, "use_pantry")}
                    />
                    <AdjustmentButton
                      label="Regenerate day"
                      icon="refresh-outline"
                      busy={adjustingMealId === `${meal._id}:regenerate_day`}
                      disabled={
                        busy || meal.status === "cooked" || !!adjustingMealId
                      }
                      onPress={() => void onAdjustMeal(meal, "regenerate_day")}
                    />
                  </View>

                  <View className="mt-3 rounded-xl bg-muted p-3">
                    <Text className="mb-2 text-sm font-semibold text-foreground">
                      Avoid something next time
                    </Text>
                    <TextInput
                      value={avoidText}
                      onChangeText={onChangeAvoidText}
                      placeholder="Example: beef, spicy meals, casseroles"
                      placeholderTextColor="#9a9489"
                      className="rounded-xl border border-border bg-background px-3 py-3 text-foreground"
                      editable={!adjustingMealId}
                    />
                    <View className="mt-2 flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => void onAdjustMeal(meal, "avoid")}
                        disabled={
                          busy ||
                          meal.status === "cooked" ||
                          !!adjustingMealId ||
                          avoidText.trim().length === 0
                        }
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2.5"
                        style={{
                          opacity:
                            busy ||
                            meal.status === "cooked" ||
                            !!adjustingMealId ||
                            avoidText.trim().length === 0
                              ? 0.55
                              : 1,
                        }}
                      >
                        {adjustingMealId === `${meal._id}:avoid` ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Ionicons
                            name="ban-outline"
                            size={16}
                            color="white"
                          />
                        )}
                        <Text className="font-semibold text-white">Adjust</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void onSaveAvoidPreference()}
                        disabled={
                          !canSaveAvoidPreference ||
                          savedAvoidText === avoidText.trim()
                        }
                        className="flex-1 items-center rounded-xl border border-border bg-card py-2.5"
                        style={{
                          opacity:
                            !canSaveAvoidPreference ||
                            savedAvoidText === avoidText.trim()
                              ? 0.55
                              : 1,
                        }}
                      >
                        <Text className="font-semibold text-primary">
                          {savedAvoidText === avoidText.trim()
                            ? "Saved"
                            : "Save dislike"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => onStartCookMode(meal)}
                  className="mb-5 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
                  accessibilityRole="button"
                  accessibilityLabel="Start Cook Mode"
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={18}
                    color="white"
                  />
                  <Text className="font-semibold text-white">
                    Start Cook Mode
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            <Text className="mb-2 text-base font-bold text-foreground">
              Ingredients
            </Text>
            <View className="mb-5 gap-2">
              {scaledIngredients.map((ingredient, index) => (
                <View
                  key={`${ingredient.name}-${index}`}
                  className="flex-row items-center gap-3 rounded-xl bg-card p-3"
                >
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      isIngredientAvailable(ingredient)
                        ? "bg-primary/10"
                        : "bg-muted"
                    }`}
                  >
                    <Ionicons
                      name={
                        isIngredientAvailable(ingredient)
                          ? "checkmark"
                          : "basket-outline"
                      }
                      size={16}
                      color={
                        isIngredientAvailable(ingredient)
                          ? "#248f58"
                          : "#686158"
                      }
                    />
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-foreground">
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="mb-2 text-base font-bold text-foreground">
              Instructions
            </Text>
            <View className="mb-5 gap-3">
              {recipe.instructions.map((step, index) => (
                <View key={`${step}-${index}`} className="flex-row gap-3">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-xs font-bold text-primary">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-sm leading-5 text-muted-foreground">
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            {!readOnly && meal.alternatives.length > 0 ? (
              <>
                <Text className="mb-2 text-base font-bold text-foreground">
                  Swap Dinner
                </Text>
                <View className="mb-5 gap-2">
                  {meal.alternatives.map((alternative) => (
                    <View
                      key={alternative._id}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <Text className="font-semibold text-foreground">
                        {alternative.title}
                      </Text>
                      <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                        {alternative.estimatedTime} min ·{" "}
                        {alternative.effortLevel}
                      </Text>
                      <TouchableOpacity
                        onPress={() => void onSwapMeal(meal, alternative._id)}
                        disabled={busy || meal.status === "cooked"}
                        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5"
                        style={{
                          opacity: busy || meal.status === "cooked" ? 0.55 : 1,
                        }}
                      >
                        <Ionicons
                          name="swap-horizontal"
                          size={16}
                          color="#248f58"
                        />
                        <Text className="font-semibold text-primary">
                          Swap to this
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <View className="mb-2 flex-row gap-2">
              {!readOnly ? (
                <TouchableOpacity
                  onPress={() => onStartMove(meal)}
                  disabled={busy || meal.status === "cooked"}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
                  style={{
                    opacity: busy || meal.status === "cooked" ? 0.55 : 1,
                  }}
                >
                  <Ionicons name="move-outline" size={17} color="#248f58" />
                  <Text className="font-semibold text-primary">Move</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => void onToggleSavedRecipe(recipe._id)}
                disabled={saving}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
                style={{ opacity: saving ? 0.55 : 1 }}
              >
                <Ionicons
                  name={saved ? "heart" : "heart-outline"}
                  size={17}
                  color="#248f58"
                />
                <Text className="font-semibold text-primary">
                  {saving ? "Saving..." : saved ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onShareRecipe(recipe, targetServings)}
                className={`${readOnly ? "flex-1" : "h-12 w-12"} items-center justify-center rounded-xl border border-border bg-card`}
                accessibilityRole="button"
                accessibilityLabel={`Share ${recipe.title}`}
              >
                <Ionicons name="share-outline" size={18} color="#248f58" />
                {readOnly ? (
                  <Text className="mt-1 font-semibold text-primary">Share</Text>
                ) : null}
              </TouchableOpacity>
            </View>

            {!readOnly ? (
              <>
                <View className="flex-row gap-2">
                  {meal.status !== "cooked" ? (
                    <TouchableOpacity
                      onPress={() => void onSetStatus(meal, "cooked")}
                      disabled={busy}
                      className="flex-1 items-center rounded-xl bg-primary py-3"
                      style={{ opacity: busy ? 0.55 : 1 }}
                    >
                      <Text className="font-semibold text-white">
                        {busy ? "Saving..." : "Mark Cooked"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => void onSetStatus(meal, "planned")}
                      disabled={busy}
                      className="flex-1 items-center rounded-xl border border-border bg-card py-3"
                      style={{ opacity: busy ? 0.55 : 1 }}
                    >
                      <Text className="font-semibold text-primary">
                        Plan Again
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      void onSetStatus(
                        meal,
                        meal.status === "skipped" ? "planned" : "skipped",
                      )
                    }
                    disabled={busy}
                    className="flex-1 items-center rounded-xl border border-border bg-card py-3"
                    style={{ opacity: busy ? 0.55 : 1 }}
                  >
                    <Text className="font-semibold text-foreground">
                      {meal.status === "skipped" ? "Plan" : "Skip"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {meal.status === "cooked" ? (
                  <View className="mt-5">
                    <RecipeFeedback
                      recipeId={recipe._id as Id<"recipeSuggestions">}
                    />
                  </View>
                ) : (
                  <View className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
                    <View className="flex-row items-start gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <Ionicons
                          name="restaurant-outline"
                          size={18}
                          color="#248f58"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">
                          Cook, then rate it
                        </Text>
                        <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                          Mark this dinner cooked to update pantry and record
                          what your family thought.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color="#248f58"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">
                      Past week history stays preserved
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                      FamilyPlate keeps older dinner results locked so your
                      household history does not drift after the week is over.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
