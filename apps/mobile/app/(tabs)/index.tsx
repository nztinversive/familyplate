import { Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";

export default function PantryScreen() {
  return (
    <ScreenShell title="Pantry" subtitle="What's in your kitchen right now.">
      <View className="rounded-2xl border border-gray-200 bg-gray-50 p-6 items-center">
        <Text className="text-sm text-gray-500">Pantry list — coming in Piece 2.</Text>
      </View>
    </ScreenShell>
  );
}
