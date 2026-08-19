export type BillingPlatformConfig = {
  storeName: string;
  accountName: string;
  manageSubscriptionsUrl: string | null;
  subscriptionSettingsDescription: string;
};

const IOS_BILLING: BillingPlatformConfig = {
  storeName: "App Store",
  accountName: "Apple ID",
  manageSubscriptionsUrl: "https://apps.apple.com/account/subscriptions",
  subscriptionSettingsDescription:
    "Open the App Store app, tap your account, then choose Subscriptions.",
};

const ANDROID_BILLING: BillingPlatformConfig = {
  storeName: "Google Play",
  accountName: "Google account",
  manageSubscriptionsUrl:
    "https://play.google.com/store/account/subscriptions?package=co.familyplate.app",
  subscriptionSettingsDescription:
    "Open Google Play, tap your profile, then choose Payments & subscriptions.",
};

const UNSUPPORTED_BILLING: BillingPlatformConfig = {
  storeName: "mobile app store",
  accountName: "store account",
  manageSubscriptionsUrl: null,
  subscriptionSettingsDescription:
    "Open FamilyPlate on iOS or Android to manage a subscription.",
};

export function getBillingPlatformConfig(
  platform: string,
): BillingPlatformConfig {
  if (platform === "android") return ANDROID_BILLING;
  if (platform === "ios") return IOS_BILLING;
  return UNSUPPORTED_BILLING;
}
