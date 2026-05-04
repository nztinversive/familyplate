import { Text, TouchableOpacity, View } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import { ScreenShell } from "@/components/ScreenShell";

export default function SettingsScreen() {
  const { signOut } = useAuthActions();
  const profile = useQuery(api.queries.profiles.getCurrentUser, {});

  return (
    <ScreenShell title="Settings" subtitle={profile?.email ?? "Signed in"}>
      <View className="rounded-2xl border border-gray-200 bg-gray-50 p-6 items-center mb-4">
        <Text className="text-sm text-gray-500">Full settings — coming in Piece 7.</Text>
      </View>

      <TouchableOpacity
        onPress={() => void signOut()}
        className="rounded-xl bg-gray-900 py-3 items-center"
      >
        <Text className="text-white font-semibold">Sign out</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}
