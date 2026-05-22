import { classifyBodyMode, type NormalizedDailyLedger } from "@/lib/health";
import { openClawHealthSafetyMetadata } from "./safety";

export interface OpenClawDailySummary {
  kind: "openclaw.health.daily_summary";
  date: string;
  bodyMode: NormalizedDailyLedger["bodyMode"];
  bodyModeReasons: string[];
  nextAction: string;
  signals: {
    recovery: string;
    sleep: string;
    meals: string;
    weight: string;
  };
  missingSignals: string[];
  dataState: "sample_until_persistence";
  safety: typeof openClawHealthSafetyMetadata;
  generatedAt: string;
}

export interface OpenClawTodayPlan {
  kind: "openclaw.health.today_plan";
  date: string;
  mode: NormalizedDailyLedger["bodyMode"];
  nextAction: string;
  mealPrompt: string;
  movement: string;
  recovery: string;
  checkIns: string[];
  dataState: "sample_until_persistence";
  safety: typeof openClawHealthSafetyMetadata;
  generatedAt: string;
}

export function buildSampleOpenClawLedger(now = new Date()): NormalizedDailyLedger {
  const generatedAt = now.toISOString();
  const bodyMode = classifyBodyMode({
    readinessScore: { value: 72, source: "oura", confidence: "medium" },
    sleepHours: { value: 7.1, source: "oura", confidence: "medium" }
  });

  return {
    date: generatedAt.slice(0, 10),
    bodyMode: bodyMode.mode,
    readinessScore: { value: 72, source: "oura", confidence: "medium" },
    sleepHours: { value: 7.1, source: "oura", confidence: "medium" },
    meals: [],
    rawEventIds: [],
    generatedAt
  };
}

export function buildOpenClawDailySummary(
  ledger = buildSampleOpenClawLedger(),
  now = new Date(ledger.generatedAt)
): OpenClawDailySummary {
  const bodyMode = classifyBodyMode(ledger);
  const generatedAt = now.toISOString();

  return {
    kind: "openclaw.health.daily_summary",
    date: ledger.date,
    bodyMode: bodyMode.mode,
    bodyModeReasons: bodyMode.reasons,
    nextAction: chooseNextAction(bodyMode.mode),
    signals: {
      recovery: formatMetric(ledger.readinessScore?.value, "readiness"),
      sleep: ledger.sleepHours ? `${ledger.sleepHours.value.toFixed(1)} hours sleep` : "sleep missing",
      meals: ledger.meals.length ? `${ledger.meals.length} meal logs today` : "no meals logged today",
      weight: ledger.weightKg ? `${ledger.weightKg.value.toFixed(1)} kg` : "weight missing"
    },
    missingSignals: collectMissingSignals(ledger),
    dataState: "sample_until_persistence",
    safety: openClawHealthSafetyMetadata,
    generatedAt
  };
}

export function buildOpenClawTodayPlan(
  ledger = buildSampleOpenClawLedger(),
  now = new Date(ledger.generatedAt)
): OpenClawTodayPlan {
  const bodyMode = classifyBodyMode(ledger);
  const generatedAt = now.toISOString();

  return {
    kind: "openclaw.health.today_plan",
    date: ledger.date,
    mode: bodyMode.mode,
    nextAction: chooseNextAction(bodyMode.mode),
    mealPrompt: chooseMealPrompt(ledger),
    movement: chooseMovement(bodyMode.mode),
    recovery: chooseRecovery(bodyMode.mode),
    checkIns: chooseCheckIns(ledger),
    dataState: "sample_until_persistence",
    safety: openClawHealthSafetyMetadata,
    generatedAt
  };
}

function chooseNextAction(mode: NormalizedDailyLedger["bodyMode"]): string {
  if (mode === "red") return "Keep the day simple: log meals, prioritize recovery, and avoid intensity.";
  if (mode === "yellow") return "Keep routine steady and choose the lowest-friction healthy meal next.";
  return "Run the normal plan: protein-forward meals, movement, and one quick weight or meal check-in.";
}

function chooseMealPrompt(ledger: NormalizedDailyLedger): string {
  if (!ledger.meals.length) return "Ask James for the first meal in one sentence or a meal photo.";
  return "Ask only for the next unlogged meal when it happens.";
}

function chooseMovement(mode: NormalizedDailyLedger["bodyMode"]): string {
  if (mode === "red") return "Recovery walk only if it feels easy.";
  if (mode === "yellow") return "Easy zone-2 or steps; skip hard intervals.";
  return "Normal training is fine if schedule allows.";
}

function chooseRecovery(mode: NormalizedDailyLedger["bodyMode"]): string {
  if (mode === "red") return "Bias toward sleep, hydration, and simple food.";
  if (mode === "yellow") return "Protect bedtime and reduce optional load.";
  return "Maintain normal sleep routine.";
}

function chooseCheckIns(ledger: NormalizedDailyLedger): string[] {
  const checkIns: string[] = [];
  if (!ledger.meals.length) checkIns.push("meal");
  if (!ledger.weightKg) checkIns.push("weight");
  if (!ledger.sleepHours) checkIns.push("sleep");
  return checkIns.length ? checkIns : ["none"];
}

function collectMissingSignals(ledger: NormalizedDailyLedger): string[] {
  const missing: string[] = [];
  if (!ledger.weightKg) missing.push("weight");
  if (!ledger.meals.length) missing.push("meals");
  if (!ledger.hrvMs) missing.push("hrv");
  if (!ledger.restingHeartRateBpm) missing.push("resting_heart_rate");
  return missing;
}

function formatMetric(value: number | undefined, label: string): string {
  return value === undefined ? `${label} missing` : `${label} ${value}`;
}

