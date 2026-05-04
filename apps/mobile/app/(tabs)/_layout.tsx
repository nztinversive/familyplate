import { Tabs, Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";
import { View, ActivityIndicator } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tonight"
        options={{
          title: "Tonight",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="paperplane.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cookbook"
        options={{
          title: "Cookbook",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="paperplane.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
