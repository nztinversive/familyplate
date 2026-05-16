import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type LoadingScreenProps = {
  message?: string;
  detail?: string;
};

export function LoadingScreen({
  message = "Setting the table...",
  detail = "Getting FamilyPlate ready",
}: LoadingScreenProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 280],
  });

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: "#fbfaf7" }}
    >
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="mb-7 h-28 w-28 items-center justify-center rounded-[32px] border border-border bg-card"
          style={{
            shadowColor: "#171d1a",
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.1,
            shadowRadius: 30,
          }}
        >
          <Image
            source={require("@/assets/images/icon.png")}
            className="h-24 w-24 rounded-[28px]"
            resizeMode="contain"
          />
        </View>

        <Text className="mb-2 text-center text-4xl font-bold text-foreground">
          FamilyPlate
        </Text>
        <Text className="mb-8 text-center text-base text-muted-foreground">
          {message}
        </Text>

        <View
          className="w-full rounded-2xl border border-border bg-card p-4"
          style={{ maxWidth: 280 }}
        >
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Ionicons name="restaurant" size={20} color="#248f58" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {detail}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                This usually takes a moment.
              </Text>
            </View>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-muted">
            <Animated.View
              className="h-2 w-20 rounded-full bg-primary"
              style={{ transform: [{ translateX }] }}
            />
          </View>
        </View>

        <ActivityIndicator className="mt-7" color="#248f58" />
      </View>
    </SafeAreaView>
  );
}
