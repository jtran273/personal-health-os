import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRawHealthEventStore } from "@/lib/health/ledger";
import { MealLogService, createKnownFoodFromCorrection } from "@/lib/health/meals";
import { buildNormalizedDailyLedger } from "@/lib/health/normalization";
import { ingestMealRequest } from "../../app/api/health/meals/route";
import type { RawHealthEvent } from "@/lib/health";

test("meal estimation does not invent values for unmatched text or photos", () => {
  const service = new MealLogService();
  const result = service.estimateMacros({ text: "some leftovers", photoUrl: "https://example.com/meal.jpg" });

  assert.equal(result.source, "unknown");
  assert.equal(result.confidence, "unknown");
  assert.equal(result.estimatedCalories, undefined);
  assert.equal(result.estimatedProteinGrams, undefined);
  assert.match(result.notes.join(" "), /no image macros were inferred/i);
});

test("known-food correction can be saved and reused with source attribution", async () => {
  const store = new InMemoryRawHealthEventStore();

  const corrected = await ingestMealRequest(store, {
    text: "chicken rice bowl",
    loggedAt: "2026-05-21T18:00:00.000Z",
    correctedCalories: 720,
    correctedProteinGrams: 48,
    saveAsKnownFood: true,
    knownFoodName: "Chicken rice bowl"
  });

  assert.equal(corrected.accepted, true);
  assert.equal(corrected.meal?.estimatedCalories?.value, 720);
  assert.equal(corrected.meal?.estimatedCalories?.source, "manual_entry");
  assert.equal(corrected.knownFood?.name, "Chicken rice bowl");

  const reused = await ingestMealRequest(store, {
    text: "had another chicken rice bowl",
    loggedAt: "2026-05-22T18:00:00.000Z"
  });

  assert.equal(reused.meal?.estimatedCalories?.value, 720);
  assert.equal(reused.meal?.estimatedCalories?.source, "known_food");
  assert.equal(reused.meal?.estimatedCalories?.confidence, "medium");
  assert.equal(reused.meal?.entrySource, "known_food");
  assert.equal(reused.meal?.knownFoods?.[0].name, "Chicken rice bowl");
});

test("ledger keeps meal calories and recomputes bounded estimated deficit", () => {
  const meal = {
    id: "meal-1",
    source: "openclaw",
    type: "openclaw_meal",
    observedAt: "2026-05-21T18:00:00.000Z",
    receivedAt: "2026-05-21T18:00:00.000Z",
    payload: {
      text: "known lunch",
      estimatedCalories: 600,
      estimatedCaloriesSource: "known_food",
      estimatedProteinGrams: 35,
      estimatedProteinGramsSource: "known_food",
      estimationConfidence: "medium",
      entrySource: "known_food"
    }
  } satisfies RawHealthEvent;
  const activity = {
    id: "oura-activity",
    source: "oura",
    type: "daily_activity",
    observedAt: "2026-05-21T00:00:00.000Z",
    receivedAt: "2026-05-21T08:00:00.000Z",
    payload: { day: "2026-05-21", active_calories: 950 }
  } satisfies RawHealthEvent;

  const result = buildNormalizedDailyLedger({ date: "2026-05-21", events: [meal, activity] });

  assert.equal(result.ledger.meals[0].estimatedCalories?.source, "known_food");
  assert.equal(result.ledger.meals[0].estimatedProteinGrams?.value, 35);
  assert.equal(result.ledger.estimatedDeficitCalories?.value, 350);
  assert.equal(result.ledger.estimatedDeficitCalories?.confidence, "low");
});

test("known food ids are deterministic for corrected meal reuse", () => {
  const first = createKnownFoodFromCorrection({ name: "Egg bowl", calories: 500, proteinGrams: 30 });
  const second = createKnownFoodFromCorrection({ name: "Egg bowl", calories: 520, proteinGrams: 32 });

  assert.equal(first.id, second.id);
});
