import { Platform } from "react-native";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const FAMILY_ENTITLEMENT_ID = "family";

let configuredAppUserId: string | null = null;
let purchasesClient: typeof import("react-native-purchases").default | null = null;

export type RevenueCatPackage = PurchasesPackage;

export function isRevenueCatAvailable() {
  return Platform.OS === "ios" && Boolean(REVENUECAT_IOS_API_KEY);
}

async function getPurchasesClient() {
  if (!purchasesClient) {
    const purchasesModule = await import("react-native-purchases");
    purchasesClient = purchasesModule.default;
  }

  return purchasesClient;
}

export async function configureRevenueCat({
  appUserId,
  email,
}: {
  appUserId?: string | null;
  email?: string | null;
}) {
  if (!isRevenueCatAvailable() || !REVENUECAT_IOS_API_KEY) return false;
  if (!appUserId) return false;

  const Purchases = await getPurchasesClient();
  const isConfigured = await Purchases.isConfigured();
  if (!isConfigured) {
    Purchases.configure({
      apiKey: REVENUECAT_IOS_API_KEY,
      appUserID: appUserId,
      automaticDeviceIdentifierCollectionEnabled: false,
    });
    configuredAppUserId = appUserId;
  } else if (configuredAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredAppUserId = appUserId;
  }

  if (email) {
    await Purchases.setEmail(email);
  }

  return true;
}

export async function getFamilyOffering(): Promise<PurchasesOffering | null> {
  const Purchases = await getPurchasesClient();
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export function getFamilyPackages(offering: PurchasesOffering | null) {
  if (!offering) return [];

  return [
    offering.annual,
    offering.monthly,
    ...offering.availablePackages.filter(
      (pack) =>
        pack.identifier !== offering.annual?.identifier &&
        pack.identifier !== offering.monthly?.identifier,
    ),
  ].filter((pack): pack is PurchasesPackage => Boolean(pack));
}

export async function purchaseFamilyPackage(pack: PurchasesPackage) {
  const Purchases = await getPurchasesClient();
  return await Purchases.purchasePackage(pack);
}

export async function restoreFamilyPurchases() {
  const Purchases = await getPurchasesClient();
  return await Purchases.restorePurchases();
}

export function hasFamilyEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[FAMILY_ENTITLEMENT_ID]);
}
