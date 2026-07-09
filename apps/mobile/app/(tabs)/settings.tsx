import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { usePostHog } from "posthog-react-native";
import { api } from "@familyplate/convex/_generated/api";
import type { Doc } from "@familyplate/convex/_generated/dataModel";
import { ScreenShell } from "@/components/ScreenShell";
import { AI_CONSENT_DISCLOSURE, clearAiConsent } from "@/lib/aiConsent";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";
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
type LearningItem = {
  label: string;
  count: number;
};
type LearningSummary = {
  favorites: LearningItem[];
  avoiding: LearningItem[];
  kidApproved: LearningItem[];
  tooMuchPrep: LearningItem[];
  tooSpicy: LearningItem[];
  greatLeftovers: LearningItem[];
  removableDislikes: string[];
  feedbackCount: number;
};

const PRIVACY_URL = "https://familyplate.co/privacy";
const TERMS_URL = "https://familyplate.co/terms";
const SUPPORT_URL = "https://familyplate.co/support";
const APP_STORE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const APP_URL = "https://familyplate.co";

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildInviteShareText(householdName: string, inviteCode: string) {
  const inviteUrl = `${APP_URL}/join/${inviteCode}`;
  return `Join ${householdName} on FamilyPlate.\n\nInvite code: ${inviteCode}\n${inviteUrl}`;
}

function hasJoinedHousehold(member: Profile) {
  return member.authId.trim().length > 0;
}

function isPendingInviteMember(member: Profile) {
  return !member.isChild && !!member.email && !hasJoinedHousehold(member);
}

export default function SettingsScreen() {
  const { signOut } = useAuthActions();
  const posthog = usePostHog();
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const profile = useQuery(api.queries.profiles.getMyProfile, {});
  const household = useQuery(api.queries.households.getMyHousehold, {});
  const learningSummary = useQuery(
    api.queries.feedback.getMyHouseholdLearningSummary,
    {},
  );
  const subscription = useQuery(api.subscriptions.getMySubscription, {});
  const members = useQuery(
    api.queries.profiles.getProfiles,
    currentUser?.householdId
      ? { householdId: currentUser.householdId }
      : "skip",
  );
  const updateProfile = useMutation(api.mutations.profiles.updateProfile);
  const addFamilyMember = useMutation(api.mutations.profiles.addFamilyMember);
  const deleteAccount = useMutation(api.mutations.profiles.deleteMyAccount);
  const sendInviteEmail = useAction(api.actions.sendInviteEmail.sendInviteEmail);

  const [allergiesInput, setAllergiesInput] = useState("");
  const [dislikesInput, setDislikesInput] = useState("");
  const [showEaterForm, setShowEaterForm] = useState(false);
  const [eaterName, setEaterName] = useState("");
  const [eaterEmail, setEaterEmail] = useState("");
  const [eaterAge, setEaterAge] = useState("");
  const [eaterIsChild, setEaterIsChild] = useState(true);
  const [eaterDietaryInput, setEaterDietaryInput] = useState("");
  const [eaterAllergiesInput, setEaterAllergiesInput] = useState("");
  const [eaterDislikesInput, setEaterDislikesInput] = useState("");
  const [isAddingEater, setIsAddingEater] = useState(false);
  const [eaterError, setEaterError] = useState("");
  const [eaterSaved, setEaterSaved] = useState(false);
  const [eaterSavedMessage, setEaterSavedMessage] = useState("Eater profile added.");
  const [isSaving, setIsSaving] = useState(false);
  const [removingDislike, setRemovingDislike] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [familyPackages, setFamilyPackages] = useState<RevenueCatPackage[]>([]);
  const [billingMessage, setBillingMessage] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isPurchasingPackage, setIsPurchasingPackage] = useState<string | null>(null);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const [resendingInviteProfileId, setResendingInviteProfileId] = useState<string | null>(null);
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
  const canManageMembers = profile?.role === "admin";
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

  const shareHouseholdInvite = async () => {
    if (!household?.inviteCode) return;

    try {
      await Share.share({
        title: `Join ${household.name} on FamilyPlate`,
        message: buildInviteShareText(household.name, household.inviteCode),
      });
      track(posthog, "household_invite_shared", {
        household_id: household._id,
        member_count: members?.length ?? 0,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "settings", action: "share_invite", platform: "ios" },
      });
      setError(err instanceof Error ? err.message : "Couldn't share invite.");
    }
  };

  const handleResendInvite = async (member: Profile) => {
    if (!household?._id || !isPendingInviteMember(member)) return;

    setResendingInviteProfileId(member._id);
    setError("");

    try {
      const result = await sendInviteEmail({
        toEmail: member.email,
        memberName: member.name,
        householdId: household._id,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Invite email could not be sent.");
      }

      track(posthog, "household_invite_email_resent", {
        source: "ios_settings_household_card",
      });
      Alert.alert("Invite resent", `FamilyPlate emailed ${member.email} again.`);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "settings", action: "resend_invite_email", platform: "ios" },
      });
      track(posthog, "household_invite_email_resend_failed", {
        source: "ios_settings_household_card",
        reason: err instanceof Error ? err.message : "unknown",
      });
      Alert.alert("Invite not sent", getErrorMessage(err));
    } finally {
      setResendingInviteProfileId(null);
    }
  };

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
        track(posthog, "subscription_products_loaded", {
          package_count: packages.length,
          tier: subscription?.tier ?? "unknown",
        });
      } catch (err) {
        if (!isMounted) return;
        const message = getBillingErrorMessage(err);
        setFamilyPackages([]);
        setBillingMessage(message);
        track(posthog, "subscription_products_failed", { message });
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
  }, [currentUser?.authId, currentUser?.email, posthog, subscription?.tier]);

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

  const handleRemoveLearnedDislike = async (item: string) => {
    if (!profile?._id) return;

    setRemovingDislike(item);
    setError("");
    setSaved(false);

    try {
      const nextDislikes = (profile.dislikes ?? []).filter(
        (value) => value !== item,
      );
      await updateProfile({
        profileId: profile._id,
        dislikes: nextDislikes,
      });
      setDislikesInput(nextDislikes.join(", "));
      setSaved(true);
      track(posthog, "preference_saved_from_feedback", {
        source: "settings_learning_summary",
        preference_type: "remove_dislike",
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          area: "settings",
          action: "remove_learned_dislike",
          platform: "ios",
        },
      });
      setError(getErrorMessage(err));
    } finally {
      setRemovingDislike(null);
    }
  };

  const resetEaterForm = () => {
    setEaterName("");
    setEaterEmail("");
    setEaterAge("");
    setEaterIsChild(true);
    setEaterDietaryInput("");
    setEaterAllergiesInput("");
    setEaterDislikesInput("");
  };

  const handleAddEater = async () => {
    if (!currentUser?.householdId) return;

    const name = eaterName.trim();
    if (!name) {
      setEaterError("Add a name before saving this eater profile.");
      return;
    }

    const parsedAge = eaterAge.trim() ? Number(eaterAge.trim()) : undefined;
    const normalizedEmail = eaterEmail.trim().toLowerCase();
    if (parsedAge !== undefined && (!Number.isFinite(parsedAge) || parsedAge <= 0)) {
      setEaterError("Age must be a positive number.");
      return;
    }
    if (!eaterIsChild && normalizedEmail && !isValidEmail(normalizedEmail)) {
      setEaterError("Enter a valid email to send an invite.");
      return;
    }

    setIsAddingEater(true);
    setEaterError("");
    setEaterSaved(false);
    setEaterSavedMessage("Eater profile added.");

    try {
      await addFamilyMember({
        householdId: currentUser.householdId,
        name,
        email: !eaterIsChild && normalizedEmail ? normalizedEmail : undefined,
        isChild: eaterIsChild,
        age: parsedAge,
        dietaryPreferences: parseCommaSeparatedList(eaterDietaryInput),
        allergies: parseCommaSeparatedList(eaterAllergiesInput),
        dislikes: parseCommaSeparatedList(eaterDislikesInput),
      });
      let nextSavedMessage = "Eater profile added.";

      if (!eaterIsChild && normalizedEmail && household?._id) {
        try {
          const result = await sendInviteEmail({
            toEmail: normalizedEmail,
            memberName: name,
            householdId: household._id,
          });

          if (result.success) {
            nextSavedMessage = `Eater profile added and invite emailed to ${normalizedEmail}.`;
            track(posthog, "household_invite_email_sent", {
              source: "ios_settings",
              has_existing_household: true,
            });
          } else {
            nextSavedMessage =
              "Eater profile added. Invite email could not be sent yet.";
            track(posthog, "household_invite_email_failed", {
              source: "ios_settings",
              reason: result.error ?? "unknown",
            });
          }
        } catch (err) {
          Sentry.captureException(err, {
            tags: { area: "settings", action: "send_invite_email", platform: "ios" },
          });
          nextSavedMessage =
            "Eater profile added. Invite email could not be sent yet.";
          track(posthog, "household_invite_email_failed", {
            source: "ios_settings",
            reason: err instanceof Error ? err.message : "unknown",
          });
        }
      }
      track(posthog, "eater_profile_added", {
        is_child: eaterIsChild,
        sent_invite_email: !eaterIsChild && !!normalizedEmail,
        has_allergies: parseCommaSeparatedList(eaterAllergiesInput).length > 0,
        has_dislikes: parseCommaSeparatedList(eaterDislikesInput).length > 0,
      });
      resetEaterForm();
      setShowEaterForm(false);
      setEaterSaved(true);
      setEaterSavedMessage(nextSavedMessage);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "settings", action: "add_eater_profile", platform: "ios" },
      });
      setEaterError(getErrorMessage(err));
    } finally {
      setIsAddingEater(false);
    }
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
    setBillingMessage("");
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
      if (billingError.userCancelled) {
        track(posthog, "purchase_cancelled", {
          product_id: pack.product.identifier,
          package_id: pack.identifier,
        });
        setBillingNotice("Purchase canceled. Your free plan is still active.");
      } else {
        track(posthog, "purchase_failed", {
          product_id: pack.product.identifier,
          package_id: pack.identifier,
        });
        setBillingMessage(billingError.message);
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
      const message = getBillingErrorMessage(err);
      track(posthog, "purchase_restore_failed", {});
      setBillingMessage(message);
      Alert.alert("Restore failed", message);
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  const handleManageSubscription = async () => {
    track(posthog, "subscription_manage_opened", {
      source: "settings_plan_usage",
    });
    try {
      await WebBrowser.openBrowserAsync(APP_STORE_SUBSCRIPTIONS_URL);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "settings", action: "manage_subscription", platform: "ios" },
      });
      Alert.alert(
        "Could not open subscriptions",
        "Open the App Store app, tap your account, then choose Subscriptions.",
      );
    }
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

          <HouseholdCard
            household={household}
            members={members ?? []}
            canManageMembers={canManageMembers}
            onShareInvite={() => void shareHouseholdInvite()}
            onResendInvite={(member) => void handleResendInvite(member)}
            resendingInviteProfileId={resendingInviteProfileId}
          />

          <EaterProfilesCard
            members={members ?? []}
            canManageMembers={canManageMembers}
            showForm={showEaterForm}
            eaterName={eaterName}
            eaterEmail={eaterEmail}
            eaterAge={eaterAge}
            eaterIsChild={eaterIsChild}
            eaterDietaryInput={eaterDietaryInput}
            eaterAllergiesInput={eaterAllergiesInput}
            eaterDislikesInput={eaterDislikesInput}
            isAddingEater={isAddingEater}
            eaterError={eaterError}
            eaterSaved={eaterSaved}
            eaterSavedMessage={eaterSavedMessage}
            onToggleForm={() => {
              setShowEaterForm((current) => !current);
              setEaterError("");
              setEaterSaved(false);
              setEaterSavedMessage("Eater profile added.");
            }}
            onCancel={() => {
              resetEaterForm();
              setShowEaterForm(false);
              setEaterError("");
              setEaterSaved(false);
              setEaterSavedMessage("Eater profile added.");
            }}
            onChangeName={setEaterName}
            onChangeEmail={setEaterEmail}
            onChangeAge={setEaterAge}
            onChangeIsChild={(value) => {
              setEaterIsChild(value);
              if (value) {
                setEaterEmail("");
              }
            }}
            onChangeDietary={setEaterDietaryInput}
            onChangeAllergies={setEaterAllergiesInput}
            onChangeDislikes={setEaterDislikesInput}
            onAddEater={() => void handleAddEater()}
          />

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

          <LearnedPreferencesCard
            learning={learningSummary as LearningSummary | undefined}
            removingDislike={removingDislike}
            onRemoveDislike={(item) => void handleRemoveLearnedDislike(item)}
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
  canManageMembers,
  onShareInvite,
  onResendInvite,
  resendingInviteProfileId,
}: {
  household: Doc<"households"> | null;
  members: Profile[];
  canManageMembers: boolean;
  onShareInvite: () => void;
  onResendInvite: (member: Profile) => void;
  resendingInviteProfileId: string | null;
}) {
  const pendingInviteCount = members.filter(isPendingInviteMember).length;

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

      {household?.inviteCode ? (
        <TouchableOpacity
          onPress={onShareInvite}
          className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 py-3"
          accessibilityRole="button"
          accessibilityLabel="Share household invite"
        >
          <Ionicons name="share-outline" size={17} color="#248f58" />
          <Text className="font-semibold text-primary">
            Share Household Invite
          </Text>
        </TouchableOpacity>
      ) : null}

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

      {pendingInviteCount > 0 ? (
        <View className="mb-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5">
          <Text className="text-sm font-semibold text-foreground">
            {pendingInviteCount} adult invite
            {pendingInviteCount === 1 ? "" : "s"} pending
          </Text>
          <Text className="mt-1 text-xs leading-4 text-muted-foreground">
            Pending adults have not joined the shared household yet. You can resend their invite email below.
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        {members.map((member) => {
          const pendingInvite = isPendingInviteMember(member);
          const isResendingInvite = resendingInviteProfileId === member._id;

          return (
            <View key={member._id} className="rounded-xl bg-muted p-3">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-card">
                  <Text className="font-bold text-foreground">
                    {member.name[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">
                    {member.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {member.email || "Managed eater profile"}
                  </Text>
                  {pendingInvite ? (
                    <Text className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                      Pending invite
                    </Text>
                  ) : null}
                </View>
                <View className="rounded-full bg-card px-2 py-1">
                  <Text className="text-xs font-semibold capitalize text-muted-foreground">
                    {member.isChild ? "child" : member.role}
                  </Text>
                </View>
              </View>
              {member.allergies.length > 0 || member.dislikes.length > 0 ? (
                <View className="mt-3 gap-2">
                  {member.allergies.length > 0 ? (
                    <MemberSafetyRow
                      icon="medical-outline"
                      label="Allergies"
                      values={member.allergies}
                    />
                  ) : null}
                  {member.dislikes.length > 0 ? (
                    <MemberSafetyRow
                      icon="close-circle-outline"
                      label="Dislikes"
                      values={member.dislikes}
                    />
                  ) : null}
                </View>
              ) : null}

              {pendingInvite ? (
                <View className="mt-3 rounded-xl border border-primary/20 bg-card px-3 py-3">
                  <View className="flex-row items-start gap-2">
                    <Ionicons
                      name="mail-unread-outline"
                      size={16}
                      color="#248f58"
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">
                        Waiting for this adult to join
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                        FamilyPlate will attach this member to the shared
                        household once they sign in with {member.email}.
                      </Text>
                    </View>
                  </View>

                  {canManageMembers ? (
                    <TouchableOpacity
                      onPress={() => onResendInvite(member)}
                      disabled={isResendingInvite}
                      className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 py-2.5"
                      style={{ opacity: isResendingInvite ? 0.55 : 1 }}
                    >
                      {isResendingInvite ? (
                        <ActivityIndicator color="#248f58" />
                      ) : (
                        <Ionicons
                          name="paper-plane-outline"
                          size={16}
                          color="#248f58"
                        />
                      )}
                      <Text className="font-semibold text-primary">
                        {isResendingInvite
                          ? "Sending invite..."
                          : "Resend invite email"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MemberSafetyRow({
  icon,
  label,
  values,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  values: string[];
}) {
  return (
    <View className="flex-row items-start gap-2">
      <Ionicons name={icon} size={14} color="#686158" />
      <Text className="text-xs font-semibold text-muted-foreground">
        {label}:
      </Text>
      <Text className="flex-1 text-xs text-muted-foreground">
        {values.join(", ")}
      </Text>
    </View>
  );
}

function EaterProfilesCard({
  members,
  canManageMembers,
  showForm,
  eaterName,
  eaterEmail,
  eaterAge,
  eaterIsChild,
  eaterDietaryInput,
  eaterAllergiesInput,
  eaterDislikesInput,
  isAddingEater,
  eaterError,
  eaterSaved,
  eaterSavedMessage,
  onToggleForm,
  onCancel,
  onChangeName,
  onChangeEmail,
  onChangeAge,
  onChangeIsChild,
  onChangeDietary,
  onChangeAllergies,
  onChangeDislikes,
  onAddEater,
}: {
  members: Profile[];
  canManageMembers: boolean;
  showForm: boolean;
  eaterName: string;
  eaterEmail: string;
  eaterAge: string;
  eaterIsChild: boolean;
  eaterDietaryInput: string;
  eaterAllergiesInput: string;
  eaterDislikesInput: string;
  isAddingEater: boolean;
  eaterError: string;
  eaterSaved: boolean;
  eaterSavedMessage: string;
  onToggleForm: () => void;
  onCancel: () => void;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeAge: (value: string) => void;
  onChangeIsChild: (value: boolean) => void;
  onChangeDietary: (value: string) => void;
  onChangeAllergies: (value: string) => void;
  onChangeDislikes: (value: string) => void;
  onAddEater: () => void;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name="people-outline" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Eater Profiles
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Add kids or managed adults so planning can target the whole family,
            just you, or selected people.
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-xl bg-muted p-3">
        <Text className="text-sm font-semibold text-foreground">
          {members.length} eater{members.length === 1 ? "" : "s"} available
        </Text>
        <Text className="mt-1 text-xs leading-4 text-muted-foreground">
          Allergies are hard safety rules. Dislikes are avoided when that eater
          is selected for a meal plan.
        </Text>
      </View>

      {eaterSaved ? (
        <View className="mb-3 flex-row items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3">
          <Ionicons name="checkmark-circle" size={18} color="#248f58" />
          <Text className="flex-1 text-sm leading-5 text-primary">
            {eaterSavedMessage}
          </Text>
        </View>
      ) : null}

      {eaterError ? (
        <View className="mb-3 flex-row items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
          <Ionicons name="alert-circle" size={18} color="#c2410c" />
          <Text className="flex-1 text-sm leading-5 text-destructive">
            {eaterError}
          </Text>
        </View>
      ) : null}

      {!canManageMembers ? (
        <View className="rounded-xl bg-muted p-3">
          <Text className="text-sm leading-5 text-muted-foreground">
            Ask a household admin to add or update eater profiles.
          </Text>
        </View>
      ) : showForm ? (
        <View className="gap-3">
          <View>
            <Text className="mb-2 text-sm font-bold text-foreground">
              Name
            </Text>
            <TextInput
              value={eaterName}
              onChangeText={onChangeName}
              placeholder="Avery"
              placeholderTextColor="#9a9489"
              className="rounded-xl bg-muted p-3 text-base text-foreground"
            />
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => onChangeIsChild(true)}
              className={`flex-1 rounded-xl border p-3 ${
                eaterIsChild ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  eaterIsChild ? "text-primary" : "text-foreground"
                }`}
              >
                Kid
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onChangeIsChild(false)}
              className={`flex-1 rounded-xl border p-3 ${
                !eaterIsChild ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  !eaterIsChild ? "text-primary" : "text-foreground"
                }`}
              >
                Adult
              </Text>
            </TouchableOpacity>
          </View>

          {!eaterIsChild ? (
            <View>
              <Text className="mb-2 text-sm font-bold text-foreground">
                Invite email optional
              </Text>
              <TextInput
                value={eaterEmail}
                onChangeText={onChangeEmail}
                placeholder="they@example.com"
                placeholderTextColor="#9a9489"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="rounded-xl bg-muted p-3 text-base text-foreground"
              />
              <Text className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Adult members can get the household invite link by email right after you add them.
              </Text>
            </View>
          ) : null}

          <View>
            <Text className="mb-2 text-sm font-bold text-foreground">
              Age optional
            </Text>
            <TextInput
              value={eaterAge}
              onChangeText={onChangeAge}
              placeholder="8"
              keyboardType="number-pad"
              placeholderTextColor="#9a9489"
              className="rounded-xl bg-muted p-3 text-base text-foreground"
            />
          </View>

          <PreferenceEditor
            label="Dietary preferences"
            value={eaterDietaryInput}
            placeholder="vegetarian, dairy-free"
            onChangeText={onChangeDietary}
          />
          <PreferenceEditor
            label="Allergies"
            value={eaterAllergiesInput}
            placeholder="peanuts, shellfish"
            onChangeText={onChangeAllergies}
          />
          <PreferenceEditor
            label="Dislikes"
            value={eaterDislikesInput}
            placeholder="beef, mushrooms"
            onChangeText={onChangeDislikes}
          />

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onAddEater}
              disabled={isAddingEater}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
              style={{ opacity: isAddingEater ? 0.55 : 1 }}
            >
              {isAddingEater ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="person-add-outline" size={18} color="white" />
              )}
              <Text className="font-semibold text-white">
                {isAddingEater ? "Adding..." : "Add Profile"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isAddingEater}
              className="flex-1 items-center rounded-xl border border-border bg-card py-3"
            >
              <Text className="font-semibold text-foreground">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onToggleForm}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
        >
          <Ionicons name="person-add-outline" size={18} color="white" />
          <Text className="font-semibold text-white">Add eater profile</Text>
        </TouchableOpacity>
      )}
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
  const openUrl = async (url: string) => {
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

          <View className="mb-3 gap-2 rounded-xl bg-muted p-3">
            <PlanBenefit
              icon="calendar-outline"
              label="Unlimited weekly meal plans"
            />
            <PlanBenefit
              icon="people-outline"
              label="Plans for the whole family or selected eater profiles"
            />
            <PlanBenefit
              icon="cart-outline"
              label="Missing ingredients can flow into your grocery list"
            />
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
                      <Text className="mt-0.5 text-[11px] text-white/70">
                        {getPackageSubtitle(pack)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color="white" />
                  </TouchableOpacity>
                );
              })}
              <Text className="mt-1 text-center text-[11px] leading-4 text-muted-foreground">
                Tap a plan to confirm with Apple before you are charged.
              </Text>
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
      <View className="mt-4 rounded-xl bg-muted p-3">
        <Text className="text-center text-[11px] leading-4 text-muted-foreground">
          Family subscriptions renew automatically through Apple unless canceled
          at least 24 hours before renewal.
        </Text>
        <View className="mt-2 flex-row justify-center gap-4">
          <TouchableOpacity onPress={() => void openUrl(TERMS_URL)}>
            <Text className="text-xs font-semibold text-primary">
              Terms of Service
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void openUrl(PRIVACY_URL)}>
            <Text className="text-xs font-semibold text-primary">
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PlanBenefit({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color="#248f58" />
      <Text className="flex-1 text-xs font-semibold leading-4 text-foreground">
        {label}
      </Text>
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

function getPackageSubtitle(pack: RevenueCatPackage) {
  const period = pack.product.subscriptionPeriod;
  if (period === "P1Y" || pack.identifier.toLowerCase().includes("annual")) {
    return "Best for households planning every week";
  }
  if (period === "P1M" || pack.identifier.toLowerCase().includes("month")) {
    return "Flexible month-to-month access";
  }
  return "Unlimited household planning";
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

function LearnedPreferencesCard({
  learning,
  removingDislike,
  onRemoveDislike,
}: {
  learning?: LearningSummary;
  removingDislike: string | null;
  onRemoveDislike: (item: string) => void;
}) {
  const hasLearning =
    learning &&
    (learning.feedbackCount > 0 || learning.removableDislikes.length > 0);

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-4 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name="sparkles-outline" size={22} color="#248f58" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Learned Meal Memory
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Feedback after cooking helps future plans choose dinners your
            household is more likely to repeat.
          </Text>
        </View>
      </View>

      {!learning ? (
        <View className="rounded-xl bg-muted p-3">
          <Text className="text-sm text-muted-foreground">
            Loading meal memory...
          </Text>
        </View>
      ) : hasLearning ? (
        <>
          <LearningSection
            icon="heart-outline"
            label="Family favorites"
            items={learning.favorites}
          />
          <LearningSection
            icon="close-circle-outline"
            label="Avoiding"
            items={learning.avoiding}
            removableItems={learning.removableDislikes}
            removingItem={removingDislike}
            onRemoveItem={onRemoveDislike}
          />
          <LearningSection
            icon="happy-outline"
            label="Kid-approved"
            items={learning.kidApproved}
          />
          <LearningSection
            icon="restaurant-outline"
            label="Great leftovers"
            items={learning.greatLeftovers}
          />
          <LearningSection
            icon="flash-outline"
            label="Too much prep"
            items={learning.tooMuchPrep}
          />
          <LearningSection
            icon="flame-outline"
            label="Too spicy"
            items={learning.tooSpicy}
          />
        </>
      ) : (
        <View className="flex-row items-start gap-2 rounded-xl bg-muted p-3">
          <Ionicons name="restaurant-outline" size={18} color="#248f58" />
          <Text className="flex-1 text-sm leading-5 text-muted-foreground">
            Cook a dinner and complete the quick check-in to start building
            household meal memory.
          </Text>
        </View>
      )}
    </View>
  );
}

function LearningSection({
  icon,
  label,
  items,
  removableItems = [],
  removingItem,
  onRemoveItem,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  items: LearningItem[];
  removableItems?: string[];
  removingItem?: string | null;
  onRemoveItem?: (item: string) => void;
}) {
  if (items.length === 0 && removableItems.length === 0) return null;

  const removableSet = new Set(removableItems);

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name={icon} size={15} color="#248f58" />
        <Text className="text-sm font-bold text-foreground">{label}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <LearningPill
            key={item.label}
            item={item.label}
            count={item.count}
            removable={removableSet.has(item.label)}
            removing={removingItem === item.label}
            onRemove={onRemoveItem}
          />
        ))}
        {removableItems
          .filter((item) => !items.some((learningItem) => learningItem.label === item))
          .map((item) => (
            <LearningPill
              key={item}
              item={item}
              removable
              removing={removingItem === item}
              onRemove={onRemoveItem}
            />
          ))}
      </View>
    </View>
  );
}

function LearningPill({
  item,
  count,
  removable,
  removing,
  onRemove,
}: {
  item: string;
  count?: number;
  removable?: boolean;
  removing?: boolean;
  onRemove?: (item: string) => void;
}) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-muted px-3 py-1.5">
      <Text className="text-sm font-semibold text-muted-foreground">
        {item}
        {count && count > 1 ? ` ${count}x` : ""}
      </Text>
      {removable && onRemove ? (
        <TouchableOpacity
          onPress={() => onRemove(item)}
          disabled={removing}
          className="ml-1 h-5 w-5 items-center justify-center rounded-full bg-card"
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item} from learned dislikes`}
        >
          {removing ? (
            <ActivityIndicator color="#248f58" />
          ) : (
            <Ionicons name="close" size={12} color="#686158" />
          )}
        </TouchableOpacity>
      ) : null}
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
