import { classifyBodyMode } from "./body-mode";
import type { MealLog, MetricSource, MetricValue, NormalizedDailyLedger, RawHealthEvent } from "./types";

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
  applyEstimatedDeficit(ledger);

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
  const correctedCalories = readNumber(event.payload, "correctedCalories");
  const correctedProtein = readNumber(event.payload, "correctedProteinGrams");
  const calories = readNumber(event.payload, "estimatedCalories");
  const protein = readNumber(event.payload, "estimatedProteinGrams");
  const caloriesSource = readMetricSource(event.payload, "estimatedCaloriesSource") ?? "openclaw";
  const proteinSource = readMetricSource(event.payload, "estimatedProteinGramsSource") ?? "openclaw";
  const confidence = readConfidence(event.payload, "estimationConfidence") ?? "low";
  const knownFoodId = readString(event.payload, "knownFoodId");
  const knownFoodName = readString(event.payload, "knownFoodName");
  const entrySource = readMealEntrySource(event.payload, "entrySource") ?? inferMealEntrySource(text, photoUrl, caloriesSource);

  return {
    id: event.id,
    loggedAt: event.observedAt,
    source: "openclaw",
    entrySource,
    text,
    photoUrl,
    knownFoods: knownFoodId && knownFoodName ? [{ id: knownFoodId, name: knownFoodName }] : undefined,
    estimatedCalories:
      correctedCalories === undefined
        ? calories === undefined
          ? undefined
          : metric(calories, caloriesSource, confidence)
        : metric(correctedCalories, "manual_entry", "high", "User-corrected meal value."),
    estimatedProteinGrams:
      correctedProtein === undefined
        ? protein === undefined
          ? undefined
          : metric(protein, proteinSource, confidence)
        : metric(correctedProtein, "manual_entry", "high", "User-corrected meal value.")
  };
}

function applyEstimatedDeficit(ledger: NormalizedDailyLedger): void {
  const intake = ledger.meals.reduce((sum, meal) => sum + (meal.estimatedCalories?.value ?? 0), 0);
  if (!ledger.activeEnergyCalories || intake <= 0) return;
  ledger.estimatedDeficitCalories = metric(
    Math.round(ledger.activeEnergyCalories.value - intake),
    "openclaw",
    "low",
    "Active-energy minus logged meal calories only; excludes basal burn and is not a medical claim."
  );
}

function metric<T>(value: T, source: MetricSource, confidence: MetricValue<T>["confidence"], notes?: string): MetricValue<T> {
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

function readMetricSource(payload: unknown, path: string): MetricSource | undefined {
  const value = readString(payload, path);
  if (
    value === "oura" ||
    value === "apple_health" ||
    value === "apple_watch" ||
    value === "garmin" ||
    value === "smart_scale" ||
    value === "openclaw" ||
    value === "manual" ||
    value === "known_food" ||
    value === "meal_photo" ||
    value === "meal_text" ||
    value === "manual_entry"
  ) {
    return value;
  }
  return undefined;
}

function readConfidence(payload: unknown, path: string): MetricValue<number>["confidence"] | undefined {
  const value = readString(payload, path);
  if (value === "high" || value === "medium" || value === "low" || value === "unknown") return value;
  return undefined;
}

function readMealEntrySource(payload: unknown, path: string): MealLog["entrySource"] | undefined {
  const value = readString(payload, path);
  if (value === "known_food" || value === "meal_photo" || value === "meal_text" || value === "manual_entry" || value === "unknown") {
    return value;
  }
  return undefined;
}

function inferMealEntrySource(text: string | undefined, photoUrl: string | undefined, source: MetricSource): MealLog["entrySource"] {
  if (source === "known_food" || source === "manual_entry" || source === "meal_photo" || source === "meal_text") return source;
  if (photoUrl) return "meal_photo";
  if (text) return "meal_text";
  return "unknown";
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
