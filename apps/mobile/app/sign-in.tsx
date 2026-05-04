import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Redirect } from "expo-router";

type Mode = "signIn" | "signUp";

export default function SignInScreen() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await signIn("password", {
        email: email.trim(),
        password,
        flow: mode,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't sign in. Check your email and password.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <View className="px-6 py-10">
            <View className="mb-8">
              <Text className="text-4xl font-bold mb-2">FamilyPlate</Text>
              <Text className="text-base text-gray-500">
                {mode === "signIn"
                  ? "Sign in to your account."
                  : "Create your account — free, no credit card."}
              </Text>
            </View>

            <View className="gap-4 mb-4">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">
                  Email
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  editable={!isSubmitting}
                />
              </View>

              <View>
                <Text className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">
                  Password
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base"
                  placeholder="••••••••"
                  secureTextEntry
                  textContentType={
                    mode === "signIn" ? "password" : "newPassword"
                  }
                  value={password}
                  onChangeText={setPassword}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {error ? (
              <Text className="text-sm text-red-600 mb-4">{error}</Text>
            ) : null}

            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
              className="rounded-xl bg-primary py-3.5 items-center mb-3"
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {mode === "signIn" ? "Sign in" : "Create account"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode(mode === "signIn" ? "signUp" : "signIn");
                setError("");
              }}
              disabled={isSubmitting}
              className="items-center py-2"
            >
              <Text className="text-sm text-gray-600">
                {mode === "signIn"
                  ? "Don't have an account? Sign up"
                  : "Have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
