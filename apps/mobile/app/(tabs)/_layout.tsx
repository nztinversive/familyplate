import { useEffect, useRef } from "react";
import { Tabs, Redirect } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { View, ActivityIndicator } from "react-native";
import { api } from "@familyplate/convex/_generated/api";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.queries.profiles.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const createHousehold = useMutation(api.mutations.households.createHousehold);
  const isBootstrappingHousehold = useRef(false);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !currentUser?.needsOnboarding ||
      isBootstrappingHousehold.current
    ) {
      return;
    }

    isBootstrappingHousehold.current = true;
    void createHousehold({ name: "My Household" }).catch(() => {
      isBootstrappingHousehold.current = false;
    });
  }, [createHousehold, currentUser?.needsOnboarding, isAuthenticated]);

  if (isLoading || (isAuthenticated && currentUser === undefined)) {
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

  if (currentUser?.needsOnboarding) {
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
