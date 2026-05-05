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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import {
  formatExpirationLabel,
  getExpirationColor,
  getStorageTint,
  type StorageLocation,
} from "@/lib/pantry";
import { PantryItemForm } from "@/components/pantry/PantryItemForm";
import { ExpirationAlerts } from "@/components/pantry/ExpirationAlerts";
import {
  BarcodeScanner,
  type BarcodeScannerResult,
} from "@/components/pantry/BarcodeScanner";
import {
  QuickAddBar,
  type QuickAddItem,
} from "@/components/pantry/QuickAddBar";
import {
  SnapGroceries,
  type SnapGroceryItem,
} from "@/components/pantry/SnapGroceries";

type PantryItem = Doc<"pantryItems">;
type Tab = "all" | StorageLocation;

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pantry", label: "Pantry" },
  { key: "fridge", label: "Fridge" },
  { key: "freezer", label: "Freezer" },
];

const STORAGE_ICON: Record<StorageLocation, keyof typeof Ionicons.glyphMap> = {
  pantry: "cube",
  fridge: "thermometer",
  freezer: "snow",
};

export default function PantryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSnapGroceries, setShowSnapGroceries] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [prefillValues, setPrefillValues] =
    useState<BarcodeScannerResult | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [quickAddNotice, setQuickAddNotice] = useState("");
  const [quickAddError, setQuickAddError] = useState("");

  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const householdId = currentUser?.householdId ?? null;

  const allPantryItems = useQuery(api.queries.pantry.getMyPantryItems, {});
  const pantryItems = useQuery(
    api.queries.pantry.getMyPantryItems,
    activeTab === "all" ? "skip" : { storageLocation: activeTab },
  );
  const visibleItemsForTab = activeTab === "all" ? allPantryItems : pantryItems;

  const addItem = useMutation(api.mutations.pantry.addItem);
  const updateItem = useMutation(api.mutations.pantry.updateItem);
  const deleteItem = useMutation(api.mutations.pantry.deleteItem);

  const filteredItems = useMemo(() => {
    return (visibleItemsForTab ?? [])
      .filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        if (a.expirationDate && b.expirationDate)
          return a.expirationDate - b.expirationDate;
        if (a.expirationDate) return -1;
        if (b.expirationDate) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [visibleItemsForTab, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PantryItem[]>();
    for (const item of filteredItems) {
      const cat = item.category || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  const openAdd = () => {
    setEditingItem(null);
    setPrefillValues(null);
    setShowForm(true);
  };

  const openEdit = (item: PantryItem) => {
    setEditingItem(item);
    setPrefillValues(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setPrefillValues(null);
  };

  const handleScannerResult = (result: BarcodeScannerResult) => {
    setEditingItem(null);
    setPrefillValues(result);
    setShowScanner(false);
    setShowForm(true);
  };

  const adjustQuantity = async (item: PantryItem, delta: number) => {
    const next = Math.round((item.quantity + delta) * 100) / 100;
    if (next <= 0) return;
    try {
      await updateItem({ itemId: item._id, quantity: next });
    } catch (err) {
      Alert.alert(
        "Couldn't update quantity",
        err instanceof Error ? err.message : "",
      );
    }
  };

  const handleQuickAdd = async (items: QuickAddItem[]) => {
    if (!householdId) return;

    setQuickAddNotice("");
    setQuickAddError("");

    try {
      for (const item of items) {
        await addItem({
          householdId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          storageLocation: "pantry",
        });
      }
      setActiveTab("all");
      setQuickAddNotice(
        `Added ${items.length} item${items.length === 1 ? "" : "s"} to Pantry.`,
      );
    } catch (err) {
      setQuickAddError(
        err instanceof Error ? err.message : "Couldn't add pantry items.",
      );
      throw err;
    }
  };

  const handleSnapAdd = async (items: SnapGroceryItem[]) => {
    if (!householdId) return;

    setQuickAddNotice("");
    setQuickAddError("");

    try {
      for (const item of items) {
        await addItem({
          householdId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          storageLocation: "pantry",
        });
      }
      setActiveTab("all");
      setQuickAddNotice(
        `Added ${items.length} item${items.length === 1 ? "" : "s"} from photo.`,
      );
    } catch (err) {
      setQuickAddError(
        err instanceof Error ? err.message : "Couldn't add photo items.",
      );
      throw err;
    }
  };

  const confirmDelete = (item: PantryItem) => {
    setQuickAddNotice("");
    setQuickAddError("");
    Alert.alert(
      "Delete pantry item?",
      `${item.name} will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteItem({ itemId: item._id }).catch((err) => {
              Alert.alert(
                "Couldn't delete",
                err instanceof Error ? err.message : "",
              );
            });
          },
        },
      ],
    );
  };

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const totalCount = visibleItemsForTab?.length ?? 0;
  const isLoading = visibleItemsForTab === undefined;

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: "#fbfaf7" }}
    >
      <View className="flex-row items-center justify-between border-b border-border bg-card/95 px-4 pb-3 pt-2">
        <View>
          <Text className="text-3xl font-bold text-foreground">My Pantry</Text>
          <Text className="text-sm text-muted-foreground">
            {isLoading
              ? " "
              : `${totalCount} item${totalCount === 1 ? "" : "s"}`}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowScanner(true)}
            disabled={!householdId}
            className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-card"
            style={{ opacity: householdId ? 1 : 0.4 }}
            accessibilityLabel="Scan pantry item barcode"
          >
            <Ionicons name="scan" size={21} color="#248f58" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSnapGroceries(true)}
            disabled={!householdId}
            className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-card"
            style={{ opacity: householdId ? 1 : 0.4 }}
            accessibilityLabel="Snap groceries"
          >
            <Ionicons name="camera" size={21} color="#248f58" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openAdd}
            disabled={!householdId}
            className="h-11 w-11 items-center justify-center rounded-xl bg-primary"
            style={{
              opacity: householdId ? 1 : 0.4,
              shadowColor: "#248f58",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.22,
              shadowRadius: 14,
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 pt-3">
        <View className="flex-row items-center rounded-xl bg-muted px-3">
          <Ionicons name="search" size={18} color="#6f756f" />
          <TextInput
            className="ml-2 flex-1 py-2.5 text-base text-foreground"
            placeholder="Search pantry…"
            placeholderTextColor="#9a9489"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9a9489" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View className="px-4 pt-3">
        <QuickAddBar disabled={!householdId} onAdd={handleQuickAdd} />
        {quickAddNotice ? (
          <View className="mt-2 rounded-xl border border-green-200 bg-green-50 p-3">
            <Text className="text-sm text-green-700">{quickAddNotice}</Text>
          </View>
        ) : null}
        {quickAddError ? (
          <View className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{quickAddError}</Text>
          </View>
        ) : null}
      </View>

      <View className="px-4 pt-3">
        <View className="flex-row rounded-xl bg-muted p-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 items-center rounded-lg py-2 ${
                  active ? "bg-card" : ""
                }`}
                style={
                  active
                    ? {
                        shadowColor: "#000",
                        shadowOpacity: 0.07,
                        shadowOffset: { width: 0, height: 1 },
                        shadowRadius: 2,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm ${
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
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator />
          </View>
        ) : filteredItems.length === 0 ? (
          <>
            <ExpirationAlerts items={allPantryItems ?? []} />
            <EmptyState
              location={activeTab === "all" ? undefined : activeTab}
              searching={searchQuery.length > 0}
              onAdd={openAdd}
              disabled={!householdId}
            />
          </>
        ) : (
          <>
            <View className="mb-4">
              <ExpirationAlerts items={allPantryItems ?? []} />
            </View>
            {groupedItems.map(([category, items]) => {
              const isCollapsed = collapsed.has(category);
              return (
                <View key={category} className="mb-5">
                  <Pressable
                    onPress={() => toggleCategory(category)}
                    className="mb-2 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {category}
                      </Text>
                      <View className="rounded-full bg-muted px-2 py-0.5">
                        <Text className="text-[10px] font-medium text-muted-foreground">
                          {items.length}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isCollapsed ? "chevron-forward" : "chevron-down"}
                      size={14}
                      color="#9ca3af"
                    />
                  </Pressable>

                  {!isCollapsed &&
                    items.map((item) => (
                      <ItemCard
                        key={item._id}
                        item={item}
                        onEdit={() => openEdit(item)}
                        onDelete={() => confirmDelete(item)}
                        onAdjust={(delta) => void adjustQuantity(item, delta)}
                      />
                    ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        {householdId ? (
          <PantryItemForm
            householdId={householdId}
            item={editingItem}
            prefillValues={prefillValues ?? undefined}
            onClose={closeForm}
          />
        ) : null}
      </Modal>

      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowScanner(false)}
      >
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onScan={handleScannerResult}
        />
      </Modal>

      <Modal
        visible={showSnapGroceries}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSnapGroceries(false)}
      >
        <SnapGroceries
          onClose={() => setShowSnapGroceries(false)}
          onAdd={handleSnapAdd}
        />
      </Modal>
    </SafeAreaView>
  );
}

function ItemCard({
  item,
  onEdit,
  onDelete,
  onAdjust,
}: {
  item: PantryItem;
  onEdit: () => void;
  onDelete: () => void;
  onAdjust: (delta: number) => void;
}) {
  const tint = getStorageTint(item.storageLocation);
  const expirationColor = getExpirationColor(item.expirationDate);
  const expirationLabel = formatExpirationLabel(item.expirationDate);
  const iconName = STORAGE_ICON[item.storageLocation];

  return (
    <View
      className="mb-2 overflow-hidden rounded-2xl border border-border bg-card"
      style={{
        shadowColor: "#171d1a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 14,
      }}
    >
      <View className="flex-row items-center gap-3 p-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: tint.bg }}
        >
          <Ionicons name={iconName} size={18} color={tint.fg} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-base font-semibold text-foreground"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {item.quantity} {item.unit} · {item.category}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onEdit}
          className="h-8 w-8 items-center justify-center"
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Ionicons name="pencil" size={16} color="#6f756f" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between border-t border-border bg-muted/40 px-3 py-2">
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={12} color={expirationColor} />
          <Text style={{ color: expirationColor }} className="text-[11px]">
            {expirationLabel}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="flex-row items-center rounded-full border border-border bg-card">
            <TouchableOpacity
              onPress={() => onAdjust(-1)}
              disabled={item.quantity <= 1}
              className="h-7 w-7 items-center justify-center"
              style={{ opacity: item.quantity <= 1 ? 0.3 : 1 }}
              accessibilityLabel={`Decrease ${item.name}`}
            >
              <Ionicons name="remove" size={14} color="#374151" />
            </TouchableOpacity>
            <Text className="min-w-6 text-center text-xs font-semibold text-foreground tabular-nums">
              {item.quantity}
            </Text>
            <TouchableOpacity
              onPress={() => onAdjust(1)}
              className="h-7 w-7 items-center justify-center"
              accessibilityLabel={`Increase ${item.name}`}
            >
              <Ionicons name="add" size={14} color="#374151" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onDelete}
            className="h-7 w-7 items-center justify-center"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Ionicons name="trash-outline" size={14} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function EmptyState({
  location,
  searching,
  onAdd,
  disabled,
}: {
  location?: StorageLocation;
  searching: boolean;
  onAdd: () => void;
  disabled: boolean;
}) {
  if (searching) {
    return (
      <View className="items-center py-16">
        <Ionicons name="search" size={32} color="#9a9489" />
        <Text className="mt-3 text-base text-muted-foreground">No matches</Text>
      </View>
    );
  }

  return (
    <View className="items-center px-6 py-16">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-amber-50">
        <Ionicons name="cube" size={36} color="#c66a1c" />
      </View>
      <Text className="mb-1 text-xl font-semibold text-foreground">
        {location ? `No items in ${location}` : "Your pantry is empty"}
      </Text>
      <Text className="mb-6 max-w-xs text-center text-sm text-muted-foreground">
        {location
          ? `Add items to track what's in your ${location}.`
          : "Add what you have at home — the AI will use these ingredients first when planning meals."}
      </Text>
      <TouchableOpacity
        onPress={onAdd}
        disabled={disabled}
        className="flex-row items-center gap-2 rounded-xl bg-primary px-5 py-3"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <Ionicons name="add" size={18} color="white" />
        <Text className="text-base font-semibold text-white">Add item</Text>
      </TouchableOpacity>
    </View>
  );
}
