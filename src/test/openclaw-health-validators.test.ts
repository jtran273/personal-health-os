import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAndNormalizeMealIngestion,
  validateAndNormalizeWeightIngestion
} from "@/lib/openclaw/health";

const fixedNow = new Date("2026-05-21T15:30:00.000Z");

test("accepts a bounded OpenClaw meal ingestion event", () => {
  const result = validateAndNormalizeMealIngestion(
    {
      text: "chicken bowl",
      loggedAt: "2026-05-21T12:00:00-07:00",
      estimatedCalories: 650,
      estimatedProteinGrams: 42
    },
    fixedNow
  );

  assert.equal(result.ok, true);
  assert.equal(result.value?.eventType, "meal_ingestion");
  assert.equal(result.value?.meal.source, "openclaw");
  assert.equal(result.value?.meal.text, "chicken bowl");
  assert.equal(result.value?.meal.loggedAt, "2026-05-21T19:00:00.000Z");
  assert.equal(result.value?.meal.estimatedCalories?.confidence, "medium");
});

test("rejects empty or unbounded meal input", () => {
  const empty = validateAndNormalizeMealIngestion({}, fixedNow);
  const nullBody = validateAndNormalizeMealIngestion(null, fixedNow);
  const impossibleCalories = validateAndNormalizeMealIngestion(
    { text: "meal", estimatedCalories: 9000 },
    fixedNow
  );

  assert.equal(empty.ok, false);
  assert.match(empty.errors?.join(" ") ?? "", /text or photoUrl/);
  assert.equal(nullBody.ok, false);
  assert.match(nullBody.errors?.join(" ") ?? "", /text or photoUrl/);
  assert.equal(impossibleCalories.ok, false);
  assert.match(impossibleCalories.errors?.join(" ") ?? "", /estimatedCalories/);
});

test("accepts a bounded OpenClaw weight ingestion event", () => {
  const result = validateAndNormalizeWeightIngestion(
    {
      weightKg: 82.4,
      loggedAt: "2026-05-21T07:10:00-07:00"
    },
    fixedNow
  );

  assert.equal(result.ok, true);
  assert.equal(result.value?.eventType, "weight_ingestion");
  assert.equal(result.value?.event.source, "openclaw");
  assert.equal(result.value?.event.type, "weight");
  assert.deepEqual(result.value?.event.payload, { weightKg: 82.4 });
});

test("rejects missing or unsafe weight input", () => {
  const missing = validateAndNormalizeWeightIngestion({}, fixedNow);
  const impossible = validateAndNormalizeWeightIngestion({ weightKg: 500 }, fixedNow);

  assert.equal(missing.ok, false);
  assert.match(missing.errors?.join(" ") ?? "", /weightKg is required/);
  assert.equal(impossible.ok, false);
  assert.match(impossible.errors?.join(" ") ?? "", /between 35 and 250/);
});
