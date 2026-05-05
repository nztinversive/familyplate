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
      <View className="mb-4 items-center rounded-2xl border border-border bg-card p-6">
        <Text className="text-sm text-muted-foreground">
          Full settings — coming in Piece 7.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => void signOut()}
        className="items-center rounded-xl bg-foreground py-3"
      >
        <Text className="font-semibold text-white">Sign out</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}
