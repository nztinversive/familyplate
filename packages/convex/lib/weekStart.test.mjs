import assert from "node:assert/strict";
import test from "node:test";
import { resolveWeekStartDate } from "./weekStart.ts";

test("an explicit device-local Monday wins at the UTC week boundary", () => {
  const sundayEveningCentral = new Date("2026-08-24T01:00:00.000Z");

  assert.equal(
    resolveWeekStartDate("2026-08-17", sundayEveningCentral).weekStartDate,
    "2026-08-17",
  );
  assert.equal(
    resolveWeekStartDate(undefined, sundayEveningCentral).weekStartDate,
    "2026-08-24",
  );
});

test("weekly plan dates must be real Mondays", () => {
  assert.throws(
    () => resolveWeekStartDate("2026-08-18"),
    /valid Monday/,
  );
  assert.throws(
    () => resolveWeekStartDate("2026-02-30"),
    /valid Monday/,
  );
});
