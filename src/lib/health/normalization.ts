import { classifyBodyMode } from "./body-mode";
import type { MealLog, MetricValue, NormalizedDailyLedger, RawHealthEvent, WearableSource } from "./types";

export interface BuildDailyLedgerOptions {
  date: string;
  events: RawHealthEvent[];
  generatedAt?: string;
}

export interface BuildDailyLedgerResult {
  ledger: NormalizedDailyLedger;
  bodyModeReasons: string[];
}

export function buildNormalizedDailyLedger(options: BuildDailyLedgerOptions): BuildDailyLedgerResult {
  const dayEvents = options.events.filter((event) => eventDate(event) === options.date);
  const allWeightEvents = options.events.filter((event) => event.type === "weight" && readNumber(event.payload, "weightKg") !== undefined);

  const ledger: NormalizedDailyLedger = {
    date: options.date,
    bodyMode: "green",
    meals: dayEvents.filter((event) => event.type === "openclaw_meal").map(mealFromEvent),
    rawEventIds: dayEvents.map((event) => event.id),
    generatedAt: options.generatedAt ?? new Date().toISOString()
  };

  applyOuraEvents(ledger, dayEvents);
  applyWeight(ledger, dayEvents, allWeightEvents);

  const bodyMode = classifyBodyMode({
    readinessScore: ledger.readinessScore,
    sleepHours: ledger.sleepHours,
    temperatureDeviationC: ledger.temperatureDeviationC,
    stressScore: ledger.stressScore,
    calendarPressure: ledger.calendarPressure
  });
  ledger.bodyMode = bodyMode.mode;

  return { ledger, bodyModeReasons: bodyMode.reasons };
}

function applyOuraEvents(ledger: NormalizedDailyLedger, events: RawHealthEvent[]): void {
  for (const event of events.filter((candidate) => candidate.source === "oura")) {
    if (event.type === "daily_sleep") {
      const sleepSeconds = firstNumber(event.payload, [
        "total_sleep_duration",
        "contributors.total_sleep",
        "sleep.total_sleep_duration"
      ]);
      const score = firstNumber(event.payload, ["score", "readiness.score"]);
      const hrv = firstNumber(event.payload, ["average_hrv", "contributors.hrv_balance", "hrv"]);
      const rhr = firstNumber(event.payload, ["lowest_heart_rate", "average_heart_rate", "resting_heart_rate"]);

      if (sleepSeconds !== undefined) {
        ledger.sleepHours = metric(round(sleepSeconds / 3600, 2), "oura", "high");
      }
      if (score !== undefined && !ledger.readinessScore) {
        ledger.readinessScore = metric(score, "oura", "medium", "Mapped from Oura sleep score until readiness is available.");
      }
      if (hrv !== undefined) ledger.hrvMs = metric(hrv, "oura", "medium");
      if (rhr !== undefined) ledger.restingHeartRateBpm = metric(rhr, "oura", "medium");
    }

    if (event.type === "daily_readiness") {
      const score = firstNumber(event.payload, ["score"]);
      const hrv = firstNumber(event.payload, ["contributors.hrv_balance", "hrv"]);
      const rhr = firstNumber(event.payload, ["contributors.resting_heart_rate", "resting_heart_rate"]);
      const temp = firstNumber(event.payload, ["temperature_deviation", "temperature_trend_deviation"]);

      if (score !== undefined) ledger.readinessScore = metric(score, "oura", "high");
      if (hrv !== undefined && !ledger.hrvMs) ledger.hrvMs = metric(hrv, "oura", "medium");
      if (rhr !== undefined && !ledger.restingHeartRateBpm) ledger.restingHeartRateBpm = metric(rhr, "oura", "medium");
      if (temp !== undefined) ledger.temperatureDeviationC = metric(temp, "oura", "medium");
    }

    if (event.type === "daily_activity") {
      const steps = firstNumber(event.payload, ["steps"]);
      const calories = firstNumber(event.payload, ["active_calories", "active_calories_total", "calories.active"]);

      if (steps !== undefined) ledger.steps = metric(steps, "oura", "low");
      if (calories !== undefined) {
        ledger.activeEnergyCalories = metric(calories, "oura", "low", "Wearable calories are a rough prior pending weight trend recalibration.");
      }
    }
  }
}

function applyWeight(
  ledger: NormalizedDailyLedger,
  dayEvents: RawHealthEvent[],
  allWeightEvents: RawHealthEvent[]
): void {
  const todayWeight = dayEvents
    .filter((event) => event.type === "weight")
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .at(0);

  const weightKg = todayWeight ? readNumber(todayWeight.payload, "weightKg") : undefined;
  if (todayWeight && weightKg !== undefined) {
    ledger.weightKg = metric(weightKg, todayWeight.source, todayWeight.source === "smart_scale" ? "high" : "medium");
  }

  const trend = calculateWeightTrendKgPerWeek(allWeightEvents);
  if (trend !== undefined) {
    ledger.weightTrendKgPerWeek = metric(trend, "openclaw", "low", "Basic recent-event slope; replace with smoothed trend once enough data exists.");
  }
}

export function calculateWeightTrendKgPerWeek(events: RawHealthEvent[]): number | undefined {
  const weights = events
    .map((event) => ({ event, weightKg: readNumber(event.payload, "weightKg") }))
    .filter((item): item is { event: RawHealthEvent; weightKg: number } => item.weightKg !== undefined)
    .sort((a, b) => a.event.observedAt.localeCompare(b.event.observedAt));

  if (weights.length < 2) return undefined;

  const first = weights[0];
  const last = weights[weights.length - 1];
  const days = (Date.parse(last.event.observedAt) - Date.parse(first.event.observedAt)) / 86_400_000;
  if (days <= 0) return undefined;

  return round(((last.weightKg - first.weightKg) / days) * 7, 3);
}

function mealFromEvent(event: RawHealthEvent): MealLog {
  const text = readString(event.payload, "text");
  const photoUrl = readString(event.payload, "photoUrl");
  const calories = readNumber(event.payload, "estimatedCalories");
  const protein = readNumber(event.payload, "estimatedProteinGrams");

  return {
    id: event.id,
    loggedAt: event.observedAt,
    source: "openclaw",
    text,
    photoUrl,
    estimatedCalories: calories === undefined ? undefined : metric(calories, "openclaw", "low"),
    estimatedProteinGrams: protein === undefined ? undefined : metric(protein, "openclaw", "low")
  };
}

function metric<T>(value: T, source: WearableSource, confidence: MetricValue<T>["confidence"], notes?: string): MetricValue<T> {
  return { value, source, confidence, notes };
}

function eventDate(event: RawHealthEvent): string {
  const payloadDay = readString(event.payload, "day");
  return payloadDay ?? event.observedAt.slice(0, 10);
}

function firstNumber(payload: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = readNumber(payload, path);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readNumber(payload: unknown, path: string): number | undefined {
  const value = readPath(payload, path);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(payload: unknown, path: string): string | undefined {
  const value = readPath(payload, path);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readPath(payload: unknown, path: string): unknown {
  let current = payload;
  for (const part of path.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
