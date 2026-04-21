import { ReactNode } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function ScreenShell({ title, subtitle, children }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-white">
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
