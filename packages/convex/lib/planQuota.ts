export const FREE_PLAN_LIMIT = 2;
export const PLAN_USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;
export const PLAN_RESERVATION_TTL_MS = 30 * 60 * 1_000;

export function getCompletedPlanUsage({
  now,
  resetAt,
  completed,
}: {
  now: number;
  resetAt?: number;
  completed?: number;
}) {
  const windowExpired =
    resetAt === undefined || now - resetAt >= PLAN_USAGE_WINDOW_MS;

  return {
    plansUsed: windowExpired ? 0 : Math.max(0, Math.floor(completed ?? 0)),
    windowStartedAt: windowExpired ? now : resetAt,
  };
}

export function countActivePlanReservations(
  reservations: Array<{ expiresAt: number; countsTowardQuota: boolean }>,
  now: number,
) {
  return reservations.filter(
    (reservation) =>
      reservation.countsTowardQuota && reservation.expiresAt > now,
  ).length;
}

export function canReserveFreePlan({
  plansUsed,
  activeReservations,
}: {
  plansUsed: number;
  activeReservations: number;
}) {
  return plansUsed + activeReservations < FREE_PLAN_LIMIT;
}

export function isCompleteWeeklyPlan(meals: readonly unknown[]) {
  return meals.length === 7;
}
