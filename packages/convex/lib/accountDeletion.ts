export const DELETION_HANDOFF_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

export type DeletionHandoffProvider = "posthog" | "sentry" | "revenuecat";

export type DeletionHandoff = {
  accountKey: string;
  provider: DeletionHandoffProvider;
  externalUserId: string;
};

function normalizeIdentifier(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function buildThirdPartyDeletionHandoffs({
  authId,
  revenueCatAppUserId,
  revenueCatOriginalAppUserId,
}: {
  authId: string;
  revenueCatAppUserId?: string;
  revenueCatOriginalAppUserId?: string;
}): DeletionHandoff[] {
  const accountKey = authId.trim();
  if (!accountKey) {
    throw new Error("An account identifier is required for deletion handoff.");
  }

  const handoffs: DeletionHandoff[] = [
    { accountKey, provider: "posthog", externalUserId: accountKey },
    { accountKey, provider: "sentry", externalUserId: accountKey },
  ];

  const revenueCatIds = new Set(
    [
      accountKey,
      normalizeIdentifier(revenueCatAppUserId),
      normalizeIdentifier(revenueCatOriginalAppUserId),
    ].filter((value): value is string => Boolean(value)),
  );

  for (const externalUserId of revenueCatIds) {
    handoffs.push({
      accountKey,
      provider: "revenuecat",
      externalUserId,
    });
  }

  return handoffs;
}
