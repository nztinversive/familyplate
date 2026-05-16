import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import { usePostHog } from "posthog-react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { LoadingCard } from "@/components/LoadingCard";
import { PANTRY_CATEGORIES, PANTRY_UNITS } from "@/lib/pantry";
import { isAlwaysAvailableIngredient } from "@/lib/ingredientAvailability";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type GroceryList = Doc<"groceryLists">;
type GroceryItem = GroceryList["items"][number] & { originalIndex: number };
type GroceryTab = "all" | "remaining" | "checked";

const FILTER_TABS: { key: GroceryTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "remaining", label: "To Buy" },
  { key: "checked", label: "Checked" },
];

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

export default function GroceryScreen() {
  const posthog = usePostHog();
  const groceryList = useQuery(api.queries.grocery.getMyGroceryList, {});
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const generateFromPlan = useMutation(api.mutations.grocery.generateFromPlan);
  const addCustomItem = useMutation(api.mutations.grocery.addMyCustomItem);
  const toggleItem = useMutation(api.mutations.grocery.toggleItem);
  const removeItem = useMutation(api.mutations.grocery.removeItem);
  const clearAll = useMutation(api.mutations.grocery.clearAll);
  const addToPantry = useMutation(api.mutations.pantry.addItem);

  const [activeTab, setActiveTab] = useState<GroceryTab>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState("");

  const visibleItems = useMemo(() => {
    return (groceryList?.items ?? [])
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter((item) => !isAlwaysAvailableIngredient(item.name))
      .filter((item) => {
        if (activeTab === "remaining") return !item.checked;
        if (activeTab === "checked") return item.checked;
        return true;
      });
  }, [activeTab, groceryList?.items]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, GroceryItem[]>();
    for (const item of visibleItems) {
      const category = item.category || "Other";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  const allItems = useMemo(() => {
    return (groceryList?.items ?? [])
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter((item) => !isAlwaysAvailableIngredient(item.name));
  }, [groceryList?.items]);

  const checkedCount = allItems.filter((item) => item.checked).length;
  const totalCount = allItems.length;
  const progressPct =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const hasPlan = !!mealPlan;
  const householdId = currentUser?.householdId ?? null;

  const handleGenerateFromPlan = async () => {
    setIsGenerating(true);
    setError("");
    try {
      await generateFromPlan({});
      track(posthog, "grocery_list_generated", {
        source: "grocery_tab",
      });
      setActiveTab("all");
    } catch (err) {
      track(posthog, "grocery_list_generation_failed", {
        source: "grocery_tab",
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "grocery", action: "generate_from_plan", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (item: GroceryItem) => {
    if (!groceryList) return;
    setBusyIndex(item.originalIndex);
    setError("");
    try {
      await toggleItem({
        groceryListId: groceryList._id,
        itemIndex: item.originalIndex,
      });
      track(posthog, "grocery_item_checked", {
        checked: !item.checked,
        source: "grocery_tab",
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyIndex(null);
    }
  };

  const handleRemove = async (item: GroceryItem) => {
    if (!groceryList) return;
    setBusyIndex(item.originalIndex);
    setError("");
    try {
      await removeItem({
        groceryListId: groceryList._id,
        itemIndex: item.originalIndex,
      });
      track(posthog, "grocery_item_removed", {
        source: "grocery_tab",
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyIndex(null);
    }
  };

  const handleMoveToPantry = async (item: GroceryItem) => {
    if (!groceryList || !householdId) return;
    setBusyIndex(item.originalIndex);
    setError("");
    try {
      await addToPantry({
        householdId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        storageLocation: "pantry",
      });
      await removeItem({
        groceryListId: groceryList._id,
        itemIndex: item.originalIndex,
      });
      track(posthog, "pantry_item_added", {
        source: "grocery_to_pantry",
        category: item.category,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "grocery", action: "move_to_pantry", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setBusyIndex(null);
    }
  };

  const handleClearAll = () => {
    if (!groceryList) return;
    Alert.alert("Clear grocery list?", "This removes every item in the list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setIsClearing(true);
          setError("");
          void clearAll({ groceryListId: groceryList._id })
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setIsClearing(false));
        },
      },
    ]);
  };

  const handleAddItem = async (values: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => {
    setError("");
    await addCustomItem(values);
    track(posthog, "grocery_item_added", {
      source: "manual_form",
      category: values.category,
    });
    setShowAddForm(false);
    setActiveTab("all");
  };

  return (
    <ScreenShell
      title="Grocery List"
      subtitle={
        totalCount > 0
          ? `${checkedCount}/${totalCount} checked`
          : "Shop by category."
      }
    >
      <View className="mb-4 flex-row gap-2">
        <TouchableOpacity
          onPress={() => setShowAddForm(true)}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="font-semibold text-white">Add Item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void handleGenerateFromPlan()}
          disabled={isGenerating || !hasPlan}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
          style={{ opacity: isGenerating || !hasPlan ? 0.55 : 1 }}
        >
          {isGenerating ? (
            <ActivityIndicator color="#248f58" />
          ) : (
            <Ionicons name="list" size={18} color="#248f58" />
          )}
          <Text className="font-semibold text-primary">
            {isGenerating ? "Generating..." : "From Plan"}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <View className="flex-row items-start gap-2">
            <Ionicons name="alert-circle" size={18} color="#dc2626" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-red-800">
                Grocery list could not update
              </Text>
              <Text className="mt-1 text-sm leading-5 text-red-700">
                {error}
              </Text>
            </View>
          </View>
          <View className="mt-3 flex-row gap-2">
            {hasPlan ? (
              <TouchableOpacity
                onPress={() => void handleGenerateFromPlan()}
                disabled={isGenerating}
                className="flex-1 items-center rounded-lg border border-red-200 bg-white py-2.5"
                style={{ opacity: isGenerating ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Try generating grocery list again"
              >
                <Text className="font-semibold text-red-700">
                  {isGenerating ? "Generating..." : "Try Again"}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              className="flex-1 items-center rounded-lg bg-red-100 py-2.5"
              accessibilityRole="button"
              accessibilityLabel="Add grocery item manually"
            >
              <Text className="font-semibold text-red-700">Add Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {groceryList === undefined || currentUser === undefined ? (
        <LoadingCard
          icon="cart-outline"
          title="Loading your grocery list"
          detail="Checking what is still needed for the household."
        />
      ) : totalCount === 0 ? (
        <EmptyGroceryState
          hasPlan={hasPlan}
          isGenerating={isGenerating}
          onAdd={() => setShowAddForm(true)}
          onGenerate={() => void handleGenerateFromPlan()}
        />
      ) : (
        <>
          <View className="mb-4">
            <View className="h-3 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${progressPct}%` }}
              />
            </View>
            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs text-muted-foreground">
                {checkedCount} of {totalCount} checked
              </Text>
              <Text className="text-xs font-semibold text-primary">
                {progressPct}%
              </Text>
            </View>
          </View>

          <View className="mb-4 flex-row rounded-xl bg-muted p-1">
            {FILTER_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`flex-1 rounded-lg py-2 ${active ? "bg-card" : ""}`}
                >
                  <Text
                    className={`text-center text-sm ${
                      active
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleClearAll}
            disabled={isClearing}
            className="mb-4 items-end"
          >
            <Text className="text-xs font-semibold text-muted-foreground">
              {isClearing ? "Clearing..." : "Clear all items"}
            </Text>
          </TouchableOpacity>

          {groupedItems.length === 0 ? (
            <View className="items-center rounded-2xl border border-border bg-card p-6">
              <Text className="text-sm text-muted-foreground">
                No items in this view.
              </Text>
            </View>
          ) : (
            <View className="gap-5">
              {groupedItems.map(([category, items]) => (
                <View key={category}>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {category}
                    </Text>
                    <View className="rounded-full bg-muted px-2 py-0.5">
                      <Text className="text-[10px] font-medium text-muted-foreground">
                        {items.length}
                      </Text>
                    </View>
                  </View>

                  <View className="gap-2">
                    {items.map((item) => (
                      <GroceryItemRow
                        key={`${item.name}-${item.unit}-${item.originalIndex}`}
                        item={item}
                        busy={busyIndex === item.originalIndex}
                        canMoveToPantry={!!householdId}
                        onToggle={() => void handleToggle(item)}
                        onRemove={() => void handleRemove(item)}
                        onMoveToPantry={() => void handleMoveToPantry(item)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Modal
        visible={showAddForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddForm(false)}
      >
        <AddGroceryItemForm
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddItem}
        />
      </Modal>
    </ScreenShell>
  );
}

function GroceryItemRow({
  item,
  busy,
  canMoveToPantry,
  onToggle,
  onRemove,
  onMoveToPantry,
}: {
  item: GroceryItem;
  busy: boolean;
  canMoveToPantry: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveToPantry: () => void;
}) {
  return (
    <View
      className="rounded-2xl border border-border bg-card p-3"
      style={{ opacity: item.checked ? 0.65 : 1 }}
    >
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={onToggle}
          disabled={busy}
          className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
            item.checked ? "border-primary bg-primary" : "border-border bg-card"
          }`}
        >
          {item.checked ? (
            <Ionicons name="checkmark" size={16} color="white" />
          ) : null}
        </TouchableOpacity>

        <View className="min-w-0 flex-1">
          <Text
            className={`text-base font-semibold ${
              item.checked
                ? "text-muted-foreground line-through"
                : "text-foreground"
            }`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {item.quantity} {item.unit}
          </Text>
        </View>

        {item.checked ? (
          <TouchableOpacity
            onPress={onMoveToPantry}
            disabled={busy || !canMoveToPantry}
            className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-2 py-2"
          >
            {busy ? (
              <ActivityIndicator color="#248f58" />
            ) : (
              <Ionicons name="cube" size={14} color="#248f58" />
            )}
            <Text className="text-xs font-semibold text-primary">Pantry</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={onRemove}
          disabled={busy}
          className="h-8 w-8 items-center justify-center"
          accessibilityLabel={`Remove ${item.name}`}
        >
          <Ionicons name="trash-outline" size={17} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyGroceryState({
  hasPlan,
  isGenerating,
  onAdd,
  onGenerate,
}: {
  hasPlan: boolean;
  isGenerating: boolean;
  onAdd: () => void;
  onGenerate: () => void;
}) {
  return (
    <View className="items-center rounded-2xl border border-border bg-card p-6">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Ionicons name="cart" size={26} color="#248f58" />
      </View>
      <Text className="mb-1 text-center text-lg font-semibold text-foreground">
        No grocery items yet
      </Text>
      <Text className="mb-5 text-center text-sm leading-5 text-muted-foreground">
        {hasPlan
          ? "Generate from your weekly plan or add a quick manual item."
          : "Add a quick errand item now. Meal plan generation can fill this later."}
      </Text>
      <View className="w-full gap-2">
        <TouchableOpacity
          onPress={onAdd}
          className="items-center rounded-xl bg-primary py-3"
        >
          <Text className="font-semibold text-white">Add Item</Text>
        </TouchableOpacity>
        {hasPlan ? (
          <TouchableOpacity
            onPress={onGenerate}
            disabled={isGenerating}
            className="items-center rounded-xl border border-border bg-card py-3"
          >
            <Text className="font-semibold text-primary">
              {isGenerating ? "Checking weekly plan..." : "Generate from Plan"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function AddGroceryItemForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("items");
  const [category, setCategory] = useState("Other");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const parsedQuantity = Number.parseFloat(quantity);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        name: name.trim(),
        quantity: parsedQuantity,
        unit: unit.trim() || "items",
        category,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ backgroundColor: "#fbfaf7" }}
    >
      <View className="flex-row items-center justify-between border-b border-border bg-card px-4 pb-3 pt-14">
        <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
          <Text className="text-base text-muted-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">
          Add Grocery Item
        </Text>
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          <Text className="text-base font-semibold text-primary">
            {isSubmitting ? "Adding" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="gap-5 p-4">
        {error ? (
          <View className="rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Name
          </Text>
          <TextInput
            className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
            placeholder="e.g. Bananas"
            placeholderTextColor="#9a9489"
            value={name}
            onChangeText={setName}
            autoFocus
            editable={!isSubmitting}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quantity
            </Text>
            <TextInput
              className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Unit
            </Text>
            <View className="rounded-xl border border-border bg-card px-1 py-1">
              <ScrollChoice
                values={[...PANTRY_UNITS]}
                selected={unit}
                onSelect={setUnit}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </View>

        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PANTRY_CATEGORIES.map((option) => {
              const active = category === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setCategory(option)}
                  disabled={isSubmitting}
                  className={`rounded-full border px-3 py-2 ${
                    active
                      ? "border-primary bg-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? "text-white" : "text-foreground"
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function ScrollChoice({
  values,
  selected,
  onSelect,
  disabled,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-1">
        {values.map((value) => {
          const active = selected === value;
          return (
            <Pressable
              key={value}
              onPress={() => onSelect(value)}
              disabled={disabled}
              className={`rounded-lg px-3 py-2 ${active ? "bg-primary" : ""}`}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? "text-white" : "text-foreground"
                }`}
              >
                {value}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
