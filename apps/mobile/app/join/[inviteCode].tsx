import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@familyplate/convex/_generated/api";
import { LoadingScreen } from "@/components/LoadingScreen";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

function getJoinErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Unable to join this household right now.";
}

function normalizeInviteEmail(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes("@") ? normalized : "";
}

export default function JoinHouseholdScreen() {
  const params = useLocalSearchParams<{
    inviteCode?: string | string[];
    email?: string | string[];
  }>();
  const router = useRouter();
  const posthog = usePostHog();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const joinHousehold = useMutation(api.mutations.households.joinHousehold);

  const inviteCode = useMemo(() => {
    if (typeof params.inviteCode !== "string") return "";
    return params.inviteCode.trim().toUpperCase();
  }, [params.inviteCode]);
  const inviteEmail = useMemo(
    () => normalizeInviteEmail(params.email),
    [params.email],
  );

  const household = useQuery(
    api.queries.households.getHouseholdByInviteCode,
    inviteCode ? { inviteCode } : "skip",
  );

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const inviteReturnTo = inviteCode
    ? inviteEmail
      ? `/join/${inviteCode}?email=${encodeURIComponent(inviteEmail)}`
      : `/join/${inviteCode}`
    : "/sign-in";
  const signInTarget = inviteCode
    ? {
        pathname: "/sign-in" as const,
        params: {
          returnTo: inviteReturnTo,
          inviteEmail,
        },
      }
    : "/sign-in";

  const handleJoin = async () => {
    if (!inviteCode) {
      setError("This invite link is missing a code.");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      track(posthog, "household_join_started", {
        source: "mobile_invite_link",
        invite_code_length: inviteCode.length,
      });
      await joinHousehold({
        inviteCode,
        inviteEmail: inviteEmail || undefined,
      });
      track(posthog, "household_join_completed", {
        source: "mobile_invite_link",
        household_name: household?.name,
      });
      router.replace("/plan");
    } catch (err) {
      track(posthog, "household_join_failed", {
        source: "mobile_invite_link",
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "invite", action: "join_household", platform: "ios" },
      });
      setError(getJoinErrorMessage(err));
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading || household === undefined) {
    return (
      <LoadingScreen
        message="Loading invite..."
        detail="Checking who invited you"
      />
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ flex: 1, backgroundColor: "#fbfaf7" }}
    >
      <View className="flex-1 px-5 py-8">
        <View className="mb-8 items-center">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Ionicons name="restaurant" size={26} color="white" />
          </View>
          <Text className="text-center text-3xl font-bold text-foreground">
            FamilyPlate
          </Text>
          <Text className="mt-2 text-center text-base text-muted-foreground">
            Join a shared household and start planning dinners together.
          </Text>
        </View>

        <View
          className="rounded-3xl border border-border bg-card p-5"
          style={{
            shadowColor: "#171d1a",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.06,
            shadowRadius: 24,
          }}
        >
          {household === null ? (
            <View className="items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                <Ionicons name="close-circle-outline" size={28} color="#c2410c" />
              </View>
              <Text className="text-center text-2xl font-bold text-foreground">
                Invalid invite
              </Text>
              <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">
                This invite link no longer works. Ask the household admin to
                send a fresh code from Settings.
              </Text>
              <TouchableOpacity
                onPress={() => router.replace("/sign-in")}
                className="mt-6 flex-row items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <Ionicons name="arrow-back-outline" size={18} color="#248f58" />
                <Text className="text-sm font-semibold text-foreground">
                  Back to sign in
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Ionicons name="people-outline" size={28} color="#248f58" />
              </View>
              <Text className="text-2xl font-bold text-foreground">
                Join {household.name}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-muted-foreground">
                Invited by {household.invitedBy}. Share the pantry, plan dinners
                together, and keep one grocery list in sync.
              </Text>

              <View className="mt-4 rounded-2xl bg-muted px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Invite code
                </Text>
                <Text className="mt-1 text-lg font-bold tracking-[0.18em] text-foreground">
                  {inviteCode}
                </Text>
                <Text className="mt-2 text-sm text-muted-foreground">
                  {household.memberCount} member
                  {household.memberCount === 1 ? "" : "s"} already in this
                  household.
                </Text>
                {inviteEmail ? (
                  <Text className="mt-2 text-sm text-muted-foreground">
                    Sign in with <Text className="font-semibold text-foreground">{inviteEmail}</Text> to claim the invited adult profile automatically.
                  </Text>
                ) : null}
              </View>

              {error ? (
                <View className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3">
                  <Text className="text-sm text-destructive">{error}</Text>
                </View>
              ) : null}

              {!isAuthenticated ? (
                <TouchableOpacity
                  onPress={() => router.push(signInTarget)}
                  className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4"
                >
                  <Ionicons name="log-in-outline" size={19} color="white" />
                  <Text className="text-base font-bold text-white">
                    {inviteEmail ? "Sign in with invite email" : "Sign in to join"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => void handleJoin()}
                  disabled={isJoining}
                  className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4"
                  style={{ opacity: isJoining ? 0.75 : 1 }}
                >
                  {isJoining ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color="white"
                    />
                  )}
                  <Text className="text-base font-bold text-white">
                    {isJoining ? "Joining household..." : "Join Household"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
