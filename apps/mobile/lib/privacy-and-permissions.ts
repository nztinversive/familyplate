export type CameraPermissionAction = "request" | "settings";
export type OperationLock = { current: boolean };

const CURATED_PLAN_FALLBACK_ERROR =
  "Unable to generate a dinner plan right now. Please try again.";

export function sanitizeSensitiveRoute(value: string) {
  return value
    .replace(
      /(%2fjoin%2f)[^&\s]+/gi,
      "$1%5BinviteCode%5D",
    )
    .replace(
      /(\/join\/)[^/?#\s]+(?:[?#][^\s]*)?/gi,
      "$1[inviteCode]",
    )
    .replace(
      /(^|[?&])inviteEmail=[^&#\s]*/gi,
      "$1inviteEmail=[redacted]",
    )
    .replace(/(inviteemail%3d)[^&\s]*/gi, "$1%5Bredacted%5D");
}

export function acquireOperationLock(lock: OperationLock) {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseOperationLock(lock: OperationLock) {
  lock.current = false;
}

export function getCameraPermissionAction(
  canAskAgain: boolean | undefined,
): CameraPermissionAction {
  return canAskAgain === false ? "settings" : "request";
}

export function isSnapGroceriesCloseDisabled({
  phase,
  isCapturing,
  isAdding,
}: {
  phase: "camera" | "analyzing" | "review";
  isCapturing: boolean;
  isAdding: boolean;
}) {
  return phase === "analyzing" || isCapturing || isAdding;
}

export function shouldUseCuratedPlanFallback(error: unknown) {
  const data =
    typeof error === "object" && error !== null && "data" in error
      ? (error as { data?: unknown }).data
      : undefined;

  if (data === CURATED_PLAN_FALLBACK_ERROR) return true;

  return (
    error instanceof Error &&
    error.message.includes(CURATED_PLAN_FALLBACK_ERROR)
  );
}

export function shouldResetPostHogIdentity(
  previousAuthId: string | null | undefined,
  nextAuthId: string | null,
) {
  if (nextAuthId === null) return previousAuthId !== null;
  return typeof previousAuthId === "string" && previousAuthId !== nextAuthId;
}
