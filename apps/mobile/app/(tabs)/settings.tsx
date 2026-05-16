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
import { usePostHog } from "posthog-react-native";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import { ScreenShell } from "@/components/ScreenShell";
import { AI_CONSENT_DISCLOSURE, clearAiConsent } from "@/lib/aiConsent";
import { track } from "@/lib/analytics";
import {
  configureRevenueCat,
  getFamilyOffering,
  getFamilyPackages,
  hasFamilyEntitlement,
  isRevenueCatAvailable,
  purchaseFamilyPackage,
  restoreFamilyPurchases,
  type RevenueCatPackage,
} from "@/lib/revenuecat";

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

const PRIVACY_URL = "https://familyplate.co/privacy";
const TERMS_URL = "https://familyplate.co/terms";
const SUPPORT_URL = "https://familyplate.co/support";
const APP_STORE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

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

function getBillingError(err: unknown) {
  const fallback = "App Store billing is unavailable right now. Please try again.";
  if (typeof err === "object" && err !== null) {
    const maybeError = err as {
      message?: unknown;
      userCancelled?: unknown;
      code?: unknown;
    };
    const message =
      typeof maybeError.message === "string" ? maybeError.message : fallback;
    const isStoreConfigurationError =
      message.includes("offerings-empty") ||
      message.includes("None of the products registered") ||
      message.includes("could be fetched from App Store Connect");

    return {
      message: isStoreConfigurationError
        ? "App Store plans are not available yet. Please try again soon."
        : message,
      userCancelled:
        maybeError.userCancelled === true ||
        maybeError.code === "1" ||
        maybeError.code === "PURCHASE_CANCELLED_ERROR",
    };
  }

  return { message: fallback, userCancelled: false };
}

function getBillingErrorMessage(err: unknown) {
  return getBillingError(err).message;
}

function getUniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export default function SettingsScreen() {
  const { signOut } = useAuthActions();
  const posthog = usePostHog();
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
  const deleteAccount = useMutation(api.mutations.profiles.deleteMyAccount);

  const [allergiesInput, setAllergiesInput] = useState("");
  const [dislikesInput, setDislikesInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [familyPackages, setFamilyPackages] = useState<RevenueCatPackage[]>([]);
  const [billingMessage, setBillingMessage] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isPurchasingPackage, setIsPurchasingPackage] = useState<string | null>(null);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const syncedProfileId = useRef<string | null>(null);
  const trackedPaywallForUser = useRef<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    async function loadBilling() {
      if (!currentUser?.authId) return;

      if (!isRevenueCatAvailable()) {
        setFamilyPackages([]);
        setBillingMessage("App Store subscriptions are being configured.");
        return;
      }

      setIsLoadingBilling(true);
      setBillingMessage("");

      try {
        await configureRevenueCat({
          appUserId: currentUser.authId,
          email: currentUser.email,
        });
        const offering = await getFamilyOffering();
        const packages = getFamilyPackages(offering);

        if (!isMounted) return;
        setFamilyPackages(packages);
        setBillingMessage(
          packages.length > 0
            ? ""
            : "No App Store subscription products are available yet.",
        );
      } catch (err) {
        if (!isMounted) return;
        setFamilyPackages([]);
        setBillingMessage(getBillingErrorMessage(err));
      } finally {
        if (isMounted) {
          setIsLoadingBilling(false);
        }
      }
    }

    void loadBilling();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.authId, currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.authId) return;
    if (subscription?.tier === "family") return;
    if (familyPackages.length === 0) return;
    if (trackedPaywallForUser.current === currentUser.authId) return;

    trackedPaywallForUser.current = currentUser.authId;
    track(posthog, "paywall_viewed", {
      source: "settings_plan_usage",
      package_count: familyPackages.length,
    });
  }, [currentUser?.authId, familyPackages.length, posthog, subscription?.tier]);

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

  const handleResetAiConsent = () => {
    Alert.alert(
      "Reset AI permission?",
      "The next AI meal plan, dinner idea, or grocery scan will ask for permission again before sharing data with third-party AI providers.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: () => {
            void clearAiConsent().then(() => {
              Alert.alert("AI permission reset", "FamilyPlate will ask again before using AI features.");
            });
          },
        },
      ],
    );
  };

  const handlePurchasePackage = async (pack: RevenueCatPackage) => {
    track(posthog, "purchase_started", {
      product_id: pack.product.identifier,
      package_id: pack.identifier,
      package_title: getPackageTitle(pack),
    });
    setBillingNotice("");
    setIsPurchasingPackage(pack.identifier);

    try {
      const result = await purchaseFamilyPackage(pack);
      const isFamily = hasFamilyEntitlement(result.customerInfo);
      track(posthog, "purchase_completed", {
        product_id: result.productIdentifier,
        is_family: isFamily,
      });
      setBillingNotice(
        isFamily
          ? "Family plan activated. Unlimited weekly planning is ready for this household."
          : "Apple completed the purchase. FamilyPlate is refreshing your household plan.",
      );
      Alert.alert(
        isFamily ? "Family plan active" : "Purchase complete",
        isFamily
          ? "Your FamilyPlate family plan is active. It may take a moment to refresh across your household."
          : "Apple completed the purchase. FamilyPlate will refresh your plan shortly.",
      );
    } catch (err) {
      const billingError = getBillingError(err);
      track(posthog, "purchase_failed", {
        product_id: pack.product.identifier,
        package_id: pack.identifier,
        cancelled: billingError.userCancelled,
      });

      if (!billingError.userCancelled) {
        Alert.alert("Purchase failed", billingError.message);
      }
    } finally {
      setIsPurchasingPackage(null);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoringPurchases(true);
    setBillingNotice("");
    track(posthog, "purchase_restore_started", {
      source: "settings_plan_usage",
    });

    try {
      const customerInfo = await restoreFamilyPurchases();
      const isFamily = hasFamilyEntitlement(customerInfo);
      track(posthog, "purchase_restored", { is_family: isFamily });
      setBillingNotice(
        isFamily
          ? "Purchases restored. Your Family plan should appear here shortly."
          : "No active Family plan was found for this Apple ID.",
      );
      Alert.alert(
        isFamily ? "Purchases restored" : "No family plan found",
        isFamily
          ? "Your FamilyPlate family plan was restored. It may take a moment to refresh across your household."
          : "We did not find an active FamilyPlate family plan on this Apple ID.",
      );
    } catch (err) {
      track(posthog, "purchase_restore_failed", {});
      Alert.alert("Restore failed", getBillingErrorMessage(err));
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  const handleManageSubscription = async () => {
    track(posthog, "subscription_manage_opened", {
      source: "settings_plan_usage",
    });
    await WebBrowser.openBrowserAsync(APP_STORE_SUBSCRIPTIONS_URL);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your FamilyPlate account and personal profile data. If you are the only signed-in member of a household, its pantry, recipes, grocery lists, and meal plans will also be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await deleteAccount({});
              await clearAiConsent();
              await signOut();
            } catch (err) {
              Alert.alert("Could not delete account", getErrorMessage(err));
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
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

          <PlanUsageCard
            subscription={subscription}
            familyPackages={familyPackages}
            billingMessage={billingMessage}
            billingNotice={billingNotice}
            isLoadingBilling={isLoadingBilling}
            isPurchasingPackage={isPurchasingPackage}
            isRestoringPurchases={isRestoringPurchases}
            onPurchasePackage={handlePurchasePackage}
            onRestorePurchases={handleRestorePurchases}
            onManageSubscription={handleManageSubscription}
          />

          <HouseholdSafetyCard
            allergies={householdAllergies}
            dislikes={householdDislikes}
          />

          <PrivacyAccountCard
            onResetAiConsent={handleResetAiConsent}
            onDeleteAccount={handleDeleteAccount}
            isDeletingAccount={isDeletingAccount}
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

function PrivacyAccountCard({
  onResetAiConsent,
  onDeleteAccount,
  isDeletingAccount,
}: {
  onResetAiConsent: () => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}) {
  const openUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name="lock-closed-outline" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Privacy & Account
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Review data use, support, and account controls.
          </Text>
        </View>
      </View>

      <View className="mb-3 rounded-xl bg-muted p-3">
        <View className="mb-2 flex-row items-start gap-2">
          <Ionicons name="sparkles-outline" size={18} color="#248f58" />
          <Text className="flex-1 text-sm font-semibold text-foreground">
            AI data sharing
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {AI_CONSENT_DISCLOSURE}
        </Text>
      </View>

      <View className="gap-2">
        <SettingsAction
          icon="document-text-outline"
          label="Privacy Policy"
          onPress={() => void openUrl(PRIVACY_URL)}
        />
        <SettingsAction
          icon="reader-outline"
          label="Terms of Service"
          onPress={() => void openUrl(TERMS_URL)}
        />
        <SettingsAction
          icon="help-circle-outline"
          label="Support"
          onPress={() => void openUrl(SUPPORT_URL)}
        />
        <SettingsAction
          icon="refresh-outline"
          label="Reset AI Permission"
          onPress={onResetAiConsent}
        />
        <SettingsAction
          icon="trash-outline"
          label={isDeletingAccount ? "Deleting Account..." : "Delete Account"}
          danger
          disabled={isDeletingAccount}
          onPress={onDeleteAccount}
        />
      </View>
    </View>
  );
}

function SettingsAction({
  icon,
  label,
  danger = false,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const color = danger ? "#c2410c" : "#248f58";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text
        className={`flex-1 font-semibold ${
          danger ? "text-destructive" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      {disabled ? (
        <ActivityIndicator color={color} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#9a9489" />
      )}
    </TouchableOpacity>
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

function PlanUsageCard({
  subscription,
  familyPackages,
  billingMessage,
  billingNotice,
  isLoadingBilling,
  isPurchasingPackage,
  isRestoringPurchases,
  onPurchasePackage,
  onRestorePurchases,
  onManageSubscription,
}: {
  subscription: Subscription | undefined;
  familyPackages: RevenueCatPackage[];
  billingMessage: string;
  billingNotice: string;
  isLoadingBilling: boolean;
  isPurchasingPackage: string | null;
  isRestoringPurchases: boolean;
  onPurchasePackage: (pack: RevenueCatPackage) => Promise<void>;
  onRestorePurchases: () => Promise<void>;
  onManageSubscription: () => Promise<void>;
}) {
  const isFamily = subscription?.tier === "family";
  const tierLabel =
    subscription === undefined ? "Checking" : isFamily ? "Unlimited" : "Free";
  const planLimitLabel =
    subscription === undefined
      ? "Checking plan usage"
      : isFamily
        ? "Unlimited meal plans"
        : `${subscription.plansUsed}/${subscription.plansLimit} free weekly plans used`;
  const planDetail =
    subscription === undefined
      ? "Checking Apple billing and household usage."
      : isFamily
        ? "Your household can generate unlimited weekly plans."
        : subscription.canGenerate
          ? "Free households can generate two weekly plans each month."
          : "The free monthly planning limit has been reached. Pantry, cookbook, and grocery list tools are still available.";

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name="shield-checkmark" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Plan Usage
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Weekly meal planning access
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
        <Text className="mt-2 text-xs leading-4 text-muted-foreground">
          {planDetail}
        </Text>
      </View>

      {billingNotice ? (
        <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3">
          <Ionicons name="checkmark-circle" size={18} color="#248f58" />
          <Text className="flex-1 text-sm leading-5 text-primary">
            {billingNotice}
          </Text>
        </View>
      ) : null}

      {isFamily ? (
        <View className="gap-2">
          <View className="rounded-xl border border-primary/20 bg-primary/10 p-3">
            <View className="flex-row items-start gap-2">
              <Ionicons name="checkmark-circle" size={18} color="#248f58" />
              <View className="flex-1">
                <Text className="text-sm font-bold text-primary">
                  Family plan is active
                </Text>
                <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                  App Store manages billing. FamilyPlate syncs entitlement
                  changes back to this household automatically.
                </Text>
              </View>
            </View>
          </View>
          <SettingsAction
            icon="card-outline"
            label="Manage Subscription"
            onPress={() => void onManageSubscription()}
          />
          <SettingsAction
            icon="refresh-outline"
            label={isRestoringPurchases ? "Restoring..." : "Restore Purchases"}
            disabled={isRestoringPurchases}
            onPress={() => void onRestorePurchases()}
          />
        </View>
      ) : (
        <View className="rounded-xl border border-border bg-card p-3">
          <View className="mb-3 flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Ionicons name="people-outline" size={20} color="#248f58" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">
                Upgrade to Family
              </Text>
              <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                Unlock unlimited weekly plans for the whole household. Billing
                stays inside your Apple ID.
              </Text>
            </View>
          </View>

          {isLoadingBilling ? (
            <View className="mb-2 flex-row items-center gap-2 rounded-xl bg-muted p-3">
              <ActivityIndicator color="#248f58" />
              <Text className="text-sm text-muted-foreground">
                Loading App Store plans...
              </Text>
            </View>
          ) : null}

          {!isLoadingBilling && familyPackages.length > 0 ? (
            <View className="gap-2">
              {familyPackages.map((pack) => {
                const isPurchasing = isPurchasingPackage === pack.identifier;
                return (
                  <TouchableOpacity
                    key={pack.identifier}
                    onPress={() => void onPurchasePackage(pack)}
                    disabled={isPurchasingPackage !== null || isRestoringPurchases}
                    className="flex-row items-center gap-3 rounded-xl bg-primary px-3 py-3"
                    style={{
                      opacity:
                        isPurchasingPackage !== null || isRestoringPurchases
                          ? 0.65
                          : 1,
                    }}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Ionicons name="sparkles" size={18} color="white" />
                    )}
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-bold text-white">
                          {getPackageTitle(pack)}
                        </Text>
                        {getPackageBadge(pack) ? (
                          <View className="rounded-full bg-white/20 px-2 py-0.5">
                            <Text className="text-[10px] font-bold uppercase text-white">
                              {getPackageBadge(pack)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-xs text-white/80">
                        {getPackagePriceLabel(pack)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color="white" />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {!isLoadingBilling && billingMessage ? (
            <View className="mb-2 rounded-xl bg-muted p-3">
              <Text className="text-sm leading-5 text-muted-foreground">
                {billingMessage}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => void onRestorePurchases()}
            disabled={isPurchasingPackage !== null || isRestoringPurchases}
            className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
            style={{
              opacity:
                isPurchasingPackage !== null || isRestoringPurchases ? 0.65 : 1,
            }}
          >
            {isRestoringPurchases ? (
              <ActivityIndicator color="#248f58" />
            ) : (
              <Ionicons name="refresh-outline" size={17} color="#248f58" />
            )}
            <Text className="font-semibold text-foreground">
              {isRestoringPurchases ? "Restoring..." : "Restore Purchases"}
            </Text>
          </TouchableOpacity>

          <Text className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">
            Purchases are handled by Apple. Cancel or manage anytime in your
            App Store subscription settings.
          </Text>
        </View>
      )}
    </View>
  );
}

function getPackageTitle(pack: RevenueCatPackage) {
  const period = pack.product.subscriptionPeriod;
  if (period === "P1Y" || pack.identifier.toLowerCase().includes("annual")) {
    return "Annual";
  }
  if (period === "P1M" || pack.identifier.toLowerCase().includes("month")) {
    return "Monthly";
  }
  return pack.product.title || "Family";
}

function getPackagePriceLabel(pack: RevenueCatPackage) {
  const period = pack.product.subscriptionPeriod;
  if (period === "P1Y") return `${pack.product.priceString} per year`;
  if (period === "P1M") return `${pack.product.priceString} per month`;
  return pack.product.priceString;
}

function getPackageBadge(pack: RevenueCatPackage) {
  const period = pack.product.subscriptionPeriod;
  if (period === "P1Y" || pack.identifier.toLowerCase().includes("annual")) {
    return "Best value";
  }
  return "";
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
