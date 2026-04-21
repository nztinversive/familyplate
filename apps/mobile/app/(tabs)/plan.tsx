import { Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";

export default function PlanScreen() {
  return (
    <ScreenShell title="Weekly Plan" subtitle="Your 7-dinner week at a glance.">
      <View className="rounded-2xl border border-gray-200 bg-gray-50 p-6 items-center">
        <Text className="text-sm text-gray-500">Weekly meal plan — coming in Piece 4.</Text>
      </View>
    </ScreenShell>
  );
}
