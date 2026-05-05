import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { ScreenShell } from "@/components/ScreenShell";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";

type Suggestion = {
  _id?: string;
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
};

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

export default function TonightScreen() {
  const suggestFromPantry = useAction(
    api.actions.quickDinner.suggestFromPantry,
  );
  const persistedSuggestions = useQuery(
    api.queries.planner.getQuickDinnerSuggestions,
    {},
  );
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const saveRecipe = useMutation(api.mutations.savedRecipes.saveRecipe);
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);

  const [freshSuggestions, setFreshSuggestions] = useState<Suggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCraving, setSelectedCraving] = useState("");
  const [customCraving, setCustomCraving] = useState("");
  const [activeCraving, setActiveCraving] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);

  const initialSuggestions = useMemo<Suggestion[]>(() => {
    if (!persistedSuggestions?.length) return [];

    return persistedSuggestions.map((recipe) => ({
      _id: recipe._id,
      name: recipe.title,
      description: recipe.description,
      effortLevel: recipe.effortLevel,
      estimatedTime: recipe.estimatedTime,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
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

  const handleGenerate = async (overrideCraving?: string) => {
    const cravingValue = (
      (overrideCraving ?? selectedCraving) ||
      customCraving
    ).trim();

    setIsGenerating(true);
    setError("");
    setFreshSuggestions([]);
    setExpandedIndex(null);
    setActiveCraving(cravingValue);
    setHasGenerated(true);

    try {
      const result = await suggestFromPantry({
        craving: cravingValue || undefined,
      });

      if (result.suggestions.length === 0) {
        setError("Add some pantry items first so I can suggest dinner.");
      } else {
        setFreshSuggestions(result.suggestions);
      }
    } catch (err) {
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

  const handleToggleSave = async (recipeId: string) => {
    setSavingRecipeId(recipeId);
    try {
      const typedId = recipeId as Id<"recipeSuggestions">;
      if (savedRecipeIds.has(typedId)) {
        await unsaveRecipe({ recipeId: typedId });
      } else {
        await saveRecipe({ recipeId: typedId });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRecipeId(null);
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
            ? "Finding dinners..."
            : selectedCraving || customCraving
              ? "Suggest Dinners"
              : suggestions.length > 0
                ? "Suggest Different Dinners"
                : "Suggest Dinners"}
        </Text>
      </TouchableOpacity>

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
          <Text className="mb-3 text-sm leading-5 text-red-700">{error}</Text>
          <TouchableOpacity
            onPress={() => void handleGenerate()}
            className="items-center rounded-lg border border-red-200 bg-white py-2.5"
          >
            <Text className="font-semibold text-red-700">Try again</Text>
          </TouchableOpacity>
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
            onToggleExpanded={() =>
              setExpandedIndex(expandedIndex === index ? null : index)
            }
            onToggleSave={() => {
              if (suggestion._id) void handleToggleSave(suggestion._id);
            }}
          />
        ))}
      </View>
    </ScreenShell>
  );
}

function SuggestionCard({
  suggestion,
  expanded,
  saved,
  saving,
  onToggleExpanded,
  onToggleSave,
}: {
  suggestion: Suggestion;
  expanded: boolean;
  saved: boolean;
  saving: boolean;
  onToggleExpanded: () => void;
  onToggleSave: () => void;
}) {
  const pantryCount = suggestion.ingredients.filter((ingredient) =>
    isIngredientAvailable(ingredient),
  ).length;
  const totalCount = suggestion.ingredients.length;
  const matchPct =
    totalCount > 0 ? Math.round((pantryCount / totalCount) * 100) : 0;
  const effortColor = getEffortColor(suggestion.effortLevel);

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
      <Pressable onPress={onToggleExpanded} className="p-4">
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
            label={`Serves ${suggestion.servings}`}
          />
          <InfoPill label={`${pantryCount}/${totalCount} in pantry`} />
          {suggestion._id ? (
            <TouchableOpacity
              onPress={onToggleSave}
              disabled={saving}
              className="ml-auto flex-row items-center gap-1 rounded-lg px-2 py-1"
              accessibilityLabel={
                saved ? "Remove from cookbook" : "Save to cookbook"
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
        </View>
      </Pressable>

      {expanded ? (
        <View className="border-t border-border p-4">
          {suggestion.missingItems.length > 0 ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                Need to buy
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {suggestion.missingItems.map((item) => (
                  <View
                    key={item}
                    className="rounded-lg bg-accent/10 px-2 py-1"
                  >
                    <Text className="text-xs font-semibold text-accent">
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ingredients
            </Text>
            <View className="gap-2">
              {suggestion.ingredients.map((ingredient, index) => {
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
