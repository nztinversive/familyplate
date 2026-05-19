import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc, Id } from "@familyplate/convex/_generated/dataModel";
import { usePostHog } from "posthog-react-native";
import { RecipeFeedback } from "@/components/RecipeFeedback";
import { ScreenShell } from "@/components/ScreenShell";
import { LoadingCard } from "@/components/LoadingCard";
import { ensureAiConsent } from "@/lib/aiConsent";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type Recipe = Doc<"recipeSuggestions">;
type Profile = Doc<"userProfiles">;
type PlannedMeal = Doc<"plannedMeals"> & {
  recipe: Recipe;
  alternatives: Recipe[];
};
type MealStatus = PlannedMeal["status"];
type MealAudience = "whole" | "me" | "selected";

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

export default function PlanScreen() {
  const posthog = usePostHog();
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
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
  const generateCuratedPlan = useMutation(
    api.mutations.planner.generatePlaceholderPlan,
  );
  const updateMealStatus = useMutation(api.mutations.planner.updateMealStatus);
  const swapMeal = useMutation(api.mutations.planner.swapMeal);
  const swapMealDates = useMutation(api.mutations.planner.swapMealDates);
  const generateGroceryList = useMutation(
    api.mutations.grocery.generateFromPlan,
  );
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const saveRecipe = useMutation(api.mutations.savedRecipes.saveRecipe);
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);

  const [selectedMeal, setSelectedMeal] = useState<PlannedMeal | null>(null);
  const [busyMealId, setBusyMealId] = useState<string | null>(null);
  const [movingMealId, setMovingMealId] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGroceries, setIsGeneratingGroceries] = useState(false);
  const [mealAudience, setMealAudience] = useState<MealAudience>("whole");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const meals = useMemo(
    () => (mealPlan?.meals ?? []) as PlannedMeal[],
    [mealPlan?.meals],
  );
  const cookedCount = meals.filter((meal) => meal.status === "cooked").length;
  const skippedCount = meals.filter((meal) => meal.status === "skipped").length;
  const activeCount = meals.length - skippedCount;
  const progressPct =
    activeCount > 0 ? Math.round((cookedCount / activeCount) * 100) : 0;
  const savedRecipeIds = useMemo(() => {
    return new Set(savedRecipes?.map((saved) => saved.recipe._id) ?? []);
  }, [savedRecipes]);
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

  const handleGeneratePlan = async () => {
    if (subscription && !subscription.canGenerate) {
      setError(
        `You've used ${subscription.plansUsed}/${subscription.plansLimit} free plans this month. Pantry, cookbook, and grocery list tools are still available.`,
      );
      return;
    }

    const consented = await ensureAiConsent();
    if (!consented) {
      setError("AI meal planning needs your permission before it can use your household details.");
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
        selected_eater_count: audienceProfileIds?.length ?? (members?.length ?? 0),
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
          selected_eater_count: audienceProfileIds?.length ?? (members?.length ?? 0),
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
      if (selectedMeal?._id === meal._id) {
        setSelectedMeal({ ...meal, status });
      }
      if (status === "cooked" && meal.status !== "cooked") {
        setNotice(
          "Dinner marked cooked. Pantry updated, and feedback is ready in dinner details.",
        );
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

  const handleGenerateGroceries = async () => {
    setIsGeneratingGroceries(true);
    setError("");
    setNotice("");
    try {
      await generateGroceryList({});
      track(posthog, "grocery_list_generated", {
        source: "weekly_plan",
        meal_count: meals.length,
      });
      setNotice("Grocery list updated from your planned dinners.");
    } catch (err) {
      track(posthog, "grocery_list_generation_failed", {
        source: "weekly_plan",
        meal_count: meals.length,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "grocery", action: "generate_from_plan", platform: "ios" },
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
      setMovingMealId(null);
      setSelectedMeal(null);
      setNotice("Dinner swapped with an alternative.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyMealId(null);
    }
  };

  const handleStartMove = (meal: PlannedMeal) => {
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
        mealPlan
          ? `${formatWeekRange(mealPlan.plan.weekStartDate)} dinner plan`
          : "Build a seven-night dinner plan."
      }
    >
      <View className="mb-4 rounded-2xl border border-border bg-card p-4">
        <View className="mb-4 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              This week
            </Text>
            <Text className="mt-1 text-2xl font-bold text-foreground">
              {formatWeekRange(mealPlan?.plan.weekStartDate)}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              {meals.length > 0
                ? `${cookedCount}/${activeCount} dinners cooked`
                : "Generate a plan to fill the week."}
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
            onPress={() => void handleGeneratePlan()}
            disabled={generateDisabled}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
            style={{
              opacity: generateDisabled ? 0.55 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel={meals.length ? "Refresh weekly plan" : "Generate weekly plan"}
            accessibilityHint={generateDisabledReason || undefined}
          >
            {isGenerating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="sparkles" size={18} color="white" />
            )}
            <Text className="font-semibold text-white">
              {isGenerating
                ? "Building plan..."
                : meals.length
                  ? "Refresh"
                  : "Generate"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void handleGenerateGroceries()}
            disabled={isGeneratingGroceries || meals.length === 0}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
            style={{
              opacity: isGeneratingGroceries || meals.length === 0 ? 0.55 : 1,
            }}
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
        <PlanLimitNotice />
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

      {mealPlan === undefined ? (
        <LoadingCard
          icon="calendar-outline"
          title="Loading weekly plan"
          detail="Checking this week's dinners and pantry matches."
        />
      ) : meals.length === 0 ? (
        <View className="items-center rounded-2xl border border-border bg-card p-6">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons name="calendar" size={26} color="#248f58" />
          </View>
          <Text className="mb-1 text-center text-lg font-semibold text-foreground">
            No dinner plan yet
          </Text>
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            Generate a weekly plan from your pantry, preferences, and household
            size.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {meals.map((meal) => (
            <MealCard
              key={meal._id}
              meal={meal}
              busy={busyMealId === meal._id}
              movingMealId={movingMealId}
              saved={savedRecipeIds.has(meal.recipe._id)}
              saving={savingRecipeId === meal.recipe._id}
              onOpen={() => setSelectedMeal(meal)}
              onSetStatus={handleSetStatus}
              onStartMove={handleStartMove}
              onMoveToTarget={handleMoveToTarget}
              onToggleSavedRecipe={handleToggleSavedRecipe}
            />
          ))}
        </View>
      )}

      <MealDetailModal
        meal={selectedMeal}
        busy={busyMealId === selectedMeal?._id}
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
        onToggleSavedRecipe={handleToggleSavedRecipe}
      />
    </ScreenShell>
  );
}

function PlanLimitNotice() {
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
            You can keep using pantry tracking, saved recipes, and grocery
            lists until weekly planning resets. Upgrade from Settings &gt; Plan
            Usage to unlock unlimited weekly plans.
          </Text>
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
            FamilyPlate merges allergies, dislikes, and preferences only for
            the eaters you choose.
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
  saved,
  saving,
  onOpen,
  onSetStatus,
  onStartMove,
  onMoveToTarget,
  onToggleSavedRecipe,
}: {
  meal: PlannedMeal;
  busy: boolean;
  movingMealId: string | null;
  saved: boolean;
  saving: boolean;
  onOpen: () => void;
  onSetStatus: (meal: PlannedMeal, status: MealStatus) => Promise<void>;
  onStartMove: (meal: PlannedMeal) => void;
  onMoveToTarget: (meal: PlannedMeal) => Promise<void>;
  onToggleSavedRecipe: (recipeId: Id<"recipeSuggestions">) => Promise<void>;
}) {
  const date = formatMealDate(meal.date);
  const status = STATUS_STYLES[meal.status];
  const effort = getEffortColor(meal.recipe.effortLevel);
  const pantry = getPantryMatch(meal.recipe);
  const isMoveSource = movingMealId === meal._id;
  const isMoveTarget = !!movingMealId && movingMealId !== meal._id;
  const canMoveTarget = isMoveTarget && meal.status !== "cooked";

  return (
    <Pressable
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
      className="rounded-2xl border border-border bg-card p-4"
      accessible={false}
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
        <View className="flex-1">
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
        </View>
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
        <InfoPill icon="leaf-outline" label={pantry.label} />
      </View>

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
            accessibilityLabel={canMoveTarget ? "Move dinner here" : "Dinner slot locked"}
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
            accessibilityLabel={isMoveSource ? "Cancel dinner move" : "Move dinner"}
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
    </Pressable>
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

function MealDetailModal({
  meal,
  busy,
  saved,
  saving,
  onClose,
  onSetStatus,
  onStartMove,
  onSwapMeal,
  onToggleSavedRecipe,
}: {
  meal: PlannedMeal | null;
  busy: boolean;
  saved: boolean;
  saving: boolean;
  onClose: () => void;
  onSetStatus: (meal: PlannedMeal, status: MealStatus) => Promise<void>;
  onStartMove: (meal: PlannedMeal) => void;
  onSwapMeal: (
    meal: PlannedMeal,
    recipeId: Id<"recipeSuggestions">,
  ) => Promise<void>;
  onToggleSavedRecipe: (recipeId: Id<"recipeSuggestions">) => Promise<void>;
}) {
  if (!meal) return null;

  const recipe = meal.recipe;
  const status = STATUS_STYLES[meal.status];
  const pantry = getPantryMatch(recipe);

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

            <View className="my-4 flex-row flex-wrap gap-2">
              <InfoPill
                icon="time-outline"
                label={`${recipe.estimatedTime} min`}
              />
              <InfoPill
                icon="people-outline"
                label={`${recipe.servings} servings`}
              />
              <InfoPill icon="leaf-outline" label={pantry.label} />
            </View>

            <Text className="mb-2 text-base font-bold text-foreground">
              Ingredients
            </Text>
            <View className="mb-5 gap-2">
              {recipe.ingredients.map((ingredient, index) => (
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

            {meal.alternatives.length > 0 ? (
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
              <TouchableOpacity
                onPress={() => onStartMove(meal)}
                disabled={busy || meal.status === "cooked"}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
                style={{ opacity: busy || meal.status === "cooked" ? 0.55 : 1 }}
              >
                <Ionicons name="move-outline" size={17} color="#248f58" />
                <Text className="font-semibold text-primary">Move</Text>
              </TouchableOpacity>
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
            </View>

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
                  <Text className="font-semibold text-primary">Plan Again</Text>
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
                      Mark this dinner cooked to update pantry and record what
                      your family thought.
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
