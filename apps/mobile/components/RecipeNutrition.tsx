import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};

function formatAmount(value: number, suffix = "g") {
  if (!Number.isFinite(value)) return "";
  return `${Math.round(value)}${suffix}`;
}

export function RecipeNutrition({
  nutrition,
  compact = false,
}: {
  nutrition?: Nutrition;
  compact?: boolean;
}) {
  if (!nutrition) return null;

  const items = [
    { label: "Calories", value: formatAmount(nutrition.calories, "") },
    { label: "Protein", value: formatAmount(nutrition.protein) },
    { label: "Carbs", value: formatAmount(nutrition.carbs) },
    { label: "Fat", value: formatAmount(nutrition.fat) },
    ...(nutrition.fiber !== undefined
      ? [{ label: "Fiber", value: formatAmount(nutrition.fiber) }]
      : []),
  ].filter((item) => item.value);

  if (items.length === 0) return null;

  return (
    <View
      className={`rounded-2xl border border-border bg-card ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name="stats-chart-outline" size={16} color="#248f58" />
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Estimated per serving
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <View key={item.label} className="min-w-[30%] flex-1 rounded-xl bg-muted p-2">
            <Text className="text-base font-bold text-foreground">
              {item.value}
            </Text>
            <Text className="text-[11px] font-semibold text-muted-foreground">
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
