import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLocalDate,
  getCurrentWeekStartDate,
  getDisplayedWeekStartDate,
  getStartOfWeek,
} from "./week.ts";

test("week dates use Monday in local time", () => {
  const wednesday = new Date(2026, 7, 19, 12);
  assert.equal(formatLocalDate(getStartOfWeek(wednesday)), "2026-08-17");
  assert.equal(getCurrentWeekStartDate(wednesday), "2026-08-17");
});

test("Sunday remains in the preceding Monday week", () => {
  const sunday = new Date(2026, 7, 23, 12);
  assert.equal(getCurrentWeekStartDate(sunday), "2026-08-17");
});

test("an empty current week keeps the selected date instead of appearing to load", () => {
  assert.equal(
    getDisplayedWeekStartDate(null, "2026-08-17"),
    "2026-08-17",
  );
  assert.equal(
    getDisplayedWeekStartDate("2026-08-18", "2026-08-17"),
    "2026-08-18",
  );
});
