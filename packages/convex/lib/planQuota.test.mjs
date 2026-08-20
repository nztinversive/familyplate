import assert from "node:assert/strict";
import test from "node:test";
import {
  canReserveFreePlan,
  countActivePlanReservations,
  FREE_PLAN_LIMIT,
  getCompletedPlanUsage,
  isCompleteWeeklyPlan,
  PLAN_USAGE_WINDOW_MS,
} from "./planQuota.ts";

test("resets completed plan usage after the rolling window", () => {
  const now = 2 * PLAN_USAGE_WINDOW_MS;

  assert.deepEqual(
    getCompletedPlanUsage({
      now,
      resetAt: now - PLAN_USAGE_WINDOW_MS,
      completed: 2,
    }),
    { plansUsed: 0, windowStartedAt: now },
  );
});

test("counts only live free-tier reservations", () => {
  const now = 10_000;
  assert.equal(
    countActivePlanReservations(
      [
        { expiresAt: now + 1, countsTowardQuota: true },
        { expiresAt: now, countsTowardQuota: true },
        { expiresAt: now + 1, countsTowardQuota: false },
      ],
      now,
    ),
    1,
  );
});

test("completed and in-flight plans share the same free-plan ceiling", () => {
  assert.equal(FREE_PLAN_LIMIT, 2);
  assert.equal(
    canReserveFreePlan({ plansUsed: 1, activeReservations: 0 }),
    true,
  );
  assert.equal(
    canReserveFreePlan({ plansUsed: 1, activeReservations: 1 }),
    false,
  );
  assert.equal(
    canReserveFreePlan({ plansUsed: 2, activeReservations: 0 }),
    false,
  );
});

test("requires a complete seven-dinner fallback before charging quota", () => {
  assert.equal(isCompleteWeeklyPlan(new Array(6)), false);
  assert.equal(isCompleteWeeklyPlan(new Array(7)), true);
  assert.equal(isCompleteWeeklyPlan(new Array(8)), false);
});
