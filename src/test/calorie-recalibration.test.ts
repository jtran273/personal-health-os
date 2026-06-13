import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRawHealthEventStore } from "@/lib/health/ledger";
import type { RawHealthEvent } from "@/lib/health";
import { buildHealthCalibrationResponse } from "../../app/api/health/calibration/route";

test("weekly calibration holds when predicted and observed deficit match", async () => {
  const store = new InMemoryRawHealthEventStore();
  await store.insertMany([
    ...dailyDeficitEvents("2026-05-14", "2026-05-14", 1000, 100, 1800),
    ...dailyDeficitEvents("2026-05-15", "2026-05-21", 1000, 2600, 1800),
    weightEvent("weight-start", "2026-05-15", 80),
    weightEvent("weight-end", "2026-05-21", 79.8)
  ]);

  const result = await buildHealthCalibrationResponse(store, 7, "2026-05-21");

  assert.equal(result.status, "held");
  assert.equal(result.predictedDailyDeficitCalories?.value, 200);
  assert.equal(result.observedDailyDeficitCalories?.value, 257);
  assert.equal(result.completeDeficitDays, 7);
  assert.equal(result.startDate, "2026-05-15");
  assert.equal(result.nextWeekAdjustment?.value.direction, "hold");
  assert.equal(result.nextWeekAdjustment?.value.caloriesPerDay, 0);
  assert.equal(result.reasons.length, 0);
});

test("weekly calibration slips when observed deficit trails predicted deficit", async () => {
  const store = new InMemoryRawHealthEventStore();
  await store.insertMany([
    ...dailyDeficitEvents("2026-05-15", "2026-05-21", 1000, 2300, 1800),
    weightEvent("weight-start", "2026-05-15", 80),
    weightEvent("weight-end", "2026-05-21", 80)
  ]);

  const result = await buildHealthCalibrationResponse(store, 7, "2026-05-21");

  assert.equal(result.status, "slipped");
  assert.equal(result.predictedDailyDeficitCalories?.value, 500);
  assert.equal(result.observedDailyDeficitCalories?.value, 0);
  assert.equal(result.nextWeekAdjustment?.value.direction, "decrease_intake");
  assert.equal(result.nextWeekAdjustment?.value.caloriesPerDay, 500);
  assert.equal(result.reasons.length, 0);
});

test("weekly calibration returns explicit insufficient data state", async () => {
  const store = new InMemoryRawHealthEventStore();
  await store.insertMany([
    ...dailyDeficitEvents("2026-05-19", "2026-05-21", 900, 2600, 1800),
    weightEvent("weight-only", "2026-05-21", 80)
  ]);

  const result = await buildHealthCalibrationResponse(store, 7, "2026-05-21");

  assert.equal(result.status, "insufficient_data");
  assert.equal(result.predictedDailyDeficitCalories, undefined);
  assert.equal(result.nextWeekAdjustment, undefined);
  assert.equal(result.weightRows, 1);
  assert.equal(result.completeDeficitDays, 3);
  assert.ok(result.reasons.includes("Need at least two real weight rows in the calibration window."));
  assert.ok(result.reasons.includes("Need at least 7 days with logged intake and total-expenditure-derived deficit."));
});

test("weekly calibration does not use active-only burn as a total deficit", async () => {
  const store = new InMemoryRawHealthEventStore();
  await store.insertMany([
    ...dailyDeficitEvents("2026-05-15", "2026-05-21", 1000, 2300),
    weightEvent("weight-start", "2026-05-15", 80),
    weightEvent("weight-end", "2026-05-21", 80)
  ]);

  const result = await buildHealthCalibrationResponse(store, 7, "2026-05-21");

  assert.equal(result.status, "insufficient_data");
  assert.equal(result.predictedDailyDeficitCalories, undefined);
  assert.equal(result.nextWeekAdjustment, undefined);
  assert.ok(result.reasons.includes("Need at least 7 days with logged intake and total-expenditure-derived deficit."));
});

test("weekly calibration validates explicit end dates", async () => {
  const store = new InMemoryRawHealthEventStore();

  await assert.rejects(
    () => buildHealthCalibrationResponse(store, 7, "2026-02-31"),
    /endDate must be a real calendar date/
  );
});

function dailyDeficitEvents(
  startDate: string,
  endDate: string,
  activeCalories: number,
  intakeCalories: number,
  basalCalories?: number
): RawHealthEvent[] {
  return eachDate(startDate, endDate).flatMap((date) => [
    activityEvent(`activity-${date}`, date, activeCalories, basalCalories),
    mealEvent(`meal-${date}`, date, intakeCalories)
  ]);
}

function activityEvent(id: string, date: string, activeCalories: number, basalCalories?: number): RawHealthEvent {
  return {
    id,
    source: "oura",
    type: "daily_activity",
    observedAt: `${date}T00:00:00.000Z`,
    receivedAt: `${date}T08:00:00.000Z`,
    payload: {
      day: date,
      active_calories: activeCalories,
      basalCalories
    }
  };
}

function mealEvent(id: string, date: string, calories: number): RawHealthEvent {
  return {
    id,
    source: "openclaw",
    type: "openclaw_meal",
    observedAt: `${date}T18:00:00.000Z`,
    receivedAt: `${date}T18:00:00.000Z`,
    payload: {
      text: "logged meal",
      estimatedCalories: calories,
      estimatedCaloriesSource: "known_food",
      estimationConfidence: "medium",
      entrySource: "known_food"
    }
  };
}

function weightEvent(id: string, date: string, weightKg: number): RawHealthEvent {
  return {
    id,
    source: "openclaw",
    type: "weight",
    observedAt: `${date}T07:00:00.000Z`,
    receivedAt: `${date}T07:00:00.000Z`,
    payload: { weightKg }
  };
}

function eachDate(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  while (cursor <= end) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return dates;
}
