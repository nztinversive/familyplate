import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiContentSnapshot,
  MAX_AI_CONTENT_SNAPSHOT_LENGTH,
  MAX_AI_REPORT_DETAILS_LENGTH,
  normalizeAiReportDetails,
} from "./aiContentReports.ts";

test("normalizes optional AI report details", () => {
  assert.equal(normalizeAiReportDetails("  allergy conflict  "), "allergy conflict");
  assert.equal(normalizeAiReportDetails("   "), undefined);
  assert.equal(normalizeAiReportDetails(undefined), undefined);
});

test("rejects oversized AI report details", () => {
  assert.throws(
    () => normalizeAiReportDetails("x".repeat(MAX_AI_REPORT_DETAILS_LENGTH + 1)),
    /characters or fewer/,
  );
});

test("captures bounded generated content without household profile data", () => {
  const snapshot = buildAiContentSnapshot({
    title: "Weeknight Soup",
    description: "A generated dinner idea.",
    ingredients: [
      { name: "beans", quantity: 2, unit: "cups", inPantry: true },
      { name: "broth", quantity: 4, unit: "cups", inPantry: false },
    ],
    instructions: ["Simmer safely."],
  });

  assert.ok(snapshot.includes("Weeknight Soup"));
  assert.ok(snapshot.includes("Simmer safely"));
  assert.ok(snapshot.includes("2 cups beans"));
  assert.ok(snapshot.includes("4 cups broth"));
  assert.ok(snapshot.length <= MAX_AI_CONTENT_SNAPSHOT_LENGTH);
  assert.equal(snapshot.includes("in pantry"), false);
  assert.equal(snapshot.includes("missing"), false);
});
