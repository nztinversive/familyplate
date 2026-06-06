import { useState } from "react";
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
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc, Id } from "@familyplate/convex/_generated/dataModel";
import { usePostHog } from "posthog-react-native";
import { CookModeModal } from "@/components/CookModeModal";
import { RecipeFeedback } from "@/components/RecipeFeedback";
import { ScreenShell } from "@/components/ScreenShell";
import { LoadingCard } from "@/components/LoadingCard";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";
import { inferCategory } from "@/lib/pantry";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type Recipe = Doc<"recipeSuggestions">;
type RecipeIngredient = Recipe["ingredients"][number];

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

function scaleQuantity(quantity: number, scaleFactor: number) {
  return Math.round(quantity * scaleFactor * 100) / 100;
}

function buildRecipeShareText(recipe: Recipe) {
  const ingredients = recipe.ingredients
    .map(
      (ingredient) =>
        `- ${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`,
    )
    .join("\n");
  const instructions = recipe.instructions
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  return `${recipe.title}\n\n${recipe.description}\n\nIngredients\n${ingredients}\n\nInstructions\n${instructions}\n\nShared from FamilyPlate`;
}

export default function CookbookScreen() {
  const posthog = usePostHog();
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);
  const addPantryItem = useMutation(api.mutations.pantry.addItem);
  const addGroceryItem = useMutation(api.mutations.grocery.addMyCustomItem);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingMissingId, setAddingMissingId] = useState<string | null>(null);
  const [finishingCookMode, setFinishingCookMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const removeRecipe = (recipe: Recipe) => {
    setNotice("");
    setError("");
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
                  tags: { area: "cookbook", action: "remove_recipe", platform: "ios" },
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
        tags: { area: "cookbook", action: "add_missing_to_grocery", platform: "ios" },
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
    track(posthog, "cook_mode_started", {
      source: "cookbook",
      recipe_id: recipe._id,
    });
  };

  const shareRecipe = async (recipe: Recipe) => {
    setNotice("");
    setError("");

    try {
      await Share.share({
        title: recipe.title,
        message: buildRecipeShareText(recipe),
      });
      track(posthog, "recipe_shared", {
        source: "cookbook",
        recipe_id: recipe._id,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "cookbook", action: "share_recipe", platform: "ios" },
      });
      setError(
        err instanceof Error ? err.message : "Couldn't share this recipe.",
      );
    }
  };

  const finishCookMode = async (leftoverNote?: string) => {
    if (!cookingRecipe) return;

    setFinishingCookMode(true);
    setNotice("");
    setError("");

    try {
      if (leftoverNote && currentUser?.householdId) {
        await addPantryItem({
          householdId: currentUser.householdId as Id<"households">,
          name: leftoverNote,
          quantity: 1,
          unit: "container",
          category: "Leftovers",
          storageLocation: "fridge",
        });
        track(posthog, "leftovers_saved", {
          source: "cookbook_cook_mode",
          recipe_id: cookingRecipe._id,
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
        tags: { area: "cookbook", action: "finish_cook_mode", platform: "ios" },
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
      subtitle="Recipes you've saved from generated plans."
    >
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
                  Tap any recipe to cook from the details.
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
                onToggleExpanded={() =>
                  setExpandedId(
                    expandedId === savedRecipe.recipe._id
                      ? null
                      : savedRecipe.recipe._id,
                  )
                }
                onAddMissing={(targetServings) =>
                  void addMissingToGrocery(savedRecipe.recipe, targetServings)
                }
                onStartCookMode={() => startCookMode(savedRecipe.recipe)}
                onShare={() => void shareRecipe(savedRecipe.recipe)}
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
    </ScreenShell>
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
        Save dinner ideas from Tonight or Weekly Plan and they will appear here.
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
  onToggleExpanded,
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
  onToggleExpanded: () => void;
  onAddMissing: (targetServings: number) => void;
  onStartCookMode: () => void;
  onShare: () => void;
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
  const missingIngredients = recipe.ingredients.filter(
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
          <InfoPill icon="people-outline" label={`Serves ${recipe.servings}`} />
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

      {expanded ? (
        <View className="border-t border-border p-4">
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ingredients
            </Text>
            <View className="gap-2">
              {recipe.ingredients.map((ingredient, index) => {
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
            originalServings={recipe.servings}
            targetServings={targetServings}
            onChangeServings={setTargetServings}
            onAddMissing={() => onAddMissing(targetServings)}
          />

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
              onPress={onShare}
              disabled={removing}
              className="h-12 w-12 items-center justify-center rounded-xl border border-border bg-card"
              accessibilityRole="button"
              accessibilityLabel={`Share ${recipe.title}`}
            >
              <Ionicons name="share-outline" size={19} color="#248f58" />
            </TouchableOpacity>
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
  originalServings,
  targetServings,
  onChangeServings,
  onAddMissing,
}: {
  adding: boolean;
  disabled: boolean;
  missingIngredients: RecipeIngredient[];
  originalServings: number;
  targetServings: number;
  onChangeServings: (servings: number) => void;
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

  const scaleLabel =
    targetServings === originalServings
      ? "Original recipe"
      : `${targetServings} serving${targetServings === 1 ? "" : "s"}`;

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-3">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">
            Scale grocery quantities
          </Text>
          <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {scaleLabel}. Missing items will be adjusted before they are added.
          </Text>
        </View>
        <View className="flex-row items-center rounded-full border border-border bg-muted">
          <TouchableOpacity
            onPress={() => onChangeServings(Math.max(1, targetServings - 1))}
            disabled={adding || disabled || targetServings <= 1}
            className="h-9 w-9 items-center justify-center"
            style={{
              opacity: adding || disabled || targetServings <= 1 ? 0.4 : 1,
            }}
            accessibilityLabel="Decrease servings"
          >
            <Ionicons name="remove" size={15} color="#374151" />
          </TouchableOpacity>
          <Text className="min-w-8 text-center text-sm font-bold text-foreground tabular-nums">
            {targetServings}
          </Text>
          <TouchableOpacity
            onPress={() => onChangeServings(Math.min(16, targetServings + 1))}
            disabled={adding || disabled || targetServings >= 16}
            className="h-9 w-9 items-center justify-center"
            style={{
              opacity: adding || disabled || targetServings >= 16 ? 0.4 : 1,
            }}
            accessibilityLabel="Increase servings"
          >
            <Ionicons name="add" size={15} color="#374151" />
          </TouchableOpacity>
        </View>
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
