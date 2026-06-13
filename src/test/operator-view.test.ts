import test from "node:test";
import assert from "node:assert/strict";
import { buildOperatorView } from "@/lib/health/operator-view";
import { InMemoryRawHealthEventStore } from "@/lib/health/ledger";
import type { RawHealthEvent } from "@/lib/health";
import { ValidationError } from "@/lib/health/validation";
import { buildOperatorViewResponse } from "../../app/api/health/operator-view/route";

test("builds a multi-day operator view with body mode streaks, trends, and missing signals", () => {
  const view = buildOperatorView({
    endDate: "2026-05-21",
    days: 3,
    events: syntheticEvents(),
    generatedAt: "2026-05-21T20:00:00.000Z"
  });

  assert.equal(view.kind, "health.operator_view");
  assert.deepEqual(view.window, { startDate: "2026-05-19", endDate: "2026-05-21", days: 3 });
  assert.equal(view.dataState, "ready");
  assert.deepEqual(
    view.days.map((day) => day.bodyMode),
    ["green", "yellow", "red"]
  );
  assert.deepEqual(view.bodyMode.counts, { green: 1, yellow: 1, red: 1 });
  assert.deepEqual(view.bodyMode.currentStreak, {
    mode: "red",
    days: 1,
    startDate: "2026-05-21",
    endDate: "2026-05-21"
  });

  assert.deepEqual(findTrend(view.trends, "readinessScore"), {
    metric: "readinessScore",
    fromDate: "2026-05-19",
    toDate: "2026-05-21",
    fromValue: 82,
    toValue: 50,
    delta: -32
  });
  assert.deepEqual(findTrend(view.trends, "weightKg"), {
    metric: "weightKg",
    fromDate: "2026-05-19",
    toDate: "2026-05-21",
    fromValue: 82,
    toValue: 81.2,
    delta: -0.8
  });

  assert.deepEqual(view.missingSignals.byDay[1], {
    date: "2026-05-20",
    signals: ["meals"]
  });
  assert.deepEqual(findMissingFlag(view.missingSignals.window, "hrv"), {
    signal: "hrv",
    missingDays: 1,
    latestMissing: true
  });
  assert.equal(view.ledgers[2].rawEventIds.includes("readiness-2026-05-21"), true);
});

test("route builder returns explicit empty and insufficient states", async () => {
  const emptyStore = new InMemoryRawHealthEventStore();
  const empty = await buildOperatorViewResponse(emptyStore, {
    endDate: "2026-05-21",
    days: 3,
    generatedAt: "2026-05-21T20:00:00.000Z"
  });

  assert.equal(empty.dataState, "empty");
  assert.equal(empty.days.every((day) => !day.hasData), true);
  assert.deepEqual(empty.bodyMode.currentStreak, {
    mode: "unknown",
    days: 0,
    startDate: "",
    endDate: ""
  });

  const oneDayStore = new InMemoryRawHealthEventStore();
  await oneDayStore.insertMany(syntheticEvents().filter((event) => event.observedAt.startsWith("2026-05-21")));

  const insufficient = await buildOperatorViewResponse(oneDayStore, {
    endDate: "2026-05-21",
    days: 3,
    generatedAt: "2026-05-21T20:00:00.000Z"
  });

  assert.equal(insufficient.dataState, "insufficient");
  assert.equal(insufficient.days.filter((day) => day.hasData).length, 1);
});

test("operator view validates date windows and day counts", () => {
  assert.throws(
    () => buildOperatorView({ endDate: "2026-02-31", days: 3, events: [] }),
    /endDate must be a real calendar date/
  );
  assert.throws(
    () => buildOperatorView({ endDate: "2026-05-21", days: 31, events: [] }),
    ValidationError
  );
});

function syntheticEvents(): RawHealthEvent[] {
  return [
    ...ouraSleep("2026-05-19", 82, 8, 60, 50),
    ouraReadiness("2026-05-19", 82, 0.1),
    ouraActivity("2026-05-19", 9_500, 540),
    weight("2026-05-19", 82),
    meal("2026-05-19", "eggs and toast", 520),
    ...ouraSleep("2026-05-20", 65, 6.2, 48, 54),
    ouraReadiness("2026-05-20", 65, 0.2),
    ouraActivity("2026-05-20", 7_200, 430),
    weight("2026-05-20", 81.6),
    ...ouraSleep("2026-05-21", 55, 5),
    ouraReadiness("2026-05-21", 50, 0.8),
    ouraActivity("2026-05-21", 4_100, 260),
    weight("2026-05-21", 81.2),
    meal("2026-05-21", "rice bowl", 710)
  ];
}

function ouraSleep(day: string, score: number, sleepHours: number, hrv?: number, restingHeartRate?: number): RawHealthEvent[] {
  return [
    {
      id: `sleep-${day}`,
      source: "oura",
      type: "sleep",
      observedAt: `${day}T00:00:00.000Z`,
      receivedAt: `${day}T08:00:00.000Z`,
      externalId: `sleep-${day}`,
      payload: {
        day,
        total_sleep_duration: sleepHours * 3600,
        average_hrv: hrv,
        lowest_heart_rate: restingHeartRate
      }
    },
    {
      id: `daily-sleep-${day}`,
      source: "oura",
      type: "daily_sleep",
      observedAt: `${day}T00:00:00.000Z`,
      receivedAt: `${day}T08:00:00.000Z`,
      externalId: `daily-sleep-${day}`,
      payload: {
        day,
        score,
        total_sleep_duration: sleepHours * 3600,
        average_hrv: hrv,
        lowest_heart_rate: restingHeartRate
      }
    }
  ];
}

function ouraReadiness(day: string, score: number, temperatureDeviation: number): RawHealthEvent {
  return {
    id: `readiness-${day}`,
    source: "oura",
    type: "daily_readiness",
    observedAt: `${day}T00:00:00.000Z`,
    receivedAt: `${day}T08:00:00.000Z`,
    externalId: `readiness-${day}`,
    payload: {
      day,
      score,
      temperature_deviation: temperatureDeviation
    }
  };
}

function ouraActivity(day: string, steps: number, activeCalories: number): RawHealthEvent {
  return {
    id: `activity-${day}`,
    source: "oura",
    type: "daily_activity",
    observedAt: `${day}T00:00:00.000Z`,
    receivedAt: `${day}T08:00:00.000Z`,
    externalId: `activity-${day}`,
    payload: {
      day,
      steps,
      active_calories: activeCalories
    }
  };
}

function weight(day: string, weightKg: number): RawHealthEvent {
  return {
    id: `weight-${day}`,
    source: "manual",
    type: "weight",
    observedAt: `${day}T07:00:00.000Z`,
    receivedAt: `${day}T07:01:00.000Z`,
    externalId: `weight-${day}`,
    payload: { weightKg }
  };
}

function meal(day: string, text: string, estimatedCalories: number): RawHealthEvent {
  return {
    id: `meal-${day}`,
    source: "openclaw",
    type: "openclaw_meal",
    observedAt: `${day}T18:00:00.000Z`,
    receivedAt: `${day}T18:01:00.000Z`,
    externalId: `meal-${day}`,
    payload: {
      text,
      estimatedCalories,
      estimatedCaloriesSource: "meal_text",
      estimationConfidence: "medium"
    }
  };
}

function findTrend<TMetric extends string>(
  trends: Array<{ metric: TMetric }>,
  metric: TMetric
): (typeof trends)[number] | undefined {
  return trends.find((trend) => trend.metric === metric);
}

function findMissingFlag<TSignal extends string>(
  flags: Array<{ signal: TSignal }>,
  signal: TSignal
): (typeof flags)[number] | undefined {
  return flags.find((flag) => flag.signal === signal);
}
