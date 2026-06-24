import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
import { ScreenShell } from "@/components/ScreenShell";
import { RecipeNutrition } from "@/components/RecipeNutrition";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { ensureAiConsent } from "@/lib/aiConsent";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";
import { formatExpirationLabel, inferCategory } from "@/lib/pantry";
import {
  buildScaledRecipeShareText,
  formatServingsLabel,
  scaleIngredients,
} from "@/lib/recipeScaling";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type Suggestion = {
  _id?: string;
  mode?: "pantry" | "shopping";
  usedPantryItems?: string[];
  name: string;
  description: string;
  effortLevel: string;
  estimatedTime: number;
  servings: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    inPantry: boolean;
  }[];
  instructions: string[];
  missingItems: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
};
type PantryItem = Doc<"pantryItems">;

const CRAVING_CHIPS = [
  "Chicken",
  "Beef",
  "Pasta",
  "Seafood",
  "Vegetarian",
  "Comfort Food",
  "Stir Fry",
  "Tacos",
];

function getEffortColor(level: string) {
  if (level === "easy") return { bg: "#dcfce7", fg: "#166534" };
  if (level === "medium") return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Unable to generate dinner suggestions right now. Please try again.";
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

  return formatExpirationLabel(item.expirationDate);
}

function getUsedPantryItems(
  suggestion: Pick<Suggestion, "usedPantryItems" | "ingredients">,
) {
  const items =
    suggestion.usedPantryItems?.length
      ? suggestion.usedPantryItems
      : suggestion.ingredients
          .filter((ingredient) => isIngredientAvailable(ingredient))
          .map((ingredient) => ingredient.name);

  return Array.from(
    new Map(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item]),
    ).values(),
  );
}

export default function TonightScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const suggestFromPantry = useAction(
    api.actions.quickDinner.suggestFromPantry,
  );
  const persistedSuggestions = useQuery(
    api.queries.planner.getQuickDinnerSuggestions,
    {},
  );
  const subscription = useQuery(api.subscriptions.getMySubscription, {});
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const pantryItems = useQuery(api.queries.pantry.getMyPantryItems, {});
  const saveRecipe = useMutation(api.mutations.savedRecipes.saveRecipe);
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);
  const addGroceryItem = useMutation(api.mutations.grocery.addMyCustomItem);

  const [freshSuggestions, setFreshSuggestions] = useState<Suggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCraving, setSelectedCraving] = useState("");
  const [customCraving, setCustomCraving] = useState("");
  const [activeCraving, setActiveCraving] = useState("");
  const [activeMode, setActiveMode] = useState<"pantry" | "shopping">("pantry");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [addingMissingId, setAddingMissingId] = useState<string | null>(null);
  const trackedSuccessNudge = useRef(false);

  const initialSuggestions = useMemo<Suggestion[]>(() => {
    if (!persistedSuggestions?.length) return [];

    return persistedSuggestions.map((recipe) => ({
      _id: recipe._id,
      name: recipe.title,
      description: recipe.description,
      effortLevel: recipe.effortLevel,
      estimatedTime: recipe.estimatedTime,
      servings: recipe.servings,
      mode: recipe.tags.includes("shop-first") ? "shopping" : "pantry",
      usedPantryItems: recipe.usedPantryItems,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      nutrition: recipe.nutrition,
      missingItems: recipe.ingredients
        .filter((ingredient) => !isIngredientAvailable(ingredient))
        .map((ingredient) => ingredient.name),
    }));
  }, [persistedSuggestions]);

  const suggestions =
    freshSuggestions.length > 0 ? freshSuggestions : initialSuggestions;
  const showInitialState =
    !hasGenerated && suggestions.length === 0 && !isGenerating && !error;

  const savedRecipeIds = useMemo(() => {
    return new Set(savedRecipes?.map((saved) => saved.recipe._id) ?? []);
  }, [savedRecipes]);

  const useFirstItems = useMemo(
    () => getUseFirstItems(pantryItems ?? []),
    [pantryItems],
  );

  useEffect(() => {
    if (trackedSuccessNudge.current) return;
    if (suggestions.length === 0 || subscription?.tier === "family") return;

    trackedSuccessNudge.current = true;
    track(posthog, "paywall_viewed", {
      source: "tonight_success_nudge",
      tier: subscription?.tier ?? "unknown",
    });
  }, [posthog, subscription?.tier, suggestions.length]);

  const handleGenerate = async (
    overrideCraving?: string,
    shoppingMode = false,
  ) => {
    const cravingValue = (
      (overrideCraving ?? selectedCraving) ||
      customCraving
    ).trim();
    const mode = shoppingMode ? "shopping" : "pantry";

    const consented = await ensureAiConsent();
    if (!consented) {
      setError("AI dinner suggestions need your permission before they can use your pantry and preference details.");
      return;
    }
    track(posthog, "ai_consent_accepted", {
      feature: "tonight_suggestions",
    });

    setIsGenerating(true);
    setError("");
    setNotice("");
    setFreshSuggestions([]);
    setExpandedIndex(null);
    setActiveCraving(cravingValue);
    setActiveMode(mode);
    setHasGenerated(true);

    try {
      track(posthog, "dinner_suggestions_started", {
        has_craving: !!cravingValue,
        mode,
        source: overrideCraving ? "chip" : "button",
      });
      const result = await suggestFromPantry({
        craving: cravingValue || undefined,
        shoppingMode,
      });

      if (result.suggestions.length === 0) {
        track(posthog, "dinner_suggestions_failed", {
          reason: "empty_pantry_or_empty_result",
          has_craving: !!cravingValue,
          mode,
        });
        setError("Add some pantry items first so I can suggest dinner.");
      } else {
        track(posthog, "dinner_suggestions_completed", {
          count: result.suggestions.length,
          has_craving: !!cravingValue,
          mode,
        });
        setFreshSuggestions(
          result.suggestions.map((suggestion) => ({
            ...suggestion,
            mode,
            usedPantryItems: getUsedPantryItems(suggestion),
          })),
        );
      }
    } catch (err) {
      track(posthog, "dinner_suggestions_failed", {
        reason: err instanceof Error ? err.message : "unknown",
        has_craving: !!cravingValue,
        mode,
      });
      Sentry.captureException(err, {
        tags: { area: "tonight", action: "suggest_from_pantry", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectChip = (label: string) => {
    if (selectedCraving === label) {
      setSelectedCraving("");
      return;
    }

    setSelectedCraving(label);
    setCustomCraving("");
  };

  const handleResetCraving = () => {
    setSelectedCraving("");
    setCustomCraving("");
    setActiveCraving("");
    setError("");
  };

  const handleToggleSave = async (recipeId: string) => {
    setSavingRecipeId(recipeId);
    setNotice("");
    try {
      const typedId = recipeId as Id<"recipeSuggestions">;
      if (savedRecipeIds.has(typedId)) {
        await unsaveRecipe({ recipeId: typedId });
        track(posthog, "recipe_unsaved", {
          source: "tonight",
        });
      } else {
        await saveRecipe({ recipeId: typedId });
        track(posthog, "recipe_saved", {
          source: "tonight",
        });
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

  const handleAddMissingIngredients = async (
    suggestion: Suggestion,
    targetServings: number,
  ) => {
    const suggestionId = suggestion._id ?? suggestion.name;
    const missingIngredients = scaleIngredients(
      suggestion.ingredients,
      suggestion.servings,
      targetServings,
    ).filter((ingredient) => !isIngredientAvailable(ingredient));

    if (missingIngredients.length === 0) {
      setNotice("Everything for this dinner is already in your pantry.");
      return;
    }

    setAddingMissingId(suggestionId);
    setError("");
    setNotice("");

    try {
      for (const ingredient of missingIngredients) {
        await addGroceryItem({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: inferCategory(ingredient.name),
        });
      }
      track(posthog, "grocery_item_added", {
        source: "tonight_missing_ingredients",
        count: missingIngredients.length,
      });
      track(posthog, "missing_ingredients_added_to_grocery", {
        source: "tonight",
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
          area: "tonight",
          action: "add_missing_to_grocery",
          platform: "ios",
        },
      });
      setError(getErrorMessage(err));
    } finally {
      setAddingMissingId(null);
    }
  };

  const handleShareSuggestion = async (
    suggestion: Suggestion,
    targetServings: number,
  ) => {
    setNotice("");
    try {
      await Share.share({
        title: suggestion.name,
        message: buildScaledRecipeShareText(suggestion, targetServings),
      });
      track(posthog, "recipe_shared", {
        source: "tonight",
        has_recipe_id: !!suggestion._id,
        target_servings: targetServings,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "tonight", action: "share_recipe", platform: "ios" },
      });
      setError(getErrorMessage(err));
    }
  };

  return (
    <ScreenShell
      title="Tonight"
      subtitle="Instant dinner ideas from your pantry."
    >
      {showInitialState ? (
        <View className="mb-5 items-center rounded-2xl border border-border bg-card p-5">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons name="sparkles" size={26} color="#248f58" />
          </View>
          <Text className="mb-1 text-center text-lg font-semibold text-foreground">
            What sounds good tonight?
          </Text>
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            Pick a craving or generate dinner ideas from what you already have.
          </Text>
          <View className="mt-5 w-full gap-2">
            <EmptyGuideRow
              icon="cube-outline"
              label="Pantry items make the suggestions more useful."
            />
            <EmptyGuideRow
              icon="heart-outline"
              label="Save good ideas to Cookbook for later."
            />
          </View>
        </View>
      ) : null}

      <View className="mb-4">
        <Text className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          I am in the mood for
        </Text>
        <View className="flex-row flex-wrap justify-center gap-2">
          {CRAVING_CHIPS.map((chip) => {
            const active = selectedCraving === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => handleSelectChip(chip)}
                disabled={isGenerating}
                className={`rounded-full border px-3 py-2 ${
                  active ? "border-primary bg-primary" : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    active ? "text-white" : "text-foreground"
                  }`}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mb-4 rounded-xl bg-muted px-3">
        <TextInput
          className="py-3 text-base text-foreground"
          placeholder='Or type anything, like "something spicy"'
          placeholderTextColor="#9a9489"
          value={customCraving}
          onChangeText={(value) => {
            setCustomCraving(value);
            if (value) setSelectedCraving("");
          }}
          autoCapitalize="sentences"
          editable={!isGenerating}
          returnKeyType="go"
          onSubmitEditing={() => void handleGenerate()}
        />
      </View>

      <TouchableOpacity
        onPress={() => void handleGenerate()}
        disabled={isGenerating}
        className="mb-5 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5"
        style={{ opacity: isGenerating ? 0.7 : 1 }}
      >
        {isGenerating ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="sparkles" size={18} color="white" />
        )}
        <Text className="text-base font-semibold text-white">
          {isGenerating
            ? "Reading your pantry..."
            : selectedCraving || customCraving
              ? "Suggest Dinners"
              : suggestions.length > 0
                ? "Suggest Different Dinners"
                : "Suggest Dinners"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => void handleGenerate(undefined, true)}
        disabled={isGenerating}
        className="mb-5 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 py-3.5"
        style={{ opacity: isGenerating ? 0.7 : 1 }}
        accessibilityRole="button"
        accessibilityLabel="Suggest dinners to shop for"
        accessibilityHint="Suggests dinner ideas and grocery items to buy, even if your pantry is sparse."
      >
        <Ionicons name="cart-outline" size={18} color="#248f58" />
        <Text className="text-base font-semibold text-primary">
          Suggest What to Buy
        </Text>
      </TouchableOpacity>

      {useFirstItems.length > 0 ? (
        <View className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <View className="mb-3 flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons name="time-outline" size={20} color="#b45309" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">
                Use this first
              </Text>
              <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                Leftovers and soon-expiring items can guide tonight's dinner.
                Tap one to ask for ideas that use it.
              </Text>
            </View>
          </View>
          <View className="gap-2">
            {useFirstItems.map((item) => (
              <TouchableOpacity
                key={item._id}
                onPress={() => void handleGenerate(`use ${item.name}`)}
                disabled={isGenerating}
                className="flex-row items-center justify-between gap-3 rounded-xl bg-white px-3 py-3"
                accessibilityRole="button"
                accessibilityLabel={`Suggest dinners using ${item.name}`}
              >
                <View className="min-w-0 flex-1">
                  <Text className="font-semibold text-foreground" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {getUseFirstLabel(item)}
                  </Text>
                </View>
                <Ionicons name="sparkles" size={17} color="#248f58" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {activeCraving && suggestions.length > 0 ? (
        <View className="mb-4 flex-row justify-center">
          <View className="flex-row items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
            <Text className="text-sm font-semibold text-primary">
              Showing: {activeCraving}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setActiveCraving("");
                setSelectedCraving("");
                setCustomCraving("");
              }}
            >
              <Ionicons name="close" size={14} color="#248f58" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {error && !isGenerating ? (
        <View className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <View className="mb-3 flex-row items-start gap-2">
            <Ionicons name="alert-circle" size={18} color="#dc2626" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-red-800">
                Dinner ideas hit a snag
              </Text>
              <Text className="mt-1 text-sm leading-5 text-red-700">
                {error}
              </Text>
            </View>
          </View>
          <Text className="mb-3 text-xs leading-4 text-red-700">
            Try again, clear the craving, or add a few pantry staples if your
            pantry is empty.
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => void handleGenerate()}
              className="flex-1 items-center rounded-lg border border-red-200 bg-white py-2.5"
              accessibilityRole="button"
              accessibilityLabel="Try dinner suggestions again"
            >
              <Text className="font-semibold text-red-700">Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleResetCraving}
              className="flex-1 items-center rounded-lg bg-red-100 py-2.5"
              accessibilityRole="button"
              accessibilityLabel="Clear dinner craving"
            >
              <Text className="font-semibold text-red-700">Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {notice && !isGenerating ? (
        <View className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
          <Text className="text-sm text-green-700">{notice}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion._id ?? `${suggestion.name}-${index}`}
            suggestion={suggestion}
            expanded={expandedIndex === index}
            saved={
              suggestion._id
                ? savedRecipeIds.has(suggestion._id as Id<"recipeSuggestions">)
                : false
            }
            saving={savingRecipeId === suggestion._id}
            addingMissing={
              addingMissingId === (suggestion._id ?? suggestion.name)
            }
            mode={suggestion.mode ?? activeMode}
            onToggleExpanded={() =>
              setExpandedIndex(expandedIndex === index ? null : index)
            }
            onToggleSave={() => {
              if (suggestion._id) void handleToggleSave(suggestion._id);
            }}
            onAddMissing={(targetServings) =>
              void handleAddMissingIngredients(suggestion, targetServings)
            }
            onShare={(targetServings) =>
              void handleShareSuggestion(suggestion, targetServings)
            }
          />
        ))}
      </View>

      {suggestions.length > 0 && subscription?.tier !== "family" ? (
        <View className="mt-4 rounded-2xl border border-border bg-card p-4">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Ionicons name="calendar-outline" size={20} color="#248f58" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">
                Turn dinner wins into a week
              </Text>
              <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                Family unlocks unlimited weekly plans for the household and
                selected eater profiles.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  track(posthog, "paywall_cta_tapped", {
                    source: "tonight_success_nudge",
                    tier: subscription?.tier ?? "unknown",
                  });
                  router.push("/settings");
                }}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 py-3"
                accessibilityRole="button"
                accessibilityLabel="See Family plan from Tonight"
              >
                <Ionicons name="people-outline" size={17} color="#248f58" />
                <Text className="font-semibold text-primary">
                  See Family Plan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
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

function SuggestionCard({
  suggestion,
  expanded,
  saved,
  saving,
  addingMissing,
  mode,
  onToggleExpanded,
  onToggleSave,
  onAddMissing,
  onShare,
}: {
  suggestion: Suggestion;
  expanded: boolean;
  saved: boolean;
  saving: boolean;
  addingMissing: boolean;
  mode: "pantry" | "shopping";
  onToggleExpanded: () => void;
  onToggleSave: () => void;
  onAddMissing: (targetServings: number) => void;
  onShare: (targetServings: number) => void;
}) {
  const [targetServings, setTargetServings] = useState(suggestion.servings);
  const pantryCount = suggestion.ingredients.filter((ingredient) =>
    isIngredientAvailable(ingredient),
  ).length;
  const totalCount = suggestion.ingredients.length;
  const matchPct =
    totalCount > 0 ? Math.round((pantryCount / totalCount) * 100) : 0;
  const effortColor = getEffortColor(suggestion.effortLevel);
  const scaledIngredients = scaleIngredients(
    suggestion.ingredients,
    suggestion.servings,
    targetServings,
  );
  const alreadyHaveIngredients = scaledIngredients.filter((ingredient) =>
    isIngredientAvailable(ingredient),
  );
  const missingIngredients = scaledIngredients.filter(
    (ingredient) => !isIngredientAvailable(ingredient),
  );
  const usedPantryItems = getUsedPantryItems(suggestion);
  const pantryHighlights = usedPantryItems.slice(0, 3);
  const remainingPantryHighlights = usedPantryItems.length - pantryHighlights.length;

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
              {suggestion.name}
            </Text>
            <Text
              className="mt-1 text-sm leading-5 text-muted-foreground"
              numberOfLines={expanded ? undefined : 2}
            >
              {suggestion.description}
            </Text>
            {pantryHighlights.length > 0 ? (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {pantryHighlights.map((item) => (
                  <View
                    key={item}
                    className="rounded-full bg-primary/10 px-2.5 py-1"
                  >
                    <Text className="text-[11px] font-semibold text-primary">
                      Uses {item}
                    </Text>
                  </View>
                ))}
                {remainingPantryHighlights > 0 ? (
                  <View className="rounded-full bg-muted px-2.5 py-1">
                    <Text className="text-[11px] font-semibold text-muted-foreground">
                      +{remainingPantryHighlights} more
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
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
            className="rounded-lg border px-2 py-1"
            style={{
              backgroundColor: effortColor.bg,
              borderColor: effortColor.bg,
            }}
          >
            <Text
              className="text-xs font-semibold capitalize"
              style={{ color: effortColor.fg }}
            >
              {suggestion.effortLevel}
            </Text>
          </View>
          <InfoPill
            icon="time-outline"
            label={`${suggestion.estimatedTime}m`}
          />
          <InfoPill
            icon="people-outline"
            label={formatServingsLabel(suggestion.servings)}
          />
          {mode === "shopping" ? (
            <InfoPill icon="cart-outline" label="shop-first" />
          ) : null}
          <InfoPill label={`${pantryCount}/${totalCount} in pantry`} />
          {suggestion._id ? (
            <TouchableOpacity
              onPress={onToggleSave}
              disabled={saving}
              className="ml-auto flex-row items-center gap-1 rounded-lg px-2 py-1"
              accessibilityRole="button"
              accessibilityLabel={
                saved ? "Remove from cookbook" : "Save to cookbook"
              }
              accessibilityHint={
                saved
                  ? "Removes this recipe from your cookbook."
                  : "Saves this recipe to your cookbook."
              }
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={16}
                color={saved ? "#248f58" : "#6f756f"}
              />
              <Text
                className={`text-xs font-semibold ${
                  saved ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => onShare(targetServings)}
            className="flex-row items-center gap-1 rounded-lg px-2 py-1"
            accessibilityRole="button"
            accessibilityLabel={`Share ${suggestion.name}`}
          >
            <Ionicons name="share-outline" size={16} color="#6f756f" />
            <Text className="text-xs font-semibold text-muted-foreground">
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>

      {expanded ? (
        <View className="border-t border-border p-4">
          <ServingsAdjuster
            title="Adjust servings"
            subtitle="Scale ingredients before you cook, share, or send missing items to Grocery."
            originalServings={suggestion.servings}
            targetServings={targetServings}
            disabled={saving || addingMissing}
            onChangeServings={setTargetServings}
          />

          {alreadyHaveIngredients.length > 0 ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Already have
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {alreadyHaveIngredients.map((item) => (
                  <View
                    key={`${item.name}-${item.unit}`}
                    className="rounded-lg bg-primary/10 px-2 py-1"
                  >
                    <Text className="text-xs font-semibold text-primary">
                      {item.quantity} {item.unit} {item.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {missingIngredients.length > 0 ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                Need to buy
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {missingIngredients.map((item) => (
                  <View
                    key={`${item.name}-${item.unit}`}
                    className="rounded-lg bg-accent/10 px-2 py-1"
                  >
                    <Text className="text-xs font-semibold text-accent">
                      {item.quantity} {item.unit} {item.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {suggestion.nutrition ? (
            <View className="mb-4">
              <RecipeNutrition nutrition={suggestion.nutrition} compact />
            </View>
          ) : null}

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

          <TouchableOpacity
            onPress={() => onAddMissing(targetServings)}
            disabled={addingMissing || missingIngredients.length === 0}
            className="mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
            style={{
              opacity: addingMissing || missingIngredients.length === 0 ? 0.55 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${missingIngredients.length} missing ingredients to Grocery`}
          >
            {addingMissing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="cart-outline" size={17} color="white" />
            )}
            <Text className="font-semibold text-white">
              {addingMissing
                ? "Adding..."
                : `Add missing for ${formatServingsLabel(targetServings)}`}
            </Text>
          </TouchableOpacity>

          <View>
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Instructions
            </Text>
            <View className="gap-3">
              {suggestion.instructions.map((step, index) => (
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
        </View>
      ) : null}
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
