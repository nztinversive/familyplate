import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function ScreenShell({ title, subtitle, children }: Props) {
  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <ScrollView>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold mb-2">{title}</Text>
          {subtitle ? (
            <Text className="text-base text-gray-500 mb-6">{subtitle}</Text>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
