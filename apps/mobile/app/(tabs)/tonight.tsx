import { Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";

export default function TonightScreen() {
  return (
    <ScreenShell title="Tonight" subtitle="Instant dinner ideas from your pantry.">
      <View className="rounded-2xl border border-gray-200 bg-gray-50 p-6 items-center">
        <Text className="text-sm text-gray-500">Dinner generator — coming in Piece 3.</Text>
      </View>
    </ScreenShell>
  );
}
