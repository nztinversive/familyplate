import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import { ScreenShell } from "@/components/ScreenShell";

type Profile = Doc<"userProfiles">;
type CurrentUser = {
  authId?: string;
  email: string;
  userName: string;
};

type Subscription = {
  tier: "free" | "family";
  isFamily: boolean;
  canGenerate: boolean;
  plansUsed: number;
  plansLimit: number;
  status?: string;
  endsAt?: string;
};

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

function formatDate(timestamp?: number) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Unable to save settings. Please try again.";
}

function getUniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function formatStatus(status?: string) {
  if (!status) return "active";
  return status.replace(/_/g, " ");
}

export default function SettingsScreen() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const profile = useQuery(api.queries.profiles.getMyProfile, {});
  const household = useQuery(api.queries.households.getMyHousehold, {});
  const subscription = useQuery(api.subscriptions.getMySubscription, {});
  const members = useQuery(
    api.queries.profiles.getProfiles,
    currentUser?.householdId
      ? { householdId: currentUser.householdId }
      : "skip",
  );
  const updateProfile = useMutation(api.mutations.profiles.updateProfile);

  const [allergiesInput, setAllergiesInput] = useState("");
  const [dislikesInput, setDislikesInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const syncedProfileId = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (syncedProfileId.current === profile._id) return;
    syncedProfileId.current = profile._id;
    setAllergiesInput((profile.allergies ?? []).join(", "));
    setDislikesInput((profile.dislikes ?? []).join(", "));
    setError("");
  }, [profile]);

  const parsedAllergies = useMemo(
    () => parseCommaSeparatedList(allergiesInput),
    [allergiesInput],
  );
  const parsedDislikes = useMemo(
    () => parseCommaSeparatedList(dislikesInput),
    [dislikesInput],
  );
  const hasPreferenceChanges =
    parsedAllergies.join("|") !== (profile?.allergies ?? []).join("|") ||
    parsedDislikes.join("|") !== (profile?.dislikes ?? []).join("|");
  const householdAllergies = useMemo(
    () => getUniqueValues((members ?? []).flatMap((member) => member.allergies)),
    [members],
  );
  const householdDislikes = useMemo(
    () => getUniqueValues((members ?? []).flatMap((member) => member.dislikes)),
    [members],
  );
  const loading =
    currentUser === undefined ||
    profile === undefined ||
    household === undefined;

  const handleSavePreferences = async () => {
    if (!profile?._id || !hasPreferenceChanges) return;

    setIsSaving(true);
    setError("");
    setSaved(false);

    try {
      await updateProfile({
        profileId: profile._id,
        allergies: parsedAllergies,
        dislikes: parsedDislikes,
      });
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPreferences = () => {
    setAllergiesInput((profile?.allergies ?? []).join(", "));
    setDislikesInput((profile?.dislikes ?? []).join(", "));
    setError("");
    setSaved(false);
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  };

  return (
    <ScreenShell
      title="Settings"
      subtitle={
        household?.name ?? currentUser?.email ?? "Profile and household"
      }
    >
      {loading ? (
        <View className="items-center rounded-2xl border border-border bg-card p-6">
          <ActivityIndicator color="#248f58" />
          <Text className="mt-3 text-sm text-muted-foreground">
            Loading settings...
          </Text>
        </View>
      ) : (
        <>
          <ProfileCard currentUser={currentUser} profile={profile} />

          <HouseholdCard household={household} members={members ?? []} />

          <SubscriptionCard
            currentUser={currentUser}
            subscription={subscription}
          />

          <HouseholdSafetyCard
            allergies={householdAllergies}
            dislikes={householdDislikes}
          />

          <View className="mb-4 rounded-2xl border border-border bg-card p-4">
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="heart" size={22} color="#248f58" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">
                  Dinner Preferences
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Planning avoids these for the whole table.
                </Text>
              </View>
            </View>

            <PreferenceList
              label="Dietary preferences"
              items={profile?.dietaryPreferences ?? []}
            />

            <PreferenceEditor
              label="Allergies"
              value={allergiesInput}
              placeholder="peanuts, shellfish, dairy"
              onChangeText={(value) => {
                setAllergiesInput(value);
                setSaved(false);
                setError("");
              }}
            />

            <PreferenceEditor
              label="Dislikes"
              value={dislikesInput}
              placeholder="mushrooms, olives, brussels sprouts"
              onChangeText={(value) => {
                setDislikesInput(value);
                setSaved(false);
                setError("");
              }}
            />

            {error ? (
              <View className="mb-3 flex-row items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                <Ionicons name="alert-circle" size={18} color="#c2410c" />
                <Text className="flex-1 text-sm leading-5 text-destructive">
                  {error}
                </Text>
              </View>
            ) : null}

            {saved && !error ? (
              <View className="mb-3 flex-row items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3">
                <Ionicons name="checkmark-circle" size={18} color="#248f58" />
                <Text className="flex-1 text-sm leading-5 text-primary">
                  Preferences updated.
                </Text>
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => void handleSavePreferences()}
                disabled={!hasPreferenceChanges || isSaving || !profile?._id}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
                style={{
                  opacity:
                    !hasPreferenceChanges || isSaving || !profile?._id
                      ? 0.55
                      : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="save-outline" size={18} color="white" />
                )}
                <Text className="font-semibold text-white">
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResetPreferences}
                disabled={!hasPreferenceChanges || isSaving}
                className="flex-1 items-center rounded-xl border border-border bg-card py-3"
                style={{
                  opacity: !hasPreferenceChanges || isSaving ? 0.55 : 1,
                }}
              >
                <Text className="font-semibold text-foreground">Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSignOut}
            className="mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-foreground py-3"
          >
            <Ionicons name="log-out-outline" size={18} color="white" />
            <Text className="font-semibold text-white">Sign out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScreenShell>
  );
}

function ProfileCard({
  currentUser,
  profile,
}: {
  currentUser: CurrentUser | null;
  profile: Profile | null;
}) {
  const name = profile?.name ?? currentUser?.userName ?? "FamilyPlate user";
  const initial = name[0]?.toUpperCase() ?? "U";

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
      <View className="flex-row items-center gap-3 bg-primary/10 p-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Text className="text-xl font-bold text-white">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{name}</Text>
          <Text className="text-sm text-muted-foreground">
            {currentUser?.email || profile?.email || "Signed in"}
          </Text>
        </View>
      </View>

      <View className="flex-row border-t border-border">
        <ProfileStat
          icon="mail-outline"
          label={currentUser?.email ? "Email" : "No email"}
        />
        <ProfileStat
          icon="shield-checkmark-outline"
          label={profile?.role ?? "member"}
        />
        <ProfileStat
          icon="person-outline"
          label={profile?.isChild ? "Child" : "Adult"}
        />
      </View>
    </View>
  );
}

function ProfileStat({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="flex-1 items-center border-r border-border bg-card p-3 last:border-r-0">
      <Ionicons name={icon} size={18} color="#686158" />
      <Text className="mt-1 text-center text-xs capitalize text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function HouseholdCard({
  household,
  members,
}: {
  household: Doc<"households"> | null;
  members: Profile[];
}) {
  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Household
          </Text>
          <Text className="mt-1 text-xl font-bold text-foreground">
            {household?.name ?? "No household"}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(household?.createdAt)}
          </Text>
        </View>
        {household?.inviteCode ? (
          <View className="rounded-xl border border-border bg-muted px-3 py-2">
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Invite
            </Text>
            <Text className="mt-1 font-bold text-foreground">
              {household.inviteCode}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mb-3 flex-row gap-2">
        <View className="flex-1 rounded-xl bg-muted p-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Members
          </Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">
            {members.length}
          </Text>
        </View>
        <View className="flex-1 rounded-xl bg-muted p-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admins
          </Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">
            {members.filter((member) => member.role === "admin").length}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        {members.map((member) => (
          <View key={member._id} className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <Text className="font-bold text-foreground">
                {member.name[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-foreground">
                {member.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {member.email || "Managed profile"}
              </Text>
            </View>
            <View className="rounded-full bg-muted px-2 py-1">
              <Text className="text-xs font-semibold capitalize text-muted-foreground">
                {member.isChild ? "child" : member.role}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function SubscriptionCard({
  currentUser,
  subscription,
}: {
  currentUser: CurrentUser | null;
  subscription: Subscription | undefined;
}) {
  const isFamily = subscription?.tier === "family";
  const tierLabel =
    subscription === undefined ? "Checking" : isFamily ? "Family" : "Free";
  const statusLabel =
    subscription === undefined
      ? "checking subscription"
      : formatStatus(subscription.status);
  const planLimitLabel =
    subscription === undefined
      ? "Checking plan usage"
      : isFamily
        ? "Unlimited meal plans"
        : `${subscription.plansUsed}/${subscription.plansLimit} free weekly plans used`;

  const buildCheckoutUrl = (variantId: string) => {
    const params = new URLSearchParams();
    if (currentUser?.email) {
      params.set("checkout[email]", currentUser.email);
    }
    if (currentUser?.authId) {
      params.set("checkout[custom][auth_id]", currentUser.authId);
    }

    const query = params.toString();
    return `https://familyplate.lemonsqueezy.com/buy/${variantId}${
      query ? `?${query}` : ""
    }`;
  };

  const openSubscriptionUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name="shield-checkmark" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Subscription
          </Text>
          <Text className="mt-1 text-sm capitalize text-muted-foreground">
            {tierLabel} plan · {statusLabel}
          </Text>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${
            isFamily ? "bg-primary/10" : "bg-muted"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isFamily ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {tierLabel}
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-xl bg-muted p-3">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name={subscription?.canGenerate === false ? "alert-circle" : "calendar"}
            size={17}
            color={subscription?.canGenerate === false ? "#c2410c" : "#248f58"}
          />
          <Text className="flex-1 text-sm font-semibold text-foreground">
            {planLimitLabel}
          </Text>
        </View>
        {!isFamily && subscription !== undefined ? (
          <Text className="mt-2 text-xs leading-4 text-muted-foreground">
            {subscription.canGenerate
              ? "Free households can generate two weekly plans each month."
              : "Family unlocks unlimited weekly plans for everyone in your household."}
          </Text>
        ) : null}
      </View>

      {isFamily ? (
        <TouchableOpacity
          onPress={() =>
            void openSubscriptionUrl("https://familyplate.lemonsqueezy.com/billing")
          }
          className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
        >
          <Ionicons name="card-outline" size={18} color="#248f58" />
          <Text className="font-semibold text-primary">Manage Billing</Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => void openSubscriptionUrl(buildCheckoutUrl("1485021"))}
            disabled={subscription === undefined}
            className="flex-1 items-center rounded-xl bg-primary py-3"
            style={{ opacity: subscription === undefined ? 0.55 : 1 }}
          >
            <Text className="font-semibold text-white">$5.99/mo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void openSubscriptionUrl(buildCheckoutUrl("1485023"))}
            disabled={subscription === undefined}
            className="flex-1 items-center rounded-xl border border-primary bg-card py-3"
            style={{ opacity: subscription === undefined ? 0.55 : 1 }}
          >
            <Text className="font-semibold text-primary">Annual</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function HouseholdSafetyCard({
  allergies,
  dislikes,
}: {
  allergies: string[];
  dislikes: string[];
}) {
  const hasSafetyNotes = allergies.length > 0 || dislikes.length > 0;

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-red-50">
          <Ionicons name="medical-outline" size={22} color="#c2410c" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Household Safety
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            These are combined across household members and used by planning.
          </Text>
        </View>
      </View>

      {hasSafetyNotes ? (
        <>
          <PreferenceList label="All allergies" items={allergies} />
          <PreferenceList label="All dislikes" items={dislikes} />
        </>
      ) : (
        <View className="flex-row items-start gap-2 rounded-xl bg-muted p-3">
          <Ionicons name="checkmark-circle" size={18} color="#248f58" />
          <Text className="flex-1 text-sm leading-5 text-muted-foreground">
            No household allergies or dislikes are saved yet.
          </Text>
        </View>
      )}
    </View>
  );
}

function PreferenceList({ label, items }: { label: string; items: string[] }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-foreground">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <View key={item} className="rounded-full bg-muted px-3 py-1.5">
              <Text className="text-sm font-semibold text-muted-foreground">
                {item}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-muted-foreground">None added</Text>
        )}
      </View>
    </View>
  );
}

function PreferenceEditor({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-foreground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9a9489"
        multiline
        textAlignVertical="top"
        className="min-h-24 rounded-xl bg-muted p-3 text-base text-foreground"
      />
      <Text className="mt-2 text-xs text-muted-foreground">
        Separate each item with a comma.
      </Text>
    </View>
  );
}
