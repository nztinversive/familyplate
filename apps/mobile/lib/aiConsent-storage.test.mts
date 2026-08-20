import assert from "node:assert/strict";
import test from "node:test";
import {
  clearStoredAiConsent,
  getAiConsentStorageKey,
  hasStoredAiConsent,
  storeAiConsent,
  type AiConsentStorage,
} from "./aiConsent-storage.ts";

function createMemoryStorage(): AiConsentStorage {
  const values = new Map<string, string>();
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

test("AI consent is isolated by authenticated account", async () => {
  const storage = createMemoryStorage();
  assert.notEqual(
    getAiConsentStorageKey("account-a"),
    getAiConsentStorageKey("account-b"),
  );
  assert.equal(await storeAiConsent(storage, "account-a"), true);
  assert.equal(await hasStoredAiConsent(storage, "account-a"), true);
  assert.equal(await hasStoredAiConsent(storage, "account-b"), false);
  assert.equal(await hasStoredAiConsent(storage, null), false);
});

test("storage failures deny consent instead of hanging or throwing", async () => {
  const failingStorage: AiConsentStorage = {
    async getItem() {
      throw new Error("read failed");
    },
    async setItem() {
      throw new Error("write failed");
    },
    async removeItem() {
      throw new Error("remove failed");
    },
  };

  assert.equal(await hasStoredAiConsent(failingStorage, "account-a"), false);
  assert.equal(await storeAiConsent(failingStorage, "account-a"), false);
  assert.equal(await clearStoredAiConsent(failingStorage, "account-a"), false);
});
