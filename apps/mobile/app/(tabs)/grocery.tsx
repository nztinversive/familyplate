import { useMemo, useState } from "react";
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
  const moveCheckedToPantry = useMutation(
    api.mutations.grocery.moveCheckedToPantry,
  );
  const clearAll = useMutation(api.mutations.grocery.clearAll);
  const addToPantry = useMutation(api.mutations.pantry.addItem);

  const [activeTab, setActiveTab] = useState<GroceryTab>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isMovingCheckedToPantry, setIsMovingCheckedToPantry] = useState(false);
  const [storeMode, setStoreMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const allItems = useMemo(() => {
    return (groceryList?.items ?? [])
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter((item) => !isAlwaysAvailableIngredient(item.name));
  }, [groceryList?.items]);

  const visibleItems = useMemo(() => {
    if (storeMode) return allItems.filter((item) => !item.checked);

    return allItems.filter((item) => {
      if (activeTab === "remaining") return !item.checked;
      if (activeTab === "checked") return item.checked;
      return true;
    });
  }, [activeTab, allItems, storeMode]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, GroceryItem[]>();
    for (const item of visibleItems) {
      const category = item.category || "Other";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  const checkedCount = allItems.filter((item) => item.checked).length;
  const totalCount = allItems.length;
  const remainingCount = totalCount - checkedCount;
  const progressPct =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const hasPlan = !!mealPlan;
  const householdId = currentUser?.householdId ?? null;

  const handleGenerateFromPlan = async () => {
    setIsGenerating(true);
    setError("");
    setNotice("");
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
        tags: { area: "grocery", action: "generate_from_plan", platform: process.env.EXPO_OS ?? "unknown" },
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
    setNotice("");
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
    setNotice("");
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
    setNotice("");
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
        tags: { area: "grocery", action: "move_to_pantry", platform: process.env.EXPO_OS ?? "unknown" },
      });
      setError(getErrorMessage(err));
    } finally {
      setBusyIndex(null);
    }
  };

  const handleMoveCheckedToPantry = async () => {
    if (!groceryList || checkedCount === 0) return;

    setIsMovingCheckedToPantry(true);
    setError("");
    setNotice("");

    try {
      const result = await moveCheckedToPantry({
        groceryListId: groceryList._id,
      });
      track(posthog, "grocery_items_moved_to_pantry", {
        count: result.movedCount,
        remaining_count: result.remainingCount,
        source: "grocery_tab_batch",
      });
      setActiveTab(result.remainingCount > 0 ? "remaining" : "all");
      setNotice(
        `Moved ${result.movedCount} checked item${
          result.movedCount === 1 ? "" : "s"
        } to Pantry.`,
      );
      if (result.remainingCount === 0) setStoreMode(false);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "grocery", action: "move_checked_to_pantry", platform: process.env.EXPO_OS ?? "unknown" },
      });
      setError(getErrorMessage(err));
    } finally {
      setIsMovingCheckedToPantry(false);
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
          setNotice("");
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
    setNotice("");
    await addCustomItem(values);
    track(posthog, "grocery_item_added", {
      source: "manual_form",
      category: values.category,
    });
    setShowAddForm(false);
    setActiveTab("all");
  };

  const handleStartStoreMode = () => {
    setStoreMode(true);
    setActiveTab("remaining");
    setNotice("");
    track(posthog, "grocery_store_mode_started", {
      total_count: totalCount,
      remaining_count: remainingCount,
    });
  };

  const handleFinishStoreMode = async () => {
    track(posthog, "grocery_store_mode_finished", {
      checked_count: checkedCount,
      remaining_count: remainingCount,
    });

    if (checkedCount > 0) {
      await handleMoveCheckedToPantry();
      return;
    }

    setStoreMode(false);
    setNotice("Store Mode closed. Nothing was checked yet.");
  };

  const handleShareGroceryList = async () => {
    const shareableItems = allItems.filter((item) => !item.checked);
    if (shareableItems.length === 0) {
      Alert.alert("Nothing to share", "No remaining grocery items to share.");
      return;
    }

    setNotice("");
    const groups = new Map<string, GroceryItem[]>();
    for (const item of shareableItems) {
      const category = item.category || "Other";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(item);
    }

    const lines = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([category, items]) => [
        category,
        ...items.map((item) => `- ${item.quantity} ${item.unit} ${item.name}`),
      ]);

    try {
      await Share.share({
        title: "FamilyPlate Grocery List",
        message: `FamilyPlate Grocery List\n\n${lines.join("\n")}`,
      });
      setNotice("");
      track(posthog, "grocery_list_shared", {
        item_count: shareableItems.length,
        source: storeMode ? "store_mode" : "grocery_tab",
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "grocery", action: "share_list", platform: process.env.EXPO_OS ?? "unknown" },
      });
      setError(getErrorMessage(err));
    }
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
      <View className="mb-4 gap-2">
        <View className="flex-row gap-2">
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
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() =>
              storeMode ? setStoreMode(false) : handleStartStoreMode()
            }
            disabled={totalCount === 0}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
              storeMode ? "bg-primary" : "border border-border bg-card"
            }`}
            style={{ opacity: totalCount === 0 ? 0.55 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={storeMode ? "Close Store Mode" : "Open Store Mode"}
          >
            <Ionicons
              name="storefront-outline"
              size={18}
              color={storeMode ? "white" : "#248f58"}
            />
            <Text
              className={`font-semibold ${
                storeMode ? "text-white" : "text-primary"
              }`}
            >
              {storeMode ? "Shopping" : "Store Mode"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void handleShareGroceryList()}
            disabled={totalCount === 0}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
            style={{ opacity: totalCount === 0 ? 0.55 : 1 }}
            accessibilityRole="button"
            accessibilityLabel="Share grocery list"
          >
            <Ionicons name="share-outline" size={18} color="#248f58" />
            <Text className="font-semibold text-primary">Share</Text>
          </TouchableOpacity>
        </View>
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

      {notice ? (
        <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <Ionicons name="checkmark-circle" size={18} color="#15803d" />
          <Text className="flex-1 text-sm leading-5 text-green-700">
            {notice}
          </Text>
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

          {storeMode ? (
            <View className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-card">
                  <Ionicons name="storefront" size={20} color="#248f58" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-bold text-foreground">
                    Store Mode
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                    Checked items hide while you shop. Finish the trip to move
                    purchased items into Pantry.
                  </Text>
                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => void handleFinishStoreMode()}
                      disabled={isMovingCheckedToPantry}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
                      style={{
                        opacity: isMovingCheckedToPantry ? 0.65 : 1,
                      }}
                    >
                      {isMovingCheckedToPantry ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Ionicons name="checkmark-circle" size={17} color="white" />
                      )}
                      <Text className="font-semibold text-white">
                        {checkedCount > 0 ? "Finish Trip" : "Close"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void handleShareGroceryList()}
                      className="h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-card"
                      accessibilityRole="button"
                      accessibilityLabel="Share grocery list"
                    >
                      <Ionicons name="share-outline" size={19} color="#248f58" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View className="mt-3 flex-row gap-2">
                <StoreStat label="To buy" value={remainingCount} />
                <StoreStat label="Checked" value={checkedCount} />
                <StoreStat label="Done" value={`${progressPct}%`} />
              </View>
            </View>
          ) : null}

          {checkedCount > 0 ? (
            <View className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-3">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-card">
                  <Ionicons name="cube" size={18} color="#248f58" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {checkedCount} checked item{checkedCount === 1 ? "" : "s"}
                  </Text>
                  <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    Move purchased groceries into Pantry and remove them from
                    this list.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void handleMoveCheckedToPantry()}
                  disabled={isMovingCheckedToPantry}
                  className="rounded-xl bg-primary px-3 py-2.5"
                  style={{ opacity: isMovingCheckedToPantry ? 0.65 : 1 }}
                  accessibilityRole="button"
                  accessibilityLabel="Move checked grocery items to pantry"
                >
                  {isMovingCheckedToPantry ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-xs font-bold text-white">
                      Move All
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!storeMode ? (
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
          ) : null}

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
                        storeMode={storeMode}
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

function StoreStat({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="flex-1 rounded-xl bg-card p-3">
      <Text className="text-lg font-bold text-foreground tabular-nums">
        {value}
      </Text>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function GroceryItemRow({
  item,
  busy,
  canMoveToPantry,
  storeMode,
  onToggle,
  onRemove,
  onMoveToPantry,
}: {
  item: GroceryItem;
  busy: boolean;
  canMoveToPantry: boolean;
  storeMode: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveToPantry: () => void;
}) {
  return (
    <View
      className={`rounded-2xl border border-border bg-card ${
        storeMode ? "p-4" : "p-3"
      }`}
      style={{ opacity: item.checked ? 0.65 : 1 }}
    >
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={onToggle}
          disabled={busy}
          className={`${storeMode ? "h-11 w-11" : "h-7 w-7"} items-center justify-center rounded-full border-2 ${
            item.checked ? "border-primary bg-primary" : "border-border bg-card"
          }`}
        >
          {item.checked ? (
            <Ionicons name="checkmark" size={storeMode ? 22 : 16} color="white" />
          ) : null}
        </TouchableOpacity>

        <View className="min-w-0 flex-1">
          <Text
            className={`${storeMode ? "text-lg" : "text-base"} font-semibold ${
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
          className={`${storeMode ? "h-11 w-11" : "h-8 w-8"} items-center justify-center`}
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
      <View className="mb-5 w-full gap-2">
        <EmptyGuideRow
          icon="calendar-outline"
          label="Generate from Weekly Plan when dinners are ready."
        />
        <EmptyGuideRow
          icon="book-outline"
          label="Cookbook recipes can add missing ingredients here."
        />
        <EmptyGuideRow
          icon="cube-outline"
          label="Checked items can move straight into Pantry."
        />
      </View>
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
