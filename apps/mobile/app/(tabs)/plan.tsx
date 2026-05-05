import { Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";

export default function PlanScreen() {
  return (
    <ScreenShell title="Weekly Plan" subtitle="Your 7-dinner week at a glance.">
      <View className="items-center rounded-2xl border border-border bg-card p-6">
        <Text className="text-sm text-muted-foreground">
          Weekly meal plan — coming in Piece 4.
        </Text>
      </View>
    </ScreenShell>
  );
}
