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
import { Ionicons } from "@expo/vector-icons";

type Mode = "signIn" | "signUp";

function getAuthErrorMessage(err: unknown, mode: Mode) {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (mode === "signUp") {
    if (lower.includes("invalid password")) {
      return "Password must be at least 8 characters.";
    }
    if (lower.includes("already") || lower.includes("server error")) {
      return "An account with this email may already exist. Try signing in instead.";
    }
    return `Could not create account: ${message}`;
  }

  if (lower.includes("invalid") || lower.includes("credentials")) {
    return "We couldn't sign you in with that email and password.";
  }
  if (lower.includes("server error")) {
    return "Could not sign in right now. Please try again.";
  }
  return "Couldn't sign in. Check your email and password.";
}

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
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setError("Email and password required.");
      return;
    }
    if (mode === "signUp" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await signIn("password", {
        email: trimmedEmail,
        password,
        flow: mode,
      });
    } catch (err) {
      setError(getAuthErrorMessage(err, mode));
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: "#fbfaf7" }}
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
          <View className="px-5 py-10">
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                <Ionicons name="restaurant" size={26} color="white" />
              </View>
              <Text className="mb-2 text-center text-4xl font-bold text-foreground">
                FamilyPlate
              </Text>
              <Text className="text-center text-base text-muted-foreground">
                {mode === "signIn"
                  ? "Sign in to your account."
                  : "Create your account — free, no credit card."}
              </Text>
            </View>

            <View
              className="rounded-2xl border border-border bg-card p-4"
              style={{
                shadowColor: "#171d1a",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.06,
                shadowRadius: 24,
              }}
            >
              <View className="mb-4">
                <View className="mb-2 flex-row rounded-xl bg-muted p-1">
                  {(["signIn", "signUp"] as const).map((option) => {
                    const active = mode === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          setMode(option);
                          setError("");
                        }}
                        disabled={isSubmitting}
                        className={`flex-1 rounded-lg py-2 ${
                          active ? "bg-card" : ""
                        }`}
                      >
                        <Text
                          className={`text-center text-sm font-semibold ${
                            active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {option === "signIn" ? "Sign in" : "Sign up"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mb-4 gap-4">
                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Email
                  </Text>
                  <TextInput
                    className="rounded-xl border border-border bg-muted px-4 py-3 text-base text-foreground"
                    placeholder="you@example.com"
                    placeholderTextColor="#9a9489"
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
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Password
                  </Text>
                  <TextInput
                    className="rounded-xl border border-border bg-muted px-4 py-3 text-base text-foreground"
                    placeholder="••••••••"
                    placeholderTextColor="#9a9489"
                    secureTextEntry
                    textContentType={
                      mode === "signIn" ? "password" : "newPassword"
                    }
                    value={password}
                    onChangeText={setPassword}
                    editable={!isSubmitting}
                  />
                  {mode === "signUp" ? (
                    <Text className="mt-2 text-xs text-muted-foreground">
                      Use at least 8 characters.
                    </Text>
                  ) : null}
                </View>
              </View>

              {error ? (
                <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <Text className="text-sm text-red-700">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => void handleSubmit()}
                disabled={isSubmitting}
                className="mb-3 items-center rounded-xl bg-primary py-3.5"
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
                <Text className="text-sm text-muted-foreground">
                  {mode === "signIn"
                    ? "Don't have an account? Sign up"
                    : "Have an account? Sign in"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
