import { buildNormalizedDailyLedger } from "./normalization";
import type { BodyMode, MetricValue, NormalizedDailyLedger, RawHealthEvent } from "./types";
import { assertValidDate, ValidationError } from "./validation";

export type OperatorViewDataState = "empty" | "insufficient" | "ready";
export type OperatorViewMissingSignal =
  | "readiness"
  | "sleep"
  | "hrv"
  | "resting_heart_rate"
  | "weight"
  | "meals"
  | "activity";

export interface BuildOperatorViewOptions {
  endDate: string;
  events: RawHealthEvent[];
  days?: number;
  generatedAt?: string;
}

export interface OperatorViewDaySummary {
  date: string;
  bodyMode: BodyMode;
  hasData: boolean;
  rawEventCount: number;
  missingSignals: OperatorViewMissingSignal[];
}

export interface OperatorViewTrendDelta {
  metric: string;
  fromDate: string;
  toDate: string;
  fromValue: number;
  toValue: number;
  delta: number;
}

export interface OperatorViewMissingSignalFlag {
  signal: OperatorViewMissingSignal;
  missingDays: number;
  latestMissing: boolean;
}

export interface OperatorViewResponse {
  kind: "health.operator_view";
  window: {
    startDate: string;
    endDate: string;
    days: number;
  };
  dataState: OperatorViewDataState;
  ledgers: NormalizedDailyLedger[];
  days: OperatorViewDaySummary[];
  bodyMode: {
    current: BodyMode | "unknown";
    currentStreak: {
      mode: BodyMode | "unknown";
      days: number;
      startDate: string;
      endDate: string;
    };
    counts: Record<BodyMode, number>;
  };
  trends: OperatorViewTrendDelta[];
  missingSignals: {
    window: OperatorViewMissingSignalFlag[];
    byDay: Array<{
      date: string;
      signals: OperatorViewMissingSignal[];
    }>;
  };
  generatedAt: string;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

const missingSignals: OperatorViewMissingSignal[] = [
  "readiness",
  "sleep",
  "hrv",
  "resting_heart_rate",
  "weight",
  "meals",
  "activity"
];

export function buildOperatorView(options: BuildOperatorViewOptions): OperatorViewResponse {
  const endDate = assertValidDate(options.endDate, "endDate");
  const days = validateDays(options.days ?? DEFAULT_DAYS);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const dates = buildDateWindow(endDate, days);
  const ledgers = dates.map((date) => buildNormalizedDailyLedger({ date, events: options.events, generatedAt }).ledger);
  const daySummaries = ledgers.map(summarizeDay);
  const observedDays = daySummaries.filter((day) => day.hasData).length;

  return {
    kind: "health.operator_view",
    window: {
      startDate: dates[0],
      endDate,
      days
    },
    dataState: observedDays === 0 ? "empty" : observedDays < 2 ? "insufficient" : "ready",
    ledgers,
    days: daySummaries,
    bodyMode: summarizeBodyMode(ledgers.filter((ledger) => ledger.rawEventIds.length > 0)),
    trends: buildTrendDeltas(ledgers),
    missingSignals: {
      window: summarizeMissingSignals(daySummaries),
      byDay: daySummaries.map((day) => ({ date: day.date, signals: day.missingSignals }))
    },
    generatedAt
  };
}

function validateDays(days: number): number {
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw new ValidationError(`days must be an integer from 1 to ${MAX_DAYS}.`);
  }
  return days;
}

function buildDateWindow(endDate: string, days: number): string[] {
  const end = parseUtcDay(endDate);
  return Array.from({ length: days }, (_, index) => formatUtcDay(addDays(end, index - days + 1)));
}

function summarizeDay(ledger: NormalizedDailyLedger): OperatorViewDaySummary {
  return {
    date: ledger.date,
    bodyMode: ledger.bodyMode,
    hasData: ledger.rawEventIds.length > 0,
    rawEventCount: ledger.rawEventIds.length,
    missingSignals: collectMissingSignals(ledger)
  };
}

function collectMissingSignals(ledger: NormalizedDailyLedger): OperatorViewMissingSignal[] {
  const missing: OperatorViewMissingSignal[] = [];
  if (!ledger.readinessScore) missing.push("readiness");
  if (!ledger.sleepHours) missing.push("sleep");
  if (!ledger.hrvMs) missing.push("hrv");
  if (!ledger.restingHeartRateBpm) missing.push("resting_heart_rate");
  if (!ledger.weightKg) missing.push("weight");
  if (ledger.meals.length === 0) missing.push("meals");
  if (!ledger.steps && !ledger.activeEnergyCalories) missing.push("activity");
  return missing;
}

function summarizeBodyMode(ledgers: NormalizedDailyLedger[]): OperatorViewResponse["bodyMode"] {
  if (ledgers.length === 0) {
    return {
      current: "unknown",
      currentStreak: {
        mode: "unknown",
        days: 0,
        startDate: "",
        endDate: ""
      },
      counts: { green: 0, yellow: 0, red: 0 }
    };
  }

  const current = ledgers[ledgers.length - 1]?.bodyMode ?? "green";
  const counts: Record<BodyMode, number> = { green: 0, yellow: 0, red: 0 };

  for (const ledger of ledgers) {
    counts[ledger.bodyMode] += 1;
  }

  let streakDays = 0;
  for (let index = ledgers.length - 1; index >= 0; index -= 1) {
    if (ledgers[index].bodyMode !== current) break;
    streakDays += 1;
  }

  const startIndex = Math.max(0, ledgers.length - streakDays);
  return {
    current,
    currentStreak: {
      mode: current,
      days: streakDays,
      startDate: ledgers[startIndex]?.date ?? "",
      endDate: ledgers[ledgers.length - 1]?.date ?? ""
    },
    counts
  };
}

function buildTrendDeltas(ledgers: NormalizedDailyLedger[]): OperatorViewTrendDelta[] {
  return [
    trendForMetric("readinessScore", ledgers, (ledger) => ledger.readinessScore),
    trendForMetric("sleepHours", ledgers, (ledger) => ledger.sleepHours),
    trendForMetric("hrvMs", ledgers, (ledger) => ledger.hrvMs),
    trendForMetric("restingHeartRateBpm", ledgers, (ledger) => ledger.restingHeartRateBpm),
    trendForMetric("weightKg", ledgers, (ledger) => ledger.weightKg),
    trendForMetric("steps", ledgers, (ledger) => ledger.steps),
    trendForMetric("activeEnergyCalories", ledgers, (ledger) => ledger.activeEnergyCalories),
    trendForMetric("estimatedDeficitCalories", ledgers, (ledger) => ledger.estimatedDeficitCalories),
    trendForMetric("bodyFatPercentage", ledgers, (ledger) => ledger.bodyComposition?.bodyFatPercentage)
  ].filter((delta): delta is OperatorViewTrendDelta => delta !== undefined);
}

function trendForMetric(
  metric: string,
  ledgers: NormalizedDailyLedger[],
  readMetric: (ledger: NormalizedDailyLedger) => MetricValue<number> | undefined
): OperatorViewTrendDelta | undefined {
  const points = ledgers
    .map((ledger) => ({ date: ledger.date, value: readMetric(ledger)?.value }))
    .filter((point): point is { date: string; value: number } => point.value !== undefined);

  if (points.length < 2) return undefined;

  const first = points[0];
  const last = points[points.length - 1];
  return {
    metric,
    fromDate: first.date,
    toDate: last.date,
    fromValue: first.value,
    toValue: last.value,
    delta: round(last.value - first.value, 3)
  };
}

function summarizeMissingSignals(daySummaries: OperatorViewDaySummary[]): OperatorViewMissingSignalFlag[] {
  const latest = daySummaries[daySummaries.length - 1];
  return missingSignals
    .map((signal) => ({
      signal,
      missingDays: daySummaries.filter((day) => day.missingSignals.includes(signal)).length,
      latestMissing: latest?.missingSignals.includes(signal) ?? false
    }))
    .filter((flag) => flag.missingDays > 0);
}

function parseUtcDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
