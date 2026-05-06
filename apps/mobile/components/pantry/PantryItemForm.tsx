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
import type { BarcodeScannerResult } from "@/components/pantry/BarcodeScanner";

type PantryItem = Doc<"pantryItems">;

type Props = {
  householdId: Id<"households">;
  item: PantryItem | null;
  prefillValues?: BarcodeScannerResult;
  onClose: () => void;
};

const STORAGE_LABELS: Record<
  StorageLocation,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
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

export function PantryItemForm({
  householdId,
  item,
  prefillValues,
  onClose,
}: Props) {
  const addItem = useMutation(api.mutations.pantry.addItem);
  const updateItem = useMutation(api.mutations.pantry.updateItem);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<string>("items");
  const [category, setCategory] = useState<PantryCategory>("Other");
  const [storageLocation, setStorageLocation] =
    useState<StorageLocation>("pantry");
  const [expirationDate, setExpirationDate] = useState("");
  const [barcode, setBarcode] = useState("");
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
      setBarcode(item.barcode ?? "");
      setError("");
      return;
    }
    setName(prefillValues?.name ?? "");
    setQuantity(prefillValues?.quantity ?? "1");
    setUnit(prefillValues?.unit ?? "items");
    setCategory(
      prefillValues?.category &&
        PANTRY_CATEGORIES.includes(prefillValues.category)
        ? prefillValues.category
        : "Other",
    );
    setStorageLocation("pantry");
    setExpirationDate("");
    setBarcode(prefillValues?.barcode ?? "");
    setError("");
  }, [item, prefillValues]);

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
      const trimmedBarcode = barcode.trim();

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
          ...(trimmedBarcode
            ? { barcode: trimmedBarcode }
            : item.barcode
              ? { clearBarcode: true }
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
          ...(expirationTs !== undefined
            ? { expirationDate: expirationTs }
            : {}),
          ...(trimmedBarcode ? { barcode: trimmedBarcode } : {}),
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
      className="flex-1 bg-background"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-3">
        <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
          <Text className="text-base text-muted-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-foreground">
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
        {prefillValues?.message && !item ? (
          <View
            className={`mb-4 rounded-xl border p-3 ${
              prefillValues.found
                ? "border-primary/20 bg-primary/10"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons
                name={prefillValues.found ? "checkmark-circle" : "create-outline"}
                size={16}
                color={prefillValues.found ? "#248f58" : "#b45309"}
              />
              <Text
                className={`text-sm font-semibold ${
                  prefillValues.found ? "text-primary" : "text-amber-800"
                }`}
              >
                {prefillValues.found ? "Product found" : "Finish manually"}
              </Text>
            </View>
            <Text
              className={`text-sm ${
                prefillValues.found
                  ? "text-muted-foreground"
                  : "text-amber-800"
              }`}
            >
              {prefillValues.message}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Name */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Name
          </Text>
          <TextInput
            className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
            placeholder="e.g. Chicken breast"
            placeholderTextColor="#9a9489"
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
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quantity
            </Text>
            <TextInput
              className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
              editable={!isSubmitting}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Unit
            </Text>
            <Pressable
              onPress={() => setShowUnitPicker((v) => !v)}
              className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <Text className="text-base text-foreground">{unit}</Text>
              <Ionicons name="chevron-down" size={16} color="#6f756f" />
            </Pressable>
          </View>
        </View>

        {showUnitPicker ? (
          <View className="mb-4 rounded-xl border border-border bg-card">
            <ScrollView style={{ maxHeight: 220 }}>
              {PANTRY_UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => {
                    setUnit(u);
                    setShowUnitPicker(false);
                  }}
                  className={`border-b border-border px-4 py-3 ${
                    unit === u ? "bg-muted" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      unit === u
                        ? "font-semibold text-primary"
                        : "text-foreground"
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
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Expiration (optional)
          </Text>
          <TextInput
            className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9a9489"
            value={expirationDate}
            onChangeText={setExpirationDate}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            autoCapitalize="none"
            editable={!isSubmitting}
          />
        </View>

        {/* Barcode */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Barcode (optional)
          </Text>
          <TextInput
            className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
            placeholder="UPC or EAN"
            placeholderTextColor="#9a9489"
            value={barcode}
            onChangeText={setBarcode}
            keyboardType="number-pad"
            autoCorrect={false}
            autoCapitalize="none"
            editable={!isSubmitting}
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
                      : "border-border bg-card"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      selected ? "text-white" : "text-foreground"
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
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
                      : "border-border bg-card"
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
