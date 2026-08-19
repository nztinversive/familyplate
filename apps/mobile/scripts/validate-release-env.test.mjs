import assert from "node:assert/strict";
import test from "node:test";
import { validateReleaseEnv } from "./validate-release-env.mjs";

const common = {
  EXPO_PUBLIC_APP_ENV: "production",
  EXPO_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
  EXPO_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  EXPO_PUBLIC_POSTHOG_KEY: "phc_test",
  EXPO_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
};

test("accepts a complete Android production environment", () => {
  assert.deepEqual(
    validateReleaseEnv({
      env: {
        ...common,
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "goog_test",
      },
      platform: "android",
    }),
    [],
  );
});

test("requires the Android RevenueCat key for Android builds", () => {
  assert.match(
    validateReleaseEnv({ env: common, platform: "android" }).join("\n"),
    /EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is required/,
  );
});

test("does not accept an Apple key in the Android key slot", () => {
  assert.match(
    validateReleaseEnv({
      env: {
        ...common,
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "appl_wrong_store",
      },
      platform: "android",
    }).join("\n"),
    /must start with goog_/,
  );
});

test("skips strict checks outside the production profile", () => {
  assert.deepEqual(
    validateReleaseEnv({ env: {}, platform: "android", production: false }),
    [],
  );
});
