import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type EffortLevel = "easy" | "medium" | "hard";

type IngredientInput = {
  name: string;
  quantity: string;
  unit: string;
};

type NutritionInput = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

const EMPTY_INGREDIENT: IngredientInput = {
  name: "",
  quantity: "",
  unit: "",
};

function createInitialForm() {
  return {
    title: "",
    description: "",
    estimatedTime: "30",
    servings: "4",
    effortLevel: "easy" as EffortLevel,
    tags: "",
    instructions: "",
    ingredients: [{ ...EMPTY_INGREDIENT }, { ...EMPTY_INGREDIENT }],
    nutrition: {
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      fiber: "",
    } satisfies NutritionInput,
  };
}

function parsePositiveNumber(value: string, fieldName: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
  return number;
}

function parseOptionalNutrition(nutrition: NutritionInput) {
  const hasNutrition = Object.values(nutrition).some((value) => value.trim());
  if (!hasNutrition) return undefined;

  const parsed = {
    calories: parsePositiveNumber(nutrition.calories, "Calories"),
    protein: parsePositiveNumber(nutrition.protein, "Protein"),
    carbs: parsePositiveNumber(nutrition.carbs, "Carbs"),
    fat: parsePositiveNumber(nutrition.fat, "Fat"),
    ...(nutrition.fiber.trim()
      ? { fiber: parsePositiveNumber(nutrition.fiber, "Fiber") }
      : {}),
  };

  return parsed;
}

export function CustomRecipeModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (recipeId: Id<"recipeSuggestions">, title: string) => void;
}) {
  const createCustomRecipe = useMutation(api.mutations.recipes.createCustomRecipe);
  const posthog = usePostHog();
  const [form, setForm] = useState(createInitialForm);
  const [showNutrition, setShowNutrition] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) return;
    setForm(createInitialForm());
    setShowNutrition(false);
    setError("");
    setIsSubmitting(false);
  }, [visible]);

  const updateIngredient = (
    index: number,
    key: keyof IngredientInput,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, [key]: value } : ingredient,
      ),
    }));
  };

  const addIngredient = () => {
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, { ...EMPTY_INGREDIENT }],
    }));
  };

  const removeIngredient = (index: number) => {
    setForm((current) => ({
      ...current,
      ingredients:
        current.ingredients.length === 1
          ? [{ ...EMPTY_INGREDIENT }]
          : current.ingredients.filter(
              (_, ingredientIndex) => ingredientIndex !== index,
            ),
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const title = form.title.trim();
      if (!title) throw new Error("Recipe title is required.");

      const estimatedTime = parsePositiveNumber(
        form.estimatedTime,
        "Estimated time",
      );
      const servings = parsePositiveNumber(form.servings, "Servings");
      const ingredients = form.ingredients
        .filter(
          (ingredient) =>
            ingredient.name.trim() ||
            ingredient.quantity.trim() ||
            ingredient.unit.trim(),
        )
        .map((ingredient, index) => {
          const name = ingredient.name.trim();
          const quantity = parsePositiveNumber(
            ingredient.quantity,
            `Ingredient ${index + 1} quantity`,
          );
          const unit = ingredient.unit.trim();
          if (!name || !unit) {
            throw new Error(
              `Ingredient ${index + 1} needs a name, quantity, and unit.`,
            );
          }
          return { name, quantity, unit };
        });

      if (ingredients.length === 0) {
        throw new Error("Add at least one ingredient.");
      }

      const instructions = form.instructions
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean);

      if (instructions.length === 0) {
        throw new Error("Add at least one instruction.");
      }

      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const nutrition = parseOptionalNutrition(form.nutrition);

      const recipeId = await createCustomRecipe({
        title,
        description: form.description.trim(),
        ingredients,
        instructions,
        effortLevel: form.effortLevel,
        estimatedTime,
        servings,
        tags,
        nutrition,
      });

      track(posthog, "custom_recipe_created", {
        ingredient_count: ingredients.length,
        instruction_count: instructions.length,
        has_nutrition: !!nutrition,
      });
      onCreated(recipeId, title);
      onClose();
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "cookbook", action: "create_custom_recipe", platform: "ios" },
      });
      setError(err instanceof Error ? err.message : "Could not save recipe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        className="flex-1 bg-background"
        style={{ backgroundColor: "#fbfaf7" }}
      >
        <View className="border-b border-border bg-background px-4 py-3">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              className="h-10 w-10 items-center justify-center rounded-full bg-muted"
              accessibilityRole="button"
              accessibilityLabel="Close Add Recipe"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
            <View className="min-w-0 flex-1">
              <Text className="text-xl font-bold text-foreground">
                Add Recipe
              </Text>
              <Text className="text-sm text-muted-foreground">
                Save a family favorite to Cookbook.
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View className="flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text className="flex-1 text-sm leading-5 text-red-700">
                {error}
              </Text>
            </View>
          ) : null}

          <FormSection
            icon="restaurant-outline"
            title="Recipe basics"
            subtitle="Keep it short enough to scan while cooking."
          >
            <RecipeInput
              label="Title"
              value={form.title}
              placeholder="Grandma's chicken enchiladas"
              onChangeText={(title) =>
                setForm((current) => ({ ...current, title }))
              }
              editable={!isSubmitting}
            />
            <RecipeInput
              label="Short description"
              value={form.description}
              placeholder="A quick crowd-pleaser with crispy edges."
              onChangeText={(description) =>
                setForm((current) => ({ ...current, description }))
              }
              editable={!isSubmitting}
              multiline
            />
            <View className="flex-row gap-2">
              <RecipeInput
                label="Minutes"
                value={form.estimatedTime}
                placeholder="30"
                onChangeText={(estimatedTime) =>
                  setForm((current) => ({ ...current, estimatedTime }))
                }
                editable={!isSubmitting}
                keyboardType="number-pad"
                containerClassName="flex-1"
              />
              <RecipeInput
                label="Servings"
                value={form.servings}
                placeholder="4"
                onChangeText={(servings) =>
                  setForm((current) => ({ ...current, servings }))
                }
                editable={!isSubmitting}
                keyboardType="number-pad"
                containerClassName="flex-1"
              />
            </View>
            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Effort
              </Text>
              <View className="flex-row gap-2">
                {(["easy", "medium", "hard"] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        effortLevel: option,
                      }))
                    }
                    disabled={isSubmitting}
                    className={`flex-1 rounded-xl border py-3 ${
                      form.effortLevel === option
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Set effort to ${option}`}
                  >
                    <Text
                      className={`text-center text-sm font-bold capitalize ${
                        form.effortLevel === option
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </FormSection>

          <FormSection
            icon="nutrition-outline"
            title="Ingredients"
            subtitle="Quantities power Grocery List and pantry matching."
            action={
              <TouchableOpacity
                onPress={addIngredient}
                disabled={isSubmitting}
                className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-2"
                accessibilityRole="button"
                accessibilityLabel="Add ingredient"
              >
                <Ionicons name="add" size={14} color="#248f58" />
                <Text className="text-xs font-bold text-primary">Add</Text>
              </TouchableOpacity>
            }
          >
            <View className="gap-3">
              {form.ingredients.map((ingredient, index) => (
                <View
                  key={`ingredient-${index}`}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Ingredient {index + 1}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeIngredient(index)}
                      disabled={isSubmitting}
                      className="h-8 w-8 items-center justify-center rounded-full bg-red-50"
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ingredient ${index + 1}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color="#dc2626"
                      />
                    </TouchableOpacity>
                  </View>
                  <RecipeInput
                    label="Name"
                    value={ingredient.name}
                    placeholder="Chicken thighs"
                    onChangeText={(value) =>
                      updateIngredient(index, "name", value)
                    }
                    editable={!isSubmitting}
                  />
                  <View className="mt-3 flex-row gap-2">
                    <RecipeInput
                      label="Qty"
                      value={ingredient.quantity}
                      placeholder="1"
                      onChangeText={(value) =>
                        updateIngredient(index, "quantity", value)
                      }
                      editable={!isSubmitting}
                      keyboardType="decimal-pad"
                      containerClassName="w-24"
                    />
                    <RecipeInput
                      label="Unit"
                      value={ingredient.unit}
                      placeholder="lb"
                      onChangeText={(value) =>
                        updateIngredient(index, "unit", value)
                      }
                      editable={!isSubmitting}
                      containerClassName="flex-1"
                    />
                  </View>
                </View>
              ))}
            </View>
          </FormSection>

          <FormSection
            icon="list-outline"
            title="Instructions"
            subtitle="Put each step on its own line for Cook Mode."
          >
            <RecipeInput
              label="Steps"
              value={form.instructions}
              placeholder={"Brown the chicken.\nAdd sauce and simmer.\nServe with rice."}
              onChangeText={(instructions) =>
                setForm((current) => ({ ...current, instructions }))
              }
              editable={!isSubmitting}
              multiline
              inputClassName="min-h-32"
            />
          </FormSection>

          <FormSection
            icon="pricetag-outline"
            title="Tags"
            subtitle="Optional labels help group meals later."
          >
            <RecipeInput
              label="Tags"
              value={form.tags}
              placeholder="comfort food, weeknight, chicken"
              onChangeText={(tags) =>
                setForm((current) => ({ ...current, tags }))
              }
              editable={!isSubmitting}
            />
          </FormSection>

          <View className="rounded-2xl border border-border bg-card p-4">
            <TouchableOpacity
              onPress={() => setShowNutrition((current) => !current)}
              className="flex-row items-center gap-3"
              accessibilityRole="button"
              accessibilityLabel={
                showNutrition
                  ? "Hide optional nutrition"
                  : "Show optional nutrition"
              }
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Ionicons name="stats-chart-outline" size={19} color="#248f58" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-foreground">
                  Optional nutrition
                </Text>
                <Text className="text-xs leading-4 text-muted-foreground">
                  Per-serving estimates, if you already know them.
                </Text>
              </View>
              <Ionicons
                name={showNutrition ? "chevron-up" : "chevron-down"}
                size={18}
                color="#6f756f"
              />
            </TouchableOpacity>

            {showNutrition ? (
              <View className="mt-4 gap-3">
                <View className="flex-row gap-2">
                  <RecipeInput
                    label="Calories"
                    value={form.nutrition.calories}
                    placeholder="450"
                    onChangeText={(calories) =>
                      setForm((current) => ({
                        ...current,
                        nutrition: { ...current.nutrition, calories },
                      }))
                    }
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    containerClassName="flex-1"
                  />
                  <RecipeInput
                    label="Protein"
                    value={form.nutrition.protein}
                    placeholder="32"
                    onChangeText={(protein) =>
                      setForm((current) => ({
                        ...current,
                        nutrition: { ...current.nutrition, protein },
                      }))
                    }
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    containerClassName="flex-1"
                  />
                </View>
                <View className="flex-row gap-2">
                  <RecipeInput
                    label="Carbs"
                    value={form.nutrition.carbs}
                    placeholder="40"
                    onChangeText={(carbs) =>
                      setForm((current) => ({
                        ...current,
                        nutrition: { ...current.nutrition, carbs },
                      }))
                    }
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    containerClassName="flex-1"
                  />
                  <RecipeInput
                    label="Fat"
                    value={form.nutrition.fat}
                    placeholder="18"
                    onChangeText={(fat) =>
                      setForm((current) => ({
                        ...current,
                        nutrition: { ...current.nutrition, fat },
                      }))
                    }
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    containerClassName="flex-1"
                  />
                </View>
                <RecipeInput
                  label="Fiber"
                  value={form.nutrition.fiber}
                  placeholder="6"
                  onChangeText={(fiber) =>
                    setForm((current) => ({
                      ...current,
                      nutrition: { ...current.nutrition, fiber },
                    }))
                  }
                  editable={!isSubmitting}
                  keyboardType="number-pad"
                />
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => void handleSubmit()}
            disabled={isSubmitting}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4"
            style={{ opacity: isSubmitting ? 0.65 : 1 }}
            accessibilityRole="button"
            accessibilityLabel="Save recipe to Cookbook"
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={19} color="white" />
            )}
            <Text className="font-bold text-white">
              {isSubmitting ? "Saving..." : "Save to Cookbook"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function FormSection({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name={icon} size={19} color="#248f58" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-foreground">{title}</Text>
          <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {subtitle}
          </Text>
        </View>
        {action}
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function RecipeInput({
  label,
  value,
  placeholder,
  onChangeText,
  editable,
  multiline,
  keyboardType,
  containerClassName,
  inputClassName,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  containerClassName?: string;
  inputClassName?: string;
}) {
  return (
    <View className={containerClassName}>
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#9a9489"
        className={`rounded-xl border border-border bg-background px-3 py-3 text-foreground ${inputClassName ?? ""}`}
      />
    </View>
  );
}
