import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@familyplate/convex/_generated/api";
import { LoadingScreen } from "@/components/LoadingScreen";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

function parseCommaSeparatedList(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Unable to finish setup. Please try again.";
}

export default function HouseholdSetupScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.queries.profiles.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const createHousehold = useMutation(api.mutations.households.createHousehold);
  const addFamilyMember = useMutation(api.mutations.profiles.addFamilyMember);

  const defaultName =
    currentUser?.userName && currentUser.userName !== "User"
      ? `${currentUser.userName}'s Household`
      : "My Household";
  const [householdName, setHouseholdName] = useState(defaultName);
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [goals, setGoals] = useState("");
  const [kidName, setKidName] = useState("");
  const [kidAllergies, setKidAllergies] = useState("");
  const [kidDislikes, setKidDislikes] = useState("");
  const [kidDietaryPreferences, setKidDietaryPreferences] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser?.userName || currentUser.userName === "User") return;
    setHouseholdName((current) =>
      current === "My Household" ? `${currentUser.userName}'s Household` : current,
    );
  }, [currentUser?.userName]);

  if (isLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <LoadingScreen
        message="Setting the table..."
        detail="Checking your account"
      />
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  if (currentUser && !currentUser.needsOnboarding) {
    return <Redirect href="/plan" />;
  }

  const handleFinishSetup = async () => {
    const name = householdName.trim();
    if (!name) {
      setError("Add a household name before continuing.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await createHousehold({
        name,
        dietaryPreferences: parseCommaSeparatedList(dietaryPreferences),
        allergies: parseCommaSeparatedList(allergies),
        dislikes: parseCommaSeparatedList(dislikes),
        goals,
      });

      const childName = kidName.trim();
      if (childName) {
        await addFamilyMember({
          householdId: result.householdId,
          name: childName,
          isChild: true,
          dietaryPreferences: parseCommaSeparatedList(kidDietaryPreferences),
          allergies: parseCommaSeparatedList(kidAllergies),
          dislikes: parseCommaSeparatedList(kidDislikes),
        });
      }

      track(posthog, "onboarding_completed", {
        has_adult_preferences:
          !!dietaryPreferences.trim() ||
          !!allergies.trim() ||
          !!dislikes.trim() ||
          !!goals.trim(),
        added_child_profile: !!childName,
        next_step: "pantry",
      });
      router.replace("/");
    } catch (err) {
      track(posthog, "onboarding_failed", {
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "onboarding", action: "create_household", platform: "ios" },
      });
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ backgroundColor: "#fbfaf7" }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 18, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons name="restaurant-outline" size={28} color="#248f58" />
          </View>
          <Text className="text-3xl font-bold leading-9 text-foreground">
            Set up your family table
          </Text>
          <Text className="mt-2 text-base leading-6 text-muted-foreground">
            A few details help FamilyPlate plan around the people actually
            eating dinner. Next, add a few staples so Tonight and Weekly Plan
            can start from what you already have.
          </Text>
        </View>

        {error ? (
          <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
            <Ionicons name="alert-circle" size={18} color="#c2410c" />
            <Text className="flex-1 text-sm leading-5 text-destructive">
              {error}
            </Text>
          </View>
        ) : null}

        <SetupCard
          icon="home-outline"
          title="Household"
          subtitle="This name appears on shared settings and review notes."
        >
          <SetupInput
            label="Household name"
            value={householdName}
            placeholder="The Johnson Family"
            onChangeText={setHouseholdName}
            editable={!isSubmitting}
          />
        </SetupCard>

        <SetupCard
          icon="person-outline"
          title="Your dinner profile"
          subtitle="These apply when a plan is for you or the whole family."
        >
          <SetupInput
            label="Diet style"
            value={dietaryPreferences}
            placeholder="high protein, vegetarian, quick dinners"
            onChangeText={setDietaryPreferences}
            editable={!isSubmitting}
          />
          <SetupInput
            label="Allergies"
            value={allergies}
            placeholder="peanuts, shellfish"
            onChangeText={setAllergies}
            editable={!isSubmitting}
          />
          <SetupInput
            label="Dislikes"
            value={dislikes}
            placeholder="mushrooms, olives"
            onChangeText={setDislikes}
            editable={!isSubmitting}
          />
          <SetupInput
            label="Dinner goals"
            value={goals}
            placeholder="simple weeknights, kid-friendly, less takeout"
            onChangeText={setGoals}
            editable={!isSubmitting}
            multiline
          />
        </SetupCard>

        <SetupCard
          icon="happy-outline"
          title="Kid or managed eater"
          subtitle="Optional. Add one now, then add more later in Settings."
        >
          <SetupInput
            label="Name"
            value={kidName}
            placeholder="Avery"
            onChangeText={setKidName}
            editable={!isSubmitting}
          />
          <SetupInput
            label="Diet style"
            value={kidDietaryPreferences}
            placeholder="picky eater, soft foods, school-night meals"
            onChangeText={setKidDietaryPreferences}
            editable={!isSubmitting}
          />
          <SetupInput
            label="Allergies"
            value={kidAllergies}
            placeholder="dairy, eggs"
            onChangeText={setKidAllergies}
            editable={!isSubmitting}
          />
          <SetupInput
            label="Dislikes"
            value={kidDislikes}
            placeholder="beef, spicy food"
            onChangeText={setKidDislikes}
            editable={!isSubmitting}
          />
        </SetupCard>

        <TouchableOpacity
          onPress={() => void handleFinishSetup()}
          disabled={isSubmitting}
          className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4"
          style={{ opacity: isSubmitting ? 0.7 : 1 }}
          accessibilityRole="button"
          accessibilityLabel="Finish FamilyPlate setup"
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={19} color="white" />
          )}
          <Text className="text-base font-bold text-white">
            {isSubmitting ? "Creating household..." : "Add Pantry Staples"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SetupCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name={icon} size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{title}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            {subtitle}
          </Text>
        </View>
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function SetupInput({
  label,
  value,
  placeholder,
  editable,
  multiline = false,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  editable: boolean;
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#9a9489"
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        className="rounded-xl bg-muted p-3 text-base text-foreground"
        style={multiline ? { minHeight: 82, textAlignVertical: "top" } : undefined}
        autoCapitalize="sentences"
      />
      <Text className="mt-1 text-[11px] leading-4 text-muted-foreground">
        Separate multiple items with commas.
      </Text>
    </View>
  );
}
