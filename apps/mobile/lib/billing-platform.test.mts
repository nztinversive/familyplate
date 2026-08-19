import assert from "node:assert/strict";
import test from "node:test";
import { getBillingPlatformConfig } from "./billing-platform.ts";

test("Android billing opens the package-scoped Google Play subscription page", () => {
  const billing = getBillingPlatformConfig("android");

  assert.equal(billing.storeName, "Google Play");
  assert.equal(billing.accountName, "Google account");
  assert.equal(
    billing.manageSubscriptionsUrl,
    "https://play.google.com/store/account/subscriptions?package=co.familyplate.app",
  );
  assert.match(billing.subscriptionSettingsDescription, /Google Play/);
});

test("iOS billing retains the App Store subscription destination", () => {
  const billing = getBillingPlatformConfig("ios");

  assert.equal(billing.storeName, "App Store");
  assert.equal(billing.accountName, "Apple ID");
  assert.equal(
    billing.manageSubscriptionsUrl,
    "https://apps.apple.com/account/subscriptions",
  );
});

test("unsupported platforms do not receive a misleading store URL", () => {
  const billing = getBillingPlatformConfig("web");

  assert.equal(billing.manageSubscriptionsUrl, null);
  assert.equal(billing.storeName, "mobile app store");
});
