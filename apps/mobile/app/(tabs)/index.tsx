import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
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
import {
  formatExpirationLabel,
  getExpirationColor,
  getStorageTint,
  type StorageLocation,
} from "@/lib/pantry";
import { PantryItemForm } from "@/components/pantry/PantryItemForm";

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
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const householdId = currentUser?.householdId ?? null;

  const pantryItems = useQuery(
    api.queries.pantry.getMyPantryItems,
    activeTab === "all" ? {} : { storageLocation: activeTab }
  );

  const updateItem = useMutation(api.mutations.pantry.updateItem);
  const deleteItem = useMutation(api.mutations.pantry.deleteItem);

  const filteredItems = useMemo(() => {
    return (pantryItems ?? [])
      .filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (a.expirationDate && b.expirationDate)
          return a.expirationDate - b.expirationDate;
        if (a.expirationDate) return -1;
        if (b.expirationDate) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [pantryItems, searchQuery]);

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
    setShowForm(true);
  };

  const openEdit = (item: PantryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const adjustQuantity = async (item: PantryItem, delta: number) => {
    const next = Math.round((item.quantity + delta) * 100) / 100;
    if (next <= 0) return;
    try {
      await updateItem({ itemId: item._id, quantity: next });
    } catch (err) {
      Alert.alert("Couldn't update quantity", err instanceof Error ? err.message : "");
    }
  };

  const confirmDelete = (item: PantryItem) => {
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
              Alert.alert("Couldn't delete", err instanceof Error ? err.message : "");
            });
          },
        },
      ]
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

  const totalCount = pantryItems?.length ?? 0;
  const isLoading = pantryItems === undefined;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 pb-3 pt-2">
        <View>
          <Text className="text-3xl font-bold">Pantry</Text>
          <Text className="text-sm text-gray-500">
            {isLoading
              ? " "
              : `${totalCount} item${totalCount === 1 ? "" : "s"}`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openAdd}
          disabled={!householdId}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
          style={{ opacity: householdId ? 1 : 0.4 }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-3">
        <View className="flex-row items-center rounded-xl bg-gray-100 px-3">
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            className="ml-2 flex-1 py-2.5 text-base"
            placeholder="Search pantry…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View className="px-4 pt-3">
        <View className="flex-row rounded-xl bg-gray-100 p-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 items-center rounded-lg py-2 ${
                  active ? "bg-white" : ""
                }`}
                style={
                  active
                    ? {
                        shadowColor: "#000",
                        shadowOpacity: 0.06,
                        shadowOffset: { width: 0, height: 1 },
                        shadowRadius: 2,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm ${
                    active ? "font-semibold text-gray-900" : "text-gray-600"
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
          <EmptyState
            location={activeTab === "all" ? undefined : activeTab}
            searching={searchQuery.length > 0}
            onAdd={openAdd}
            disabled={!householdId}
          />
        ) : (
          groupedItems.map(([category, items]) => {
            const isCollapsed = collapsed.has(category);
            return (
              <View key={category} className="mb-5">
                <Pressable
                  onPress={() => toggleCategory(category)}
                  className="mb-2 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                      {category}
                    </Text>
                    <View className="rounded-full bg-gray-100 px-2 py-0.5">
                      <Text className="text-[10px] font-medium text-gray-600">
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
          })
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
            onClose={closeForm}
          />
        ) : null}
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
    <View className="mb-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <View className="flex-row items-center gap-3 p-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: tint.bg }}
        >
          <Ionicons name={iconName} size={18} color={tint.fg} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {item.quantity} {item.unit} · {item.category}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onEdit}
          className="h-8 w-8 items-center justify-center"
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Ionicons name="pencil" size={16} color="#4b5563" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-2">
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={12} color={expirationColor} />
          <Text style={{ color: expirationColor }} className="text-[11px]">
            {expirationLabel}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="flex-row items-center rounded-full border border-gray-200 bg-white">
            <TouchableOpacity
              onPress={() => onAdjust(-1)}
              disabled={item.quantity <= 1}
              className="h-7 w-7 items-center justify-center"
              style={{ opacity: item.quantity <= 1 ? 0.3 : 1 }}
              accessibilityLabel={`Decrease ${item.name}`}
            >
              <Ionicons name="remove" size={14} color="#374151" />
            </TouchableOpacity>
            <Text className="min-w-6 text-center text-xs font-semibold tabular-nums">
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
        <Ionicons name="search" size={32} color="#9ca3af" />
        <Text className="mt-3 text-base text-gray-500">No matches</Text>
      </View>
    );
  }

  return (
    <View className="items-center px-6 py-16">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-amber-50">
        <Ionicons name="cube" size={36} color="#b45309" />
      </View>
      <Text className="mb-1 text-xl font-semibold">
        {location ? `No items in ${location}` : "Your pantry is empty"}
      </Text>
      <Text className="mb-6 max-w-xs text-center text-sm text-gray-500">
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
