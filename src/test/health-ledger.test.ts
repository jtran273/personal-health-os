import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRawHealthEventStore } from "@/lib/health/ledger";
import { buildNormalizedDailyLedger, calculateWeightTrendKgPerWeek } from "@/lib/health/normalization";
import { validateMealInput, validateWeightInput, ValidationError } from "@/lib/health/validation";
import { createOpenClawMealEvent, createOpenClawWeightEvent } from "@/lib/providers/openclaw";
import { buildDailyLedgerResponse } from "../../app/api/health/daily-ledger/route";
import { buildMealsResponse, ingestMealRequest } from "../../app/api/health/meals/route";
import type { RawHealthEvent } from "@/lib/health";

test("in-memory raw event store dedupes deterministic source events", async () => {
  const store = new InMemoryRawHealthEventStore();
  const input = {
    text: "eggs and toast",
    loggedAt: "2026-05-21T15:00:00.000Z",
    externalId: "openclaw-message-1"
  };
  const first = createOpenClawMealEvent(input);
  const duplicate = createOpenClawMealEvent(input);

  const result = await store.insertMany([first, duplicate]);
  const events = await store.list();

  assert.equal(first.id, duplicate.id);
  assert.deepEqual(result, { inserted: 1, skipped: 1, ids: [first.id, duplicate.id] });
  assert.equal(events.length, 1);
});

test("normalizes Oura, meal, weight, trend, and body mode signals", () => {
  const events: RawHealthEvent[] = [
    {
      id: "oura-sleep",
      source: "oura",
      type: "daily_sleep",
      observedAt: "2026-05-21T00:00:00.000Z",
      receivedAt: "2026-05-21T08:00:00.000Z",
      externalId: "sleep-1",
      payload: {
        day: "2026-05-21",
        score: 68,
        total_sleep_duration: 21_600,
        average_hrv: 41,
        lowest_heart_rate: 52
      }
    },
    {
      id: "oura-readiness",
      source: "oura",
      type: "daily_readiness",
      observedAt: "2026-05-21T00:00:00.000Z",
      receivedAt: "2026-05-21T08:00:00.000Z",
      externalId: "ready-1",
      payload: {
        day: "2026-05-21",
        score: 52,
        temperature_deviation: 0.8
      }
    },
    createOpenClawMealEvent({
      text: "rice bowl",
      loggedAt: "2026-05-21T19:00:00.000Z"
    }),
    createOpenClawWeightEvent({
      weightKg: 82,
      loggedAt: "2026-05-14T14:00:00.000Z"
    }),
    createOpenClawWeightEvent({
      weightKg: 81,
      loggedAt: "2026-05-21T14:00:00.000Z"
    })
  ];

  const result = buildNormalizedDailyLedger({
    date: "2026-05-21",
    events,
    generatedAt: "2026-05-21T20:00:00.000Z"
  });

  assert.equal(result.ledger.sleepHours?.value, 6);
  assert.equal(result.ledger.readinessScore?.value, 52);
  assert.equal(result.ledger.temperatureDeviationC?.value, 0.8);
  assert.equal(result.ledger.weightKg?.value, 81);
  assert.equal(result.ledger.weightTrendKgPerWeek?.value, -1);
  assert.equal(result.ledger.meals[0].text, "rice bowl");
  assert.equal(result.ledger.bodyMode, "red");
  assert.ok(result.bodyModeReasons.includes("low readiness"));
});

test("calculates no weight trend with fewer than two points", () => {
  assert.equal(calculateWeightTrendKgPerWeek([]), undefined);
});

test("route builder functions return normalized summaries without raw payloads", async () => {
  const store = new InMemoryRawHealthEventStore();
  const post = await ingestMealRequest(store, {
    text: "salmon and potatoes",
    loggedAt: "2026-05-21T18:30:00.000Z"
  });

  const meals = await buildMealsResponse(store, "2026-05-21");
  const daily = await buildDailyLedgerResponse(store, "2026-05-21");

  assert.equal(post.accepted, true);
  assert.equal(meals.meals.length, 1);
  assert.equal(daily.ledger.meals[0].text, "salmon and potatoes");
  assert.equal("payload" in daily.ledger.meals[0], false);
});

test("validators reject malformed meal, weight, and date inputs", () => {
  assert.throws(() => validateMealInput({ loggedAt: "2026-05-21T10:00:00.000Z" }), ValidationError);
  assert.throws(() => validateWeightInput({ weightKg: -1 }), ValidationError);
  assert.doesNotThrow(() => validateWeightInput({ weightKg: 81.5, loggedAt: "2026-05-21T10:00:00.000Z" }));
});
