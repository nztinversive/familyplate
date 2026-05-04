import { Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";

export default function CookbookScreen() {
  return (
    <ScreenShell
      title="Cookbook"
      subtitle="Recipes you've saved from generated plans."
    >
      <View className="rounded-2xl border border-gray-200 bg-gray-50 p-6 items-center">
        <Text className="text-sm text-gray-500">Saved recipes — coming in Piece 6.</Text>
      </View>
    </ScreenShell>
  );
}
