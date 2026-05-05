import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { inferCategory, type PantryCategory } from "@/lib/pantry";

export type QuickAddItem = {
  name: string;
  quantity: number;
  unit: string;
  category: PantryCategory;
};

const UNIT_PATTERNS: { pattern: RegExp; unit: string }[] = [
  { pattern: /\b(lb|lbs|pound|pounds)\b/i, unit: "lb" },
  { pattern: /\b(oz|ounce|ounces)\b/i, unit: "oz" },
  { pattern: /\b(kg|kilogram|kilograms)\b/i, unit: "kg" },
  { pattern: /\b(g|gram|grams)\b/i, unit: "g" },
  { pattern: /\b(cup|cups)\b/i, unit: "cups" },
  { pattern: /\b(tbsp|tablespoon|tablespoons)\b/i, unit: "tbsp" },
  { pattern: /\b(tsp|teaspoon|teaspoons)\b/i, unit: "tsp" },
  { pattern: /\b(ml|milliliter|milliliters)\b/i, unit: "ml" },
  { pattern: /\b(l|liter|liters)\b/i, unit: "L" },
  { pattern: /\b(gallon|gallons|gal)\b/i, unit: "gal" },
  { pattern: /\b(fl oz|fluid ounce|fluid ounces)\b/i, unit: "fl oz" },
  { pattern: /\b(dozen)\b/i, unit: "dozen" },
  { pattern: /\b(can|cans)\b/i, unit: "can" },
  { pattern: /\b(bag|bags)\b/i, unit: "bag" },
  { pattern: /\b(box|boxes)\b/i, unit: "box" },
  { pattern: /\b(bunch|bunches)\b/i, unit: "bunch" },
  { pattern: /\b(pack|packs|package|packages)\b/i, unit: "pack" },
  { pattern: /\b(bottle|bottles)\b/i, unit: "bottle" },
  { pattern: /\b(jar|jars)\b/i, unit: "jar" },
  { pattern: /\b(slice|slices)\b/i, unit: "slices" },
];

function parseQuantity(raw: string) {
  if (raw.includes("/")) {
    const [numerator, denominator] = raw.split("/");
    const parsedNumerator = Number.parseFloat(numerator);
    const parsedDenominator = Number.parseFloat(denominator);
    if (parsedDenominator > 0) return parsedNumerator / parsedDenominator;
    return 1;
  }

  return Number.parseFloat(raw);
}

export function parseQuickAddInput(input: string): QuickAddItem[] {
  return input
    .split(/[,\n]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((part) => {
      let quantity = 1;
      let unit = "items";
      let name = part;

      const quantityMatch = part.match(/^(\d+\.?\d*|\d+\/\d+)\s*/);
      if (quantityMatch) {
        quantity = parseQuantity(quantityMatch[1]);
        name = part.slice(quantityMatch[0].length);
      }

      for (const { pattern, unit: nextUnit } of UNIT_PATTERNS) {
        if (pattern.test(name)) {
          unit = nextUnit;
          name = name.replace(pattern, "").trim();
          break;
        }
      }

      name = name
        .replace(/^\s*of\s+/i, "")
        .replace(/\s+/g, " ")
        .trim();
      if (name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }

      return {
        name,
        quantity: Number.isFinite(quantity) ? Math.max(0.1, quantity) : 1,
        unit,
        category: inferCategory(name),
      };
    })
    .filter((item) => item.name.length > 0);
}

export function QuickAddBar({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (items: QuickAddItem[]) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async () => {
    const items = parseQuickAddInput(input);
    if (items.length === 0) return;

    setIsAdding(true);
    try {
      await onAdd(items);
      setInput("");
    } catch {
      // The parent owns the visible error state.
    } finally {
      setIsAdding(false);
    }
  };

  const canSubmit = input.trim().length > 0 && !disabled && !isAdding;

  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center rounded-xl bg-muted px-3">
          <Ionicons name="flash-outline" size={17} color="#6f756f" />
          <TextInput
            className="ml-2 flex-1 py-2.5 text-base text-foreground"
            placeholder='Quick add: "2 lbs chicken, milk, 3 onions"'
            placeholderTextColor="#9a9489"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => {
              if (canSubmit) void handleSubmit();
            }}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled && !isAdding}
          />
        </View>
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          className="h-11 w-11 items-center justify-center rounded-xl bg-primary"
          style={{ opacity: canSubmit ? 1 : 0.45 }}
          accessibilityLabel="Quick add pantry items"
        >
          {isAdding ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="add" size={22} color="white" />
          )}
        </TouchableOpacity>
      </View>
      <Text className="mt-2 text-xs text-muted-foreground">
        Add several items at once with commas or new lines.
      </Text>
    </View>
  );
}
