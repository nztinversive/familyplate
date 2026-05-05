import { useEffect, useRef } from "react";
import { Tabs, Redirect } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { View, ActivityIndicator } from "react-native";
import { api } from "@familyplate/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
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
        className="flex-1 items-center justify-center bg-background"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.light.background,
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
        className="flex-1 items-center justify-center bg-background"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.light.background,
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
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
        tabBarStyle: {
          backgroundColor: "#fffffff2",
          borderTopColor: "#e7e0d6",
          height: 86,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tonight"
        options={{
          title: "Tonight",
          tabBarIcon: ({ color }) => (
            <Ionicons name="sparkles" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cookbook"
        options={{
          title: "Cookbook",
          tabBarIcon: ({ color }) => (
            <Ionicons name="book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: "Grocery",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
