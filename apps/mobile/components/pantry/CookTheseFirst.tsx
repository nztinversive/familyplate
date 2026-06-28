import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import { getUseFirstItems, getUseFirstLabel } from "@/lib/pantry";

type PantryItem = Doc<"pantryItems">;

export function CookTheseFirst({
  items,
  disabled = false,
  onCook,
}: {
  items: PantryItem[];
  disabled?: boolean;
  onCook: (ingredient: string) => void;
}) {
  const useFirstItems = getUseFirstItems(items);

  if (useFirstItems.length === 0) return null;

  return (
    <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <View className="mb-3 flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
          <Ionicons name="time-outline" size={20} color="#b45309" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            Cook these first
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Jump straight from Pantry into Tonight ideas that use leftovers and
            soon-expiring items first.
          </Text>
        </View>
      </View>

      <View className="gap-2">
        {useFirstItems.map((item) => (
          <TouchableOpacity
            key={item._id}
            onPress={() => onCook(item.name)}
            disabled={disabled}
            className="flex-row items-center justify-between gap-3 rounded-xl bg-white px-3 py-3"
            style={{ opacity: disabled ? 0.5 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={`Suggest dinners using ${item.name}`}
          >
            <View className="min-w-0 flex-1">
              <Text className="font-semibold text-foreground" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {getUseFirstLabel(item)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-semibold text-primary">Ideas</Text>
              <Ionicons name="sparkles" size={17} color="#248f58" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
