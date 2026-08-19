import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc, Id } from "@familyplate/convex/_generated/dataModel";
import { usePostHog } from "posthog-react-native";
import {
  CookModeModal,
  type CookModeLeftover,
} from "@/components/CookModeModal";
import { CustomRecipeModal } from "@/components/CustomRecipeModal";
import { RecipeFeedback } from "@/components/RecipeFeedback";
import { RecipeNutrition } from "@/components/RecipeNutrition";
import { ReportAiContentButton } from "@/components/ReportAiContentButton";
import { ScreenShell } from "@/components/ScreenShell";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { LoadingCard } from "@/components/LoadingCard";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";
import { inferCategory } from "@/lib/pantry";
import {
  buildScaledRecipeShareText,
  formatServingsLabel,
  scaleIngredients,
  scaleQuantity,
} from "@/lib/recipeScaling";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type Recipe = Doc<"recipeSuggestions">;
type RecipeIngredient = Recipe["ingredients"][number];
type PlannedMeal = Doc<"plannedMeals"> & {
  recipe: Recipe;
  alternatives: Recipe[];
};
type RecentlyCookedMeal = {
  _id: string;
  date: string;
  recipe: Recipe;
  feedbackCount: number;
  averageRating: number | null;
  topTags: string[];
};
type WeekDay = {
  date: string;
  weekday: string;
  day: string;
};

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

function getCurrentWeekDays() {
  const weekStart = getStartOfWeek(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      date: formatDate(date),
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      day: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  });
}

function formatSavedDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getEffortColor(level: string) {
  if (level === "easy") return { bg: "#dcfce7", fg: "#166534" };
  if (level === "medium") return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

function getSourceLabel(source: Recipe["source"]) {
  if (source === "custom") return "Custom";
  if (source === "curated") return "Curated";
  return "AI";
}

export default function CookbookScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});
  const recentlyCooked = useQuery(api.queries.planner.getRecentlyCookedMeals, {
    limit: 5,
  });
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);
  const addRecipeToPlan = useMutation(api.mutations.planner.addRecipeToPlan);
  const addPantryItem = useMutation(api.mutations.pantry.addItem);
  const addGroceryItem = useMutation(api.mutations.grocery.addMyCustomItem);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [planningRecipeId, setPlanningRecipeId] = useState<string | null>(null);
  const [addingPlanId, setAddingPlanId] = useState<string | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingMissingId, setAddingMissingId] = useState<string | null>(null);
  const [finishingCookMode, setFinishingCookMode] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showPlanShortcut, setShowPlanShortcut] = useState(false);
  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const mealsByDate = useMemo(() => {
    const entries = (mealPlan?.meals ?? []) as PlannedMeal[];
    return new Map(entries.map((meal) => [meal.date, meal]));
  }, [mealPlan?.meals]);

  const removeRecipe = (recipe: Recipe) => {
    setNotice("");
    setError("");
    setShowPlanShortcut(false);
    Alert.alert(
      "Remove from Cookbook?",
      `${recipe.title} will stay available in generated history, but it will no longer be saved here.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setRemovingId(recipe._id);
            void unsaveRecipe({
              recipeId: recipe._id as Id<"recipeSuggestions">,
            })
              .then(() => {
                track(posthog, "recipe_unsaved", {
                  source: "cookbook",
                });
              })
              .catch((err) => {
                Sentry.captureException(err, {
                  tags: { area: "cookbook", action: "remove_recipe", platform: process.env.EXPO_OS ?? "unknown" },
                });
                setError(
                  err instanceof Error
                    ? err.message
                    : "Couldn't remove recipe from Cookbook.",
                );
              })
              .finally(() => {
                setRemovingId(null);
                if (expandedId === recipe._id) setExpandedId(null);
              });
          },
        },
      ],
    );
  };

  const addMissingToGrocery = async (recipe: Recipe, targetServings: number) => {
    const missing = recipe.ingredients.filter(
      (ingredient) => !isIngredientAvailable(ingredient),
    );
    if (missing.length === 0) return;

    const scaleFactor = targetServings / recipe.servings;
    setAddingMissingId(recipe._id);
    setNotice("");
    setError("");
    setShowPlanShortcut(false);

    try {
      for (const ingredient of missing) {
        await addGroceryItem({
          name: ingredient.name,
          quantity: scaleQuantity(ingredient.quantity, scaleFactor),
          unit: ingredient.unit,
          category: inferCategory(ingredient.name),
        });
      }
      track(posthog, "grocery_item_added", {
        source: "cookbook_missing_ingredients",
        count: missing.length,
      });
      track(posthog, "missing_ingredients_added_to_grocery", {
        source: "cookbook",
        count: missing.length,
        target_servings: targetServings,
      });
      setNotice(
        `Added ${missing.length} missing item${
          missing.length === 1 ? "" : "s"
        } for ${targetServings} serving${
          targetServings === 1 ? "" : "s"
        } to Grocery List.`,
      );
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "cookbook", action: "add_missing_to_grocery", platform: process.env.EXPO_OS ?? "unknown" },
      });
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't add missing ingredients to Grocery List.",
      );
    } finally {
      setAddingMissingId(null);
    }
  };

  const startCookMode = (recipe: Recipe) => {
    setCookingRecipe(recipe);
    setNotice("");
    setError("");
    setShowPlanShortcut(false);
    track(posthog, "cook_mode_started", {
      source: "cookbook",
      recipe_id: recipe._id,
    });
  };

  const scheduleRecipe = async (
    recipe: Recipe,
    date: string,
    source: string,
  ) => {
    setAddingPlanId(`${recipe._id}:${date}`);
    setNotice("");
    setError("");
    setShowPlanShortcut(false);

    try {
      const result = await addRecipeToPlan({
        recipeId: recipe._id as Id<"recipeSuggestions">,
        date,
      });
      const dateLabel = parseDate(date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      track(posthog, "recipe_added_to_plan", {
        source,
        recipe_id: recipe._id,
        date,
        replaced: result.replaced,
      });
      setPlanningRecipeId(null);
      setExpandedId(recipe._id);
      setShowPlanShortcut(true);
      setNotice(
        `${recipe.title} ${result.replaced ? "replaced dinner" : "was added"} for ${dateLabel}.`,
      );
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "cookbook", action: "add_recipe_to_plan", platform: process.env.EXPO_OS ?? "unknown" },
      });
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't add this recipe to your weekly plan.",
      );
    } finally {
      setAddingPlanId(null);
    }
  };

  const shareRecipe = async (recipe: Recipe, targetServings: number) => {
    setNotice("");
    setError("");
    setShowPlanShortcut(false);

    try {
      await Share.share({
        title: recipe.title,
        message: buildScaledRecipeShareText(recipe, targetServings),
      });
      track(posthog, "recipe_shared", {
        source: "cookbook",
        recipe_id: recipe._id,
        target_servings: targetServings,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "cookbook", action: "share_recipe", platform: process.env.EXPO_OS ?? "unknown" },
      });
      setError(
        err instanceof Error ? err.message : "Couldn't share this recipe.",
      );
    }
  };

  const finishCookMode = async (leftover?: CookModeLeftover) => {
    if (!cookingRecipe) return;

    setFinishingCookMode(true);
    setNotice("");
    setError("");
    setShowPlanShortcut(false);

    try {
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
          source: "cookbook_cook_mode",
          recipe_id: cookingRecipe._id,
          storage_location: leftover.storageLocation,
          has_expiration: !!leftover.expirationDate,
        });
      }

      track(posthog, "recipe_cooked", {
        source: "cookbook",
        recipe_id: cookingRecipe._id,
      });
      setCookingRecipe(null);
      setExpandedId(cookingRecipe._id);
      setNotice("Cook Mode finished. Add feedback below so future plans learn what worked.");
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "cookbook", action: "finish_cook_mode", platform: process.env.EXPO_OS ?? "unknown" },
      });
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't finish Cook Mode.",
      );
    } finally {
      setFinishingCookMode(false);
    }
  };

  return (
    <ScreenShell
      title="Cookbook"
      subtitle="Saved dinners and family recipes."
    >
      <AddRecipeCard onPress={() => setShowAddRecipe(true)} />

      {recentlyCooked && recentlyCooked.length > 0 ? (
        <RecentlyCookedCard
          meals={recentlyCooked as RecentlyCookedMeal[]}
          weekDays={weekDays}
          mealsByDate={mealsByDate}
          planningRecipeId={planningRecipeId}
          addingPlanId={addingPlanId}
          onTogglePlanning={(recipeId) =>
            setPlanningRecipeId((current) =>
              current === recipeId ? null : recipeId,
            )
          }
          onSchedule={(recipe, date) =>
            void scheduleRecipe(recipe, date, "recently_cooked")
          }
        />
      ) : null}

      {savedRecipes === undefined ? (
        <LoadingCard
          icon="book-outline"
          title="Opening your cookbook"
          detail="Loading saved dinners, missing ingredients, and pantry matches."
        />
      ) : savedRecipes.length === 0 ? (
        <EmptyCookbook />
      ) : (
        <>
          <View className="mb-4 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <Ionicons name="book" size={22} color="#248f58" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground">
                  {savedRecipes.length} saved{" "}
                  {savedRecipes.length === 1 ? "recipe" : "recipes"}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Tap any recipe to cook it again or add it to this week.
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            {notice ? (
              <View className="rounded-xl border border-green-200 bg-green-50 p-3">
                <Text className="text-sm text-green-700">{notice}</Text>
              </View>
            ) : null}
            {error ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            ) : null}
            {savedRecipes.map((savedRecipe) => (
              <RecipeCard
                key={savedRecipe._id}
                recipe={savedRecipe.recipe}
                savedAt={savedRecipe.savedAt}
                expanded={expandedId === savedRecipe.recipe._id}
                removing={removingId === savedRecipe.recipe._id}
                addingMissing={addingMissingId === savedRecipe.recipe._id}
                planning={planningRecipeId === savedRecipe.recipe._id}
                addingToPlanDatePrefix={`${savedRecipe.recipe._id}:`}
                addingPlanId={addingPlanId}
                weekDays={weekDays}
                mealsByDate={mealsByDate}
                onToggleExpanded={() =>
                  setExpandedId(
                    expandedId === savedRecipe.recipe._id
                      ? null
                      : savedRecipe.recipe._id,
                  )
                }
                onTogglePlanning={() =>
                  setPlanningRecipeId((current) =>
                    current === savedRecipe.recipe._id
                      ? null
                      : savedRecipe.recipe._id,
                  )
                }
                onSchedule={(date) =>
                  void scheduleRecipe(savedRecipe.recipe, date, "cookbook")
                }
                onAddMissing={(targetServings) =>
                  void addMissingToGrocery(savedRecipe.recipe, targetServings)
                }
                onStartCookMode={() => startCookMode(savedRecipe.recipe)}
                onShare={(targetServings) =>
                  void shareRecipe(savedRecipe.recipe, targetServings)
                }
                onRemove={() => removeRecipe(savedRecipe.recipe)}
              />
            ))}
          </View>
        </>
      )}
      <CookModeModal
        visible={!!cookingRecipe}
        recipe={cookingRecipe}
        isFinishing={finishingCookMode}
        onClose={() => setCookingRecipe(null)}
        onStepViewed={(step) => {
          if (!cookingRecipe) return;
          track(posthog, "cook_step_viewed", {
            source: "cookbook",
            recipe_id: cookingRecipe._id,
            step,
          });
        }}
        onFinishCooking={finishCookMode}
      />
      <CustomRecipeModal
        visible={showAddRecipe}
        onClose={() => setShowAddRecipe(false)}
        onCreated={(recipeId, title) => {
          setExpandedId(recipeId);
          setPlanningRecipeId(null);
          setShowPlanShortcut(false);
          setError("");
          setNotice(
            `${title} was saved to Cookbook. You can cook it, plan it, or send missing ingredients to Grocery.`,
          );
        }}
      />
      {showPlanShortcut ? (
        <TouchableOpacity
          onPress={() => router.push("/plan")}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 py-3"
          accessibilityRole="button"
          accessibilityLabel="Open Weekly Plan"
        >
          <Ionicons name="calendar-outline" size={17} color="#248f58" />
          <Text className="font-semibold text-primary">Open Weekly Plan</Text>
        </TouchableOpacity>
      ) : null}
    </ScreenShell>
  );
}

function AddRecipeCard({ onPress }: { onPress: () => void }) {
  return (
    <View className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-card">
          <Ionicons name="add-circle-outline" size={23} color="#248f58" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-foreground">
            Add a family recipe
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Save your own staples and plan them alongside AI dinner ideas.
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onPress}
        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
        accessibilityRole="button"
        accessibilityLabel="Add recipe to Cookbook"
      >
        <Ionicons name="create-outline" size={17} color="white" />
        <Text className="font-semibold text-white">Add Recipe</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyCookbook() {
  return (
    <View className="items-center rounded-2xl border border-border bg-card p-6">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Ionicons name="heart-outline" size={26} color="#248f58" />
      </View>
      <Text className="mb-1 text-center text-lg font-semibold text-foreground">
        No saved recipes yet
      </Text>
      <Text className="text-center text-sm leading-5 text-muted-foreground">
        Save dinner ideas from Tonight or Weekly Plan, or add your own family
        recipes here.
      </Text>
      <View className="mt-5 w-full gap-2">
        <EmptyGuideRow
          icon="sparkles-outline"
          label="Generate Tonight ideas, then tap the heart to save."
        />
        <EmptyGuideRow
          icon="calendar-outline"
          label="Weekly Plan dinners can also be saved from details."
        />
        <EmptyGuideRow
          icon="cart-outline"
          label="Saved recipes can send missing ingredients to Grocery."
        />
      </View>
    </View>
  );
}

function RecentlyCookedCard({
  meals,
  weekDays,
  mealsByDate,
  planningRecipeId,
  addingPlanId,
  onTogglePlanning,
  onSchedule,
}: {
  meals: RecentlyCookedMeal[];
  weekDays: WeekDay[];
  mealsByDate: Map<string, PlannedMeal>;
  planningRecipeId: string | null;
  addingPlanId: string | null;
  onTogglePlanning: (recipeId: string) => void;
  onSchedule: (recipe: Recipe, date: string) => void;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Ionicons name="restaurant-outline" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">
            Recently Cooked
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Dinner history helps FamilyPlate remember what worked.
          </Text>
        </View>
      </View>
      <View className="gap-2">
        {meals.map((meal) => (
          <View key={meal._id} className="rounded-xl bg-muted p-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-semibold text-foreground" numberOfLines={1}>
                  {meal.recipe.title}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {new Date(`${meal.date}T12:00:00`).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                  {meal.averageRating
                    ? ` · ${meal.averageRating}/5 average`
                    : " · waiting for feedback"}
                </Text>
              </View>
              <View className="rounded-full bg-card px-2 py-1">
                <Text className="text-xs font-semibold text-primary">
                  {meal.feedbackCount} check-in
                  {meal.feedbackCount === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
            {meal.topTags.length > 0 ? (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {meal.topTags.map((tag) => (
                  <View key={tag} className="rounded-full bg-card px-2 py-1">
                    <Text className="text-[11px] font-semibold text-muted-foreground">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {meal.recipe.source === "ai" ? (
              <View className="mt-3">
                <ReportAiContentButton
                  recipeId={meal.recipe._id}
                  sourceSurface="cookbook"
                />
              </View>
            ) : null}
            <TouchableOpacity
              onPress={() => onTogglePlanning(meal.recipe._id)}
              className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2.5"
              accessibilityRole="button"
              accessibilityLabel={`Cook ${meal.recipe.title} again`}
            >
              <Ionicons name="calendar-outline" size={16} color="white" />
              <Text className="font-semibold text-white">Cook Again</Text>
            </TouchableOpacity>
            {planningRecipeId === meal.recipe._id ? (
              <ScheduleDayPicker
                recipe={meal.recipe}
                weekDays={weekDays}
                mealsByDate={mealsByDate}
                addingPlanId={addingPlanId}
                onSchedule={(date) => onSchedule(meal.recipe, date)}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function ScheduleDayPicker({
  recipe,
  weekDays,
  mealsByDate,
  addingPlanId,
  addingToPlanDatePrefix,
  onSchedule,
}: {
  recipe: Recipe;
  weekDays: WeekDay[];
  mealsByDate: Map<string, PlannedMeal>;
  addingPlanId: string | null;
  addingToPlanDatePrefix?: string;
  onSchedule: (date: string) => void;
}) {
  const busyKeyPrefix = addingToPlanDatePrefix ?? `${recipe._id}:`;

  return (
    <View className="mt-3 gap-2">
      {weekDays.map((day) => {
        const meal = mealsByDate.get(day.date);
        const locked = meal?.status === "cooked";
        const busy = addingPlanId === `${busyKeyPrefix}${day.date}`;
        const isSameRecipe = meal?.recipe._id === recipe._id;
        const label = locked
          ? "Cooked"
          : isSameRecipe
            ? "Already planned"
            : meal
              ? "Replace"
              : "Add";

        return (
          <TouchableOpacity
            key={day.date}
            onPress={() => onSchedule(day.date)}
            disabled={locked || busy || isSameRecipe}
            className={`flex-row items-center gap-3 rounded-xl border p-3 ${
              locked || isSameRecipe
                ? "border-border bg-card/70"
                : "border-primary/20 bg-card"
            }`}
            style={{ opacity: locked || busy || isSameRecipe ? 0.65 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${recipe.title} on ${day.weekday}`}
          >
            <View className="w-14 items-center rounded-xl bg-muted px-2 py-2">
              <Text className="text-xs font-semibold uppercase text-muted-foreground">
                {day.weekday}
              </Text>
              <Text className="mt-0.5 text-xs font-bold text-foreground">
                {day.day}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-semibold text-foreground" numberOfLines={1}>
                {meal?.recipe.title ?? "Open dinner slot"}
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
                {locked
                  ? "Locked because this dinner was cooked."
                  : isSameRecipe
                    ? "This recipe is already here."
                    : meal
                      ? "Replace the uncooked dinner on this date."
                      : "Add this recipe to the weekly plan."}
              </Text>
            </View>
            <View
              className={`min-w-20 items-center rounded-full px-3 py-1.5 ${
                locked || isSameRecipe ? "bg-muted" : "bg-primary/10"
              }`}
            >
              {busy ? (
                <ActivityIndicator color="#248f58" size="small" />
              ) : (
                <Text
                  className={`text-xs font-bold ${
                    locked || isSameRecipe
                      ? "text-muted-foreground"
                      : "text-primary"
                  }`}
                >
                  {label}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
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

function RecipeCard({
  recipe,
  savedAt,
  expanded,
  removing,
  addingMissing,
  planning,
  addingToPlanDatePrefix,
  addingPlanId,
  weekDays,
  mealsByDate,
  onToggleExpanded,
  onTogglePlanning,
  onSchedule,
  onAddMissing,
  onStartCookMode,
  onShare,
  onRemove,
}: {
  recipe: Recipe;
  savedAt: number;
  expanded: boolean;
  removing: boolean;
  addingMissing: boolean;
  planning: boolean;
  addingToPlanDatePrefix: string;
  addingPlanId: string | null;
  weekDays: WeekDay[];
  mealsByDate: Map<string, PlannedMeal>;
  onToggleExpanded: () => void;
  onTogglePlanning: () => void;
  onSchedule: (date: string) => void;
  onAddMissing: (targetServings: number) => void;
  onStartCookMode: () => void;
  onShare: (targetServings: number) => void;
  onRemove: () => void;
}) {
  const [targetServings, setTargetServings] = useState(recipe.servings);
  const pantryCount = recipe.ingredients.filter((ingredient) =>
    isIngredientAvailable(ingredient),
  ).length;
  const totalCount = recipe.ingredients.length;
  const matchPct =
    totalCount > 0 ? Math.round((pantryCount / totalCount) * 100) : 0;
  const effortColor = getEffortColor(recipe.effortLevel);
  const scaledIngredients = scaleIngredients(
    recipe.ingredients,
    recipe.servings,
    targetServings,
  );
  const missingIngredients = scaledIngredients.filter(
    (ingredient) => !isIngredientAvailable(ingredient),
  );

  return (
    <View
      className="overflow-hidden rounded-2xl border border-border bg-card"
      style={{
        shadowColor: "#171d1a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 14,
      }}
    >
      <Pressable
        onPress={onToggleExpanded}
        accessible={false}
        className="p-4"
      >
        <View className="flex-row items-start gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-semibold leading-6 text-foreground">
              {recipe.title}
            </Text>
            <Text
              className="mt-1 text-sm leading-5 text-muted-foreground"
              numberOfLines={expanded ? undefined : 2}
            >
              {recipe.description}
            </Text>
          </View>
          <View className="items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <Text className="text-xs font-bold text-foreground">
                {matchPct}%
              </Text>
            </View>
            <Text className="mt-1 text-[10px] text-muted-foreground">
              match
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <View
            className="rounded-lg px-2 py-1"
            style={{ backgroundColor: effortColor.bg }}
          >
            <Text
              className="text-xs font-semibold capitalize"
              style={{ color: effortColor.fg }}
            >
              {recipe.effortLevel}
            </Text>
          </View>
          <InfoPill icon="time-outline" label={`${recipe.estimatedTime}m`} />
          <InfoPill
            icon="people-outline"
            label={formatServingsLabel(recipe.servings)}
          />
          {recipe.nutrition ? (
            <InfoPill
              icon="stats-chart-outline"
              label={`${Math.round(recipe.nutrition.calories)} cal`}
            />
          ) : null}
          <InfoPill label={`${pantryCount}/${totalCount} in pantry`} />
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="rounded-lg bg-primary/10 px-2 py-1">
              <Text className="text-xs font-semibold text-primary">
                {getSourceLabel(recipe.source)}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              Saved {formatSavedDate(savedAt)}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#6f756f"
          />
        </View>
      </Pressable>

      {recipe.source === "ai" ? (
        <View className="border-t border-border px-4 py-3">
          <ReportAiContentButton
            recipeId={recipe._id}
            sourceSurface="cookbook"
          />
        </View>
      ) : null}

      {expanded ? (
        <View className="border-t border-border p-4">
          <ServingsAdjuster
            title="Adjust servings"
            subtitle="Scale ingredient quantities before you cook, share, or send missing items to Grocery."
            originalServings={recipe.servings}
            targetServings={targetServings}
            disabled={removing || addingMissing}
            onChangeServings={setTargetServings}
          />

          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ingredients
            </Text>
            <View className="gap-2">
              {scaledIngredients.map((ingredient, index) => {
                const available = isIngredientAvailable(ingredient);
                return (
                  <View
                    key={`${ingredient.name}-${index}`}
                    className="flex-row items-center gap-2"
                  >
                    <View
                      className={`h-2 w-2 rounded-full ${
                        available ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                    <Text
                      className={`flex-1 text-sm leading-5 ${
                        available ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    </Text>
                    {available ? (
                      <Text className="text-[10px] font-semibold text-primary">
                        In pantry
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <MissingIngredientsAction
            adding={addingMissing}
            disabled={removing}
            missingIngredients={missingIngredients}
            targetServings={targetServings}
            onAddMissing={() => onAddMissing(targetServings)}
          />

          {recipe.nutrition ? (
            <View className="mb-4">
              <RecipeNutrition nutrition={recipe.nutrition} compact />
            </View>
          ) : null}

          <View className="mb-4 flex-row gap-2">
            <TouchableOpacity
              onPress={onStartCookMode}
              disabled={removing}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
              style={{ opacity: removing ? 0.55 : 1 }}
              accessibilityRole="button"
              accessibilityLabel="Start Cook Mode"
            >
              <Ionicons name="restaurant-outline" size={17} color="white" />
              <Text className="font-semibold text-white">Start Cook Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onShare(targetServings)}
              disabled={removing}
              className="h-12 w-12 items-center justify-center rounded-xl border border-border bg-card"
              accessibilityRole="button"
              accessibilityLabel={`Share ${recipe.title}`}
            >
              <Ionicons name="share-outline" size={19} color="#248f58" />
            </TouchableOpacity>
          </View>

          <View className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-card">
                <Ionicons name="calendar-outline" size={20} color="#248f58" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  Add to this week's plan
                </Text>
                <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
                  Pick a dinner slot. Uncooked meals can be replaced.
                </Text>
              </View>
              <TouchableOpacity
                onPress={onTogglePlanning}
                className="rounded-full bg-card px-3 py-2"
                accessibilityRole="button"
                accessibilityLabel={
                  planning ? "Hide plan dates" : "Show plan dates"
                }
              >
                <Text className="text-xs font-bold text-primary">
                  {planning ? "Hide" : "Pick"}
                </Text>
              </TouchableOpacity>
            </View>
            {planning ? (
              <ScheduleDayPicker
                recipe={recipe}
                weekDays={weekDays}
                mealsByDate={mealsByDate}
                addingPlanId={addingPlanId}
                addingToPlanDatePrefix={addingToPlanDatePrefix}
                onSchedule={onSchedule}
              />
            ) : null}
          </View>

          <RecipeFeedback recipeId={recipe._id as Id<"recipeSuggestions">} />

          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Instructions
            </Text>
            <View className="gap-3">
              {recipe.instructions.map((step, index) => (
                <View key={`${step}-${index}`} className="flex-row gap-3">
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-xs font-bold text-primary">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-sm leading-5 text-foreground">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={onRemove}
            disabled={removing}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3"
            accessibilityRole="button"
            accessibilityLabel="Remove from Cookbook"
            accessibilityHint="Removes this saved recipe from your cookbook."
          >
            {removing ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <Ionicons
                name="heart-dislike-outline"
                size={17}
                color="#dc2626"
              />
            )}
            <Text className="font-semibold text-red-700">
              {removing ? "Removing..." : "Remove from Cookbook"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function MissingIngredientsAction({
  adding,
  disabled,
  missingIngredients,
  targetServings,
  onAddMissing,
}: {
  adding: boolean;
  disabled: boolean;
  missingIngredients: RecipeIngredient[];
  targetServings: number;
  onAddMissing: () => void;
}) {
  if (missingIngredients.length === 0) {
    return (
      <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
        <Ionicons name="checkmark-circle" size={18} color="#15803d" />
        <Text className="flex-1 text-sm font-medium text-green-700">
          Everything for this recipe is already in your pantry.
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-3">
      <View className="mb-3">
        <Text className="text-sm font-bold text-foreground">
          Add missing ingredients
        </Text>
        <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
          FamilyPlate will add only the missing items for{" "}
          {formatServingsLabel(targetServings)}.
        </Text>
      </View>
      <TouchableOpacity
        onPress={onAddMissing}
        disabled={adding || disabled}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
        style={{ opacity: adding || disabled ? 0.55 : 1 }}
        accessibilityRole="button"
        accessibilityLabel={`Add ${missingIngredients.length} missing ingredients to Grocery`}
        accessibilityHint="Adds the missing recipe ingredients to your grocery list."
      >
        {adding ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="cart-outline" size={17} color="white" />
        )}
        <Text className="font-semibold text-white">
          {adding
            ? "Adding..."
            : `Add ${missingIngredients.length} missing to Grocery`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoPill({
  icon,
  label,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-1 rounded-lg bg-muted px-2 py-1">
      {icon ? <Ionicons name={icon} size={13} color="#6f756f" /> : null}
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
    </View>
  );
}
