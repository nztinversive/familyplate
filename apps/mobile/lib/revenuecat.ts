import { Platform } from "react-native";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import {
  clearRevenueCatIdentity,
  syncRevenueCatIdentity,
} from "@/lib/revenuecat-identity";

const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const FAMILY_ENTITLEMENT_ID = "family";

let configuredAppUserId: string | null = null;
let purchasesClient: typeof import("react-native-purchases").default | null = null;
let identityOperation: Promise<unknown> = Promise.resolve();

export type RevenueCatPackage = PurchasesPackage;

function getRevenueCatApiKey() {
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return undefined;
}

export function isRevenueCatAvailable() {
  return Boolean(getRevenueCatApiKey());
}

async function getPurchasesClient() {
  if (!purchasesClient) {
    const purchasesModule = await import("react-native-purchases");
    purchasesClient = purchasesModule.default;
  }

  return purchasesClient;
}

function serializeIdentityOperation<T>(operation: () => Promise<T>) {
  const result = identityOperation.then(operation, operation);
  identityOperation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function configureRevenueCat({
  appUserId,
  email,
}: {
  appUserId?: string | null;
  email?: string | null;
}) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return false;
  if (!appUserId) return false;

  await serializeIdentityOperation(async () => {
    const Purchases = await getPurchasesClient();
    await syncRevenueCatIdentity({
      client: Purchases,
      apiKey,
      appUserId,
      email,
    });
    configuredAppUserId = appUserId;
  });

  return true;
}

export async function resetRevenueCatIdentity() {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    configuredAppUserId = null;
    return false;
  }

  await serializeIdentityOperation(async () => {
    const Purchases = await getPurchasesClient();
    await clearRevenueCatIdentity({ client: Purchases, apiKey });
    configuredAppUserId = null;
  });
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
