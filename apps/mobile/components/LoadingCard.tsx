import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type LoadingCardProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
};

export function LoadingCard({
  icon = "restaurant-outline",
  title,
  detail,
}: LoadingCardProps) {
  return (
    <View className="items-center rounded-2xl border border-border bg-card p-6">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Ionicons name={icon} size={24} color="#248f58" />
      </View>
      <ActivityIndicator color="#248f58" />
      <Text className="mt-4 text-center text-base font-semibold text-foreground">
        {title}
      </Text>
      <Text className="mt-1 text-center text-sm leading-5 text-muted-foreground">
        {detail}
      </Text>
    </View>
  );
}
