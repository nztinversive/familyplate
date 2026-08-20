export type AiConsentStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const LEGACY_AI_CONSENT_KEY = "familyplate.aiConsent.v1";
const AI_CONSENT_KEY_PREFIX = "familyplate.aiConsent.v2";

export function getAiConsentStorageKey(authId: string | null | undefined) {
  const normalizedAuthId = authId?.trim();
  if (!normalizedAuthId) return null;
  return `${AI_CONSENT_KEY_PREFIX}:${encodeURIComponent(normalizedAuthId)}`;
}

export async function hasStoredAiConsent(
  storage: AiConsentStorage,
  authId: string | null | undefined,
) {
  const key = getAiConsentStorageKey(authId);
  if (!key) return false;

  try {
    return (await storage.getItem(key)) === "accepted";
  } catch {
    return false;
  }
}

export async function storeAiConsent(
  storage: AiConsentStorage,
  authId: string | null | undefined,
) {
  const key = getAiConsentStorageKey(authId);
  if (!key) return false;

  try {
    await storage.setItem(key, "accepted");
    return true;
  } catch {
    return false;
  }
}

export async function clearStoredAiConsent(
  storage: AiConsentStorage,
  authId: string | null | undefined,
) {
  const key = getAiConsentStorageKey(authId);
  const keys = key ? [key, LEGACY_AI_CONSENT_KEY] : [LEGACY_AI_CONSENT_KEY];
  try {
    const results = await Promise.allSettled(
      keys.map((storageKey) => storage.removeItem(storageKey)),
    );
    return results.every((result) => result.status === "fulfilled");
  } catch {
    return false;
  }
}
