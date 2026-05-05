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
      className="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: "#fbfaf7" }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 py-6">
          <Text className="mb-2 text-3xl font-bold text-foreground">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mb-6 text-base text-muted-foreground">
              {subtitle}
            </Text>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
