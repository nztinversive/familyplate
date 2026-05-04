import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc, Id } from "@familyplate/convex/_generated/dataModel";
import {
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  STORAGE_LOCATIONS,
  type PantryCategory,
  type StorageLocation,
  inferCategory,
} from "@/lib/pantry";

type PantryItem = Doc<"pantryItems">;

type Props = {
  householdId: Id<"households">;
  item: PantryItem | null;
  onClose: () => void;
};

const STORAGE_LABELS: Record<StorageLocation, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  pantry: { icon: "cube", label: "Pantry" },
  fridge: { icon: "thermometer", label: "Fridge" },
  freezer: { icon: "snow", label: "Freezer" },
};

function formatDateInput(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateInput(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, y, m, d] = match;
  const ts = new Date(`${y}-${m}-${d}T12:00:00`).getTime();
  return Number.isFinite(ts) ? ts : undefined;
}

export function PantryItemForm({ householdId, item, onClose }: Props) {
  const addItem = useMutation(api.mutations.pantry.addItem);
  const updateItem = useMutation(api.mutations.pantry.updateItem);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<string>("items");
  const [category, setCategory] = useState<PantryCategory>("Other");
  const [storageLocation, setStorageLocation] = useState<StorageLocation>("pantry");
  const [expirationDate, setExpirationDate] = useState("");
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(`${item.quantity}`);
      setUnit(item.unit);
      setCategory(item.category as PantryCategory);
      setStorageLocation(item.storageLocation);
      setExpirationDate(formatDateInput(item.expirationDate));
      return;
    }
    setName("");
    setQuantity("1");
    setUnit("items");
    setCategory("Other");
    setStorageLocation("pantry");
    setExpirationDate("");
    setError("");
  }, [item]);

  const handleNameBlur = () => {
    if (!item && name.trim() && category === "Other") {
      const inferred = inferCategory(name);
      if (inferred !== "Other") setCategory(inferred);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const parsedQuantity = Number.parseFloat(quantity);

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    const expirationTs = parseDateInput(expirationDate);
    if (expirationDate.trim() && expirationTs === undefined) {
      setError("Expiration date must be in YYYY-MM-DD format.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (item) {
        await updateItem({
          itemId: item._id,
          name: trimmedName,
          quantity: parsedQuantity,
          unit: unit.trim() || "items",
          category,
          storageLocation,
          ...(expirationTs !== undefined
            ? { expirationDate: expirationTs }
            : item.expirationDate
              ? { clearExpirationDate: true }
              : {}),
        });
      } else {
        await addItem({
          householdId,
          name: trimmedName,
          quantity: parsedQuantity,
          unit: unit.trim() || "items",
          category,
          storageLocation,
          ...(expirationTs !== undefined ? { expirationDate: expirationTs } : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save item.");
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
        <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
          <Text className="text-base text-gray-600">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold">
          {item ? "Edit Item" : "Add Item"}
        </Text>
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-base font-semibold text-primary">
              {item ? "Save" : "Add"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        {error ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Name */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Name
          </Text>
          <TextInput
            className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base"
            placeholder="e.g. Chicken breast"
            value={name}
            onChangeText={setName}
            onBlur={handleNameBlur}
            autoCapitalize="words"
            editable={!isSubmitting}
          />
        </View>

        {/* Quantity + Unit */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Quantity
            </Text>
            <TextInput
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
              editable={!isSubmitting}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Unit
            </Text>
            <Pressable
              onPress={() => setShowUnitPicker((v) => !v)}
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 flex-row items-center justify-between"
            >
              <Text className="text-base">{unit}</Text>
              <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        {showUnitPicker ? (
          <View className="mb-4 rounded-xl border border-gray-200 bg-white">
            <ScrollView style={{ maxHeight: 220 }}>
              {PANTRY_UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => {
                    setUnit(u);
                    setShowUnitPicker(false);
                  }}
                  className={`px-4 py-3 border-b border-gray-100 ${
                    unit === u ? "bg-gray-50" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      unit === u ? "font-semibold text-primary" : ""
                    }`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Expiration */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Expiration (optional)
          </Text>
          <TextInput
            className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base"
            placeholder="YYYY-MM-DD"
            value={expirationDate}
            onChangeText={setExpirationDate}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            autoCapitalize="none"
            editable={!isSubmitting}
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PANTRY_CATEGORIES.map((option) => {
              const selected = category === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setCategory(option)}
                  className={`rounded-full border px-3 py-1.5 ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      selected ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Storage Location */}
        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Storage Location
          </Text>
          <View className="flex-row gap-2">
            {STORAGE_LOCATIONS.map((option) => {
              const selected = storageLocation === option;
              const meta = STORAGE_LABELS[option];
              return (
                <Pressable
                  key={option}
                  onPress={() => setStorageLocation(option)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-3 ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Ionicons
                    name={meta.icon}
                    size={16}
                    color={selected ? "white" : "#374151"}
                  />
                  <Text
                    className={`text-sm font-medium ${
                      selected ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
