import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildThirdPartyDeletionHandoffs,
  DELETION_HANDOFF_RETENTION_MS,
} from "./accountDeletion.ts";

test("creates a minimal handoff for every identified provider user", () => {
  const handoffs = buildThirdPartyDeletionHandoffs({
    authId: "user_123",
    revenueCatAppUserId: "rc_current",
    revenueCatOriginalAppUserId: "rc_original",
  });

  assert.deepEqual(handoffs, [
    {
      accountKey: "user_123",
      provider: "posthog",
      externalUserId: "user_123",
    },
    {
      accountKey: "user_123",
      provider: "sentry",
      externalUserId: "user_123",
    },
    {
      accountKey: "user_123",
      provider: "revenuecat",
      externalUserId: "user_123",
    },
    {
      accountKey: "user_123",
      provider: "revenuecat",
      externalUserId: "rc_current",
    },
    {
      accountKey: "user_123",
      provider: "revenuecat",
      externalUserId: "rc_original",
    },
  ]);
  assert.ok(handoffs.every((handoff) => !("email" in handoff)));
});

test("deduplicates RevenueCat aliases and rejects an empty account key", () => {
  const handoffs = buildThirdPartyDeletionHandoffs({
    authId: "user_123",
    revenueCatAppUserId: " user_123 ",
    revenueCatOriginalAppUserId: "user_123",
  });

  assert.equal(
    handoffs.filter((handoff) => handoff.provider === "revenuecat").length,
    1,
  );
  assert.throws(
    () => buildThirdPartyDeletionHandoffs({ authId: "  " }),
    /account identifier is required/,
  );
});

test("retains cleanup handoffs for 90 days", () => {
  assert.equal(DELETION_HANDOFF_RETENTION_MS, 90 * 24 * 60 * 60 * 1_000);
});

test("account deletion covers agent connections for both household paths", async () => {
  const source = await readFile(
    new URL("../mutations/profiles.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /query\("agentConnections"\)[\s\S]*?withIndex\("by_householdId"/,
  );
  assert.match(
    source,
    /query\("agentConnections"\)[\s\S]*?withIndex\("by_profileId"/,
  );
  assert.ok(
    (source.match(/ctx\.db\.delete\(connection\._id\)/g) ?? []).length >= 2,
    "both last-household and remaining-household paths delete agent connections",
  );
});

test("account deletion clears plan-generation reservations in both household paths", async () => {
  const source = await readFile(
    new URL("../mutations/profiles.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /query\("planGenerationReservations"\)[\s\S]*?withIndex\("by_householdId"/,
  );
  assert.match(
    source,
    /query\("planGenerationReservations"\)[\s\S]*?withIndex\("by_authId"/,
  );
  assert.ok(
    (source.match(/ctx\.db\.delete\(reservation\._id\)/g) ?? []).length >= 2,
    "both last-household and remaining-household paths delete reservations",
  );
});
