import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc, Id } from "@familyplate/convex/_generated/dataModel";
import { ScreenShell } from "@/components/ScreenShell";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";

type Recipe = Doc<"recipeSuggestions">;

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
  const savedRecipes = useQuery(api.queries.savedRecipes.getMySavedRecipes, {});
  const unsaveRecipe = useMutation(api.mutations.savedRecipes.unsaveRecipe);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const removeRecipe = (recipe: Recipe) => {
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
            }).finally(() => {
              setRemovingId(null);
              if (expandedId === recipe._id) setExpandedId(null);
            });
          },
        },
      ],
    );
  };

  return (
    <ScreenShell
      title="Cookbook"
      subtitle="Recipes you've saved from generated plans."
    >
      {savedRecipes === undefined ? (
        <View className="items-center py-16">
          <ActivityIndicator />
        </View>
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
            {savedRecipes.map((savedRecipe) => (
              <RecipeCard
                key={savedRecipe._id}
                recipe={savedRecipe.recipe}
                savedAt={savedRecipe.savedAt}
                expanded={expandedId === savedRecipe.recipe._id}
                removing={removingId === savedRecipe.recipe._id}
                onToggleExpanded={() =>
                  setExpandedId(
                    expandedId === savedRecipe.recipe._id
                      ? null
                      : savedRecipe.recipe._id,
                  )
                }
                onRemove={() => removeRecipe(savedRecipe.recipe)}
              />
            ))}
          </View>
        </>
      )}
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
        Save dinner ideas from Tonight and they will appear here.
      </Text>
    </View>
  );
}

function RecipeCard({
  recipe,
  savedAt,
  expanded,
  removing,
  onToggleExpanded,
  onRemove,
}: {
  recipe: Recipe;
  savedAt: number;
  expanded: boolean;
  removing: boolean;
  onToggleExpanded: () => void;
  onRemove: () => void;
}) {
  const pantryCount = recipe.ingredients.filter((ingredient) =>
    isIngredientAvailable(ingredient),
  ).length;
  const totalCount = recipe.ingredients.length;
  const matchPct =
    totalCount > 0 ? Math.round((pantryCount / totalCount) * 100) : 0;
  const effortColor = getEffortColor(recipe.effortLevel);

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
