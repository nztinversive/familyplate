import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import { isIngredientAvailable } from "@/lib/ingredientAvailability";

type Recipe = Doc<"recipeSuggestions">;

export function CookModeModal({
  visible,
  recipe,
  isFinishing,
  onClose,
  onStepViewed,
  onFinishCooking,
}: {
  visible: boolean;
  recipe: Recipe | null;
  isFinishing: boolean;
  onClose: () => void;
  onStepViewed?: (stepIndex: number) => void;
  onFinishCooking: (leftoverNote?: string) => Promise<void>;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [leftoverNote, setLeftoverNote] = useState("");
  const lastTrackedStep = useRef<number | null>(null);

  const steps = recipe?.instructions ?? [];
  const totalSteps = Math.max(steps.length, 1);
  const isFinalStep = stepIndex >= totalSteps - 1;
  const pantryCount = useMemo(
    () => recipe?.ingredients.filter(isIngredientAvailable).length ?? 0,
    [recipe],
  );

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    setLeftoverNote("");
    lastTrackedStep.current = null;
  }, [visible, recipe?._id]);

  useEffect(() => {
    if (!visible) return;
    if (lastTrackedStep.current === stepIndex) return;
    lastTrackedStep.current = stepIndex;
    onStepViewed?.(stepIndex + 1);
  }, [onStepViewed, stepIndex, visible]);

  if (!recipe) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="border-b border-border px-4 pb-3 pt-14">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Cook Mode
              </Text>
              <Text className="mt-1 text-xl font-bold text-foreground">
                {recipe.title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={isFinishing}
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
              accessibilityRole="button"
              accessibilityLabel="Close Cook Mode"
            >
              <Ionicons name="close" size={22} color="#26211b" />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <View className="mb-4 rounded-2xl border border-border bg-card p-4">
            <View className="mb-3 flex-row flex-wrap gap-2">
              <CookPill icon="time-outline" label={`${recipe.estimatedTime} min`} />
              <CookPill icon="people-outline" label={`Serves ${recipe.servings}`} />
              <CookPill
                icon="leaf-outline"
                label={`${pantryCount}/${recipe.ingredients.length} in pantry`}
              />
            </View>
            <Text className="text-sm leading-5 text-muted-foreground">
              {recipe.description}
            </Text>
          </View>

          <View className="mb-4 rounded-2xl border border-border bg-card p-4">
            <Text className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Ingredients
            </Text>
            <View className="gap-2">
              {recipe.ingredients.map((ingredient, index) => (
                <View
                  key={`${ingredient.name}-${index}`}
                  className="flex-row items-center gap-3 rounded-xl bg-muted px-3 py-2"
                >
                  <Ionicons
                    name={isIngredientAvailable(ingredient) ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={isIngredientAvailable(ingredient) ? "#248f58" : "#9a9489"}
                  />
                  <Text className="flex-1 text-sm font-semibold text-foreground">
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="rounded-2xl border border-border bg-card p-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Step {stepIndex + 1} of {totalSteps}
              </Text>
              <View className="rounded-full bg-primary/10 px-3 py-1">
                <Text className="text-xs font-bold text-primary">
                  {Math.round(((stepIndex + 1) / totalSteps) * 100)}%
                </Text>
              </View>
            </View>

            <Text className="text-xl font-bold leading-8 text-foreground">
              {steps[stepIndex] ?? "Cook this recipe using the ingredients above."}
            </Text>

            {isFinalStep ? (
              <View className="mt-5 rounded-xl bg-muted p-3">
                <Text className="text-sm font-semibold text-foreground">
                  Save leftovers?
                </Text>
                <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                  Optional. This adds a fridge pantry item so tomorrow's planning can see it.
                </Text>
                <TextInput
                  value={leftoverNote}
                  onChangeText={setLeftoverNote}
                  editable={!isFinishing}
                  placeholder={`Example: 2 servings of ${recipe.title}`}
                  placeholderTextColor="#9a9489"
                  className="mt-3 rounded-xl border border-border bg-background px-3 py-3 text-foreground"
                />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-4 pb-8 pt-3">
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0 || isFinishing}
              className="flex-1 items-center rounded-xl border border-border bg-card py-3"
              style={{ opacity: stepIndex === 0 || isFinishing ? 0.55 : 1 }}
            >
              <Text className="font-semibold text-muted-foreground">Back</Text>
            </TouchableOpacity>
            {isFinalStep ? (
              <TouchableOpacity
                onPress={() => void onFinishCooking(leftoverNote.trim() || undefined)}
                disabled={isFinishing}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
                style={{ opacity: isFinishing ? 0.55 : 1 }}
              >
                {isFinishing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                )}
                <Text className="font-semibold text-white">
                  {isFinishing ? "Finishing..." : "Finish"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  setStepIndex((current) => Math.min(totalSteps - 1, current + 1))
                }
                disabled={isFinishing}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
              >
                <Text className="font-semibold text-white">Next</Text>
                <Ionicons name="arrow-forward" size={17} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CookPill({
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
