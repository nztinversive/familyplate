import "../global.css";
import "@/lib/sentry";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-reanimated";
import { MonitoringProvider } from "@/components/providers/MonitoringProvider";
import { Sentry } from "@/lib/sentry";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL for the mobile app.");
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayout() {
  return (
    <ConvexAuthProvider client={convex} storage={AsyncStorage}>
      <MonitoringProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="join/[inviteCode]" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="setup/household" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </MonitoringProvider>
    </ConvexAuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
