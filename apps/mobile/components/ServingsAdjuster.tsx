import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatServingsLabel } from "@/lib/recipeScaling";

export function ServingsAdjuster({
  title,
  subtitle,
  originalServings,
  targetServings,
  disabled,
  onChangeServings,
}: {
  title: string;
  subtitle: string;
  originalServings: number;
  targetServings: number;
  disabled?: boolean;
  onChangeServings: (servings: number) => void;
}) {
  const scaleLabel =
    targetServings === originalServings
      ? "Original recipe"
      : `Scaled for ${formatServingsLabel(targetServings)}`;

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-3">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">{title}</Text>
          <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {subtitle}
          </Text>
          <Text className="mt-2 text-xs font-semibold text-primary">
            {scaleLabel}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full border border-border bg-muted">
          <TouchableOpacity
            onPress={() => onChangeServings(Math.max(1, targetServings - 1))}
            disabled={disabled || targetServings <= 1}
            className="h-9 w-9 items-center justify-center"
            style={{ opacity: disabled || targetServings <= 1 ? 0.4 : 1 }}
            accessibilityLabel="Decrease servings"
          >
            <Ionicons name="remove" size={15} color="#374151" />
          </TouchableOpacity>
          <Text className="min-w-8 text-center text-sm font-bold text-foreground tabular-nums">
            {targetServings}
          </Text>
          <TouchableOpacity
            onPress={() => onChangeServings(Math.min(16, targetServings + 1))}
            disabled={disabled || targetServings >= 16}
            className="h-9 w-9 items-center justify-center"
            style={{ opacity: disabled || targetServings >= 16 ? 0.4 : 1 }}
            accessibilityLabel="Increase servings"
          >
            <Ionicons name="add" size={15} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
