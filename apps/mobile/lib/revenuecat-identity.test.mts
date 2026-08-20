import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRevenueCatIdentity,
  syncRevenueCatIdentity,
  type RevenueCatIdentityClient,
} from "./revenuecat-identity.ts";

function createClient({
  configured = false,
  appUserId = "account-a",
  anonymous = false,
} = {}) {
  const calls: string[] = [];
  let isConfigured = configured;
  let currentAppUserId = appUserId;
  let isAnonymous = anonymous;
  const client: RevenueCatIdentityClient = {
    async isConfigured() {
      return isConfigured;
    },
    configure(options) {
      calls.push(
        `configure:${options.apiKey}:${options.appUserID ?? "anonymous"}`,
      );
      isConfigured = true;
      if (options.appUserID) {
        currentAppUserId = options.appUserID;
        isAnonymous = false;
      }
    },
    async getAppUserID() {
      return currentAppUserId;
    },
    async isAnonymous() {
      return isAnonymous;
    },
    async logIn(nextAppUserId) {
      calls.push(`login:${nextAppUserId}`);
      currentAppUserId = nextAppUserId;
      isAnonymous = false;
      return {};
    },
    async logOut() {
      calls.push("logout");
      currentAppUserId = "$RCAnonymousID:device";
      isAnonymous = true;
      return {};
    },
    async setEmail(email) {
      calls.push(`email:${email ?? "null"}`);
    },
  };
  return { client, calls };
}

test("first configuration uses the known custom account without an anonymous ID", async () => {
  const { client, calls } = createClient();
  await syncRevenueCatIdentity({
    client,
    apiKey: "goog_public",
    appUserId: "account-b",
    email: "b@example.com",
  });
  assert.deepEqual(calls, [
    "configure:goog_public:account-b",
    "email:b@example.com",
  ]);
});

test("an authenticated account switch uses direct login without an anonymous merge", async () => {
  const { client, calls } = createClient({ configured: true });
  await syncRevenueCatIdentity({
    client,
    apiKey: "goog_public",
    appUserId: "account-b",
    email: "b@example.com",
  });
  assert.deepEqual(calls, ["login:account-b", "email:b@example.com"]);
});

test("the same account is not logged out or re-aliased", async () => {
  const { client, calls } = createClient({ configured: true });
  await syncRevenueCatIdentity({
    client,
    apiKey: "goog_public",
    appUserId: "account-a",
  });
  assert.deepEqual(calls, ["email:null"]);
});

test("sign-out clears the native account and cached email", async () => {
  const { client, calls } = createClient({ configured: true });
  await clearRevenueCatIdentity({ client, apiKey: "goog_public" });
  assert.deepEqual(calls, ["logout", "email:null"]);
});
