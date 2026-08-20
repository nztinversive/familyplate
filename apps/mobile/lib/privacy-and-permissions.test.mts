import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireOperationLock,
  getCameraPermissionAction,
  isSnapGroceriesCloseDisabled,
  releaseOperationLock,
  sanitizeSensitiveRoute,
  shouldResetPostHogIdentity,
  shouldUseCuratedPlanFallback,
} from "./privacy-and-permissions.ts";

test("household invite secrets are removed from routes and URLs", () => {
  assert.equal(
    sanitizeSensitiveRoute("/join/A1B2C3"),
    "/join/[inviteCode]",
  );
  assert.equal(
    sanitizeSensitiveRoute("https://familyplate.co/join/A1B2C3?email=test"),
    "https://familyplate.co/join/[inviteCode]",
  );
  assert.equal(
    sanitizeSensitiveRoute("returnTo=%2Fjoin%2FA1B2C3%3Femail%3Dtest"),
    "returnTo=%2Fjoin%2F%5BinviteCode%5D",
  );
  assert.equal(
    sanitizeSensitiveRoute(
      "returnTo=%2Fjoin%2FA1B2C3%3Femail%3Dguest%40example.com&inviteEmail=guest@example.com",
    ),
    "returnTo=%2Fjoin%2F%5BinviteCode%5D&inviteEmail=[redacted]",
  );
  assert.equal(
    sanitizeSensitiveRoute("next=x%26inviteEmail%3Dguest%40example.com"),
    "next=x%26inviteEmail%3D%5Bredacted%5D",
  );
  assert.equal(sanitizeSensitiveRoute("/(tabs)/plan"), "/(tabs)/plan");
});

test("operation locks reject a second tap before React state updates", () => {
  const lock = { current: false };
  assert.equal(acquireOperationLock(lock), true);
  assert.equal(acquireOperationLock(lock), false);
  releaseOperationLock(lock);
  assert.equal(acquireOperationLock(lock), true);
});

test("camera denial with no remaining prompt opens system settings", () => {
  assert.equal(getCameraPermissionAction(false), "settings");
  assert.equal(getCameraPermissionAction(true), "request");
  assert.equal(getCameraPermissionAction(undefined), "request");
});

test("Snap Groceries cannot close while capture, recognition, or save is active", () => {
  assert.equal(
    isSnapGroceriesCloseDisabled({
      phase: "camera",
      isCapturing: true,
      isAdding: false,
    }),
    true,
  );
  assert.equal(
    isSnapGroceriesCloseDisabled({
      phase: "analyzing",
      isCapturing: false,
      isAdding: false,
    }),
    true,
  );
  assert.equal(
    isSnapGroceriesCloseDisabled({
      phase: "review",
      isCapturing: false,
      isAdding: true,
    }),
    true,
  );
  assert.equal(
    isSnapGroceriesCloseDisabled({
      phase: "camera",
      isCapturing: false,
      isAdding: false,
    }),
    false,
  );
});

test("curated plans run only after an explicit server-side AI failure", () => {
  const unavailable =
    "Unable to generate a dinner plan right now. Please try again.";

  assert.equal(
    shouldUseCuratedPlanFallback({ data: unavailable }),
    true,
  );
  assert.equal(
    shouldUseCuratedPlanFallback(new Error(`Server Error: ${unavailable}`)),
    true,
  );
  assert.equal(
    shouldUseCuratedPlanFallback(
      new Error("Connection lost while action was in flight"),
    ),
    false,
  );
  assert.equal(
    shouldUseCuratedPlanFallback(new Error("Free plan limit reached")),
    false,
  );
});

test("PostHog resets once for anonymous state, sign-out, and account switches", () => {
  assert.equal(shouldResetPostHogIdentity(undefined, null), true);
  assert.equal(shouldResetPostHogIdentity("account-a", null), true);
  assert.equal(shouldResetPostHogIdentity(null, null), false);
  assert.equal(shouldResetPostHogIdentity(undefined, "account-a"), false);
  assert.equal(shouldResetPostHogIdentity(null, "account-a"), false);
  assert.equal(shouldResetPostHogIdentity("account-a", "account-a"), false);
  assert.equal(shouldResetPostHogIdentity("account-a", "account-b"), true);
});
