import { classifyBodyMode, type HealthMetric, type NormalizedDailyLedger } from "@/lib/health";

export type InteractionIntent = "explain" | "log_meal" | "log_weight" | "open_metric" | "open_sources";

export interface TodayInteractionLink {
  label: string;
  href: string;
  intent: InteractionIntent;
  copy: string;
}

export interface MissingSignalPrompt extends TodayInteractionLink {
  signal: "meal" | "weight" | "hrv" | "resting_heart_rate" | "sleep";
}

export interface MetricInteraction extends TodayInteractionLink {
  metric: HealthMetric | "readiness";
  value: string;
  source: string;
}

export interface TodayInteractionModel {
  date: string;
  mode: NormalizedDailyLedger["bodyMode"];
  planHeadline: string;
  planCopy: string;
  explanation: string;
  primaryAction: TodayInteractionLink;
  secondaryAction: TodayInteractionLink;
  missingSignals: MissingSignalPrompt[];
  metricLinks: MetricInteraction[];
  dataStateCopy: string;
}

export function buildTodayInteractionModel(
  ledger: NormalizedDailyLedger,
  bodyModeReasons = classifyBodyMode(ledger).reasons
): TodayInteractionModel {
  const mode = classifyBodyMode(ledger);
  const dateParam = encodeURIComponent(ledger.date);
  const missingSignals = collectMissingSignalPrompts(ledger, dateParam);

  return {
    date: ledger.date,
    mode: mode.mode,
    planHeadline: headlineForMode(mode.mode),
    planCopy: planCopyForMode(mode.mode),
    explanation: explainMode(mode.mode, bodyModeReasons, ledger),
    primaryAction: {
      label: "Plan it",
      href: "#today-plan",
      intent: "explain",
      copy: "Open the smallest plan for today before adding more dashboard surface."
    },
    secondaryAction: {
      label: "Why this",
      href: "#why-this-mode",
      intent: "explain",
      copy: "Show which ledger inputs produced the current body mode."
    },
    missingSignals,
    metricLinks: collectMetricLinks(ledger, dateParam),
    dataStateCopy: ledger.rawEventIds.length
      ? "Derived from normalized ledger rows. No raw provider payloads or secrets are shown."
      : "Sample interaction model until persistence has rows. Do not treat this as a health claim."
  };
}

function collectMissingSignalPrompts(ledger: NormalizedDailyLedger, dateParam: string): MissingSignalPrompt[] {
  const prompts: MissingSignalPrompt[] = [];

  if (!ledger.meals.length) {
    prompts.push({
      signal: "meal",
      label: "Log a meal",
      href: `/api/health/meals?date=${dateParam}`,
      intent: "log_meal",
      copy: "Meal is missing. Open the meal contract and log text or a photo through OpenClaw."
    });
  }

  if (!ledger.weightKg) {
    prompts.push({
      signal: "weight",
      label: "Add weight",
      href: `#body-ledger-weight`,
      intent: "log_weight",
      copy: "Weight is missing. Add a manual Body Ledger row or connect a smart scale later."
    });
  }

  if (!ledger.hrvMs && ledger.sleepHours) {
    prompts.push({
      signal: "hrv",
      label: "Check HRV source",
      href: `#body-ledger-hrv`,
      intent: "open_sources",
      copy: "Sleep exists but HRV is missing. Check Apple Watch or Oura source permissions."
    });
  }

  if (!ledger.restingHeartRateBpm && ledger.sleepHours) {
    prompts.push({
      signal: "resting_heart_rate",
      label: "Check RHR source",
      href: `#body-ledger-resting_heart_rate`,
      intent: "open_sources",
      copy: "Sleep exists but resting heart rate is missing. Check wearable source coverage."
    });
  }

  if (!ledger.sleepHours) {
    prompts.push({
      signal: "sleep",
      label: "Check sleep source",
      href: `#body-ledger-sleep`,
      intent: "open_sources",
      copy: "Sleep is missing. Connect Apple Health/Oura before making recovery claims."
    });
  }

  return prompts.slice(0, 3);
}

function collectMetricLinks(ledger: NormalizedDailyLedger, dateParam: string): MetricInteraction[] {
  const metrics: MetricInteraction[] = [];

  if (ledger.sleepHours) {
    metrics.push(metricLink("sleep", `${ledger.sleepHours.value.toFixed(1)}h`, ledger.sleepHours.source, dateParam));
  }
  if (ledger.readinessScore) {
    metrics.push(metricLink("readiness", `${ledger.readinessScore.value}`, ledger.readinessScore.source, dateParam));
  }
  metrics.push({
    label: "Coverage",
    metric: "recovery",
    value: `${coveragePercent(ledger)}%`,
    source: "ledger",
    href: `#body-ledger-coverage`,
    intent: "open_metric",
    copy: "Open Body Ledger coverage for today's available and missing rows."
  });
  if (ledger.weightKg) {
    metrics.push(metricLink("weight", `${ledger.weightKg.value.toFixed(1)} kg`, ledger.weightKg.source, dateParam));
  }
  if (ledger.steps) {
    metrics.push(metricLink("steps", `${ledger.steps.value.toLocaleString()} steps`, ledger.steps.source, dateParam));
  }

  return metrics.slice(0, 4);
}

function metricLink(metric: HealthMetric | "readiness", value: string, source: string, dateParam: string): MetricInteraction {
  return {
    label: labelForMetric(metric),
    metric,
    value,
    source,
    href: `/?date=${dateParam}#body-ledger-${metric}`,
    intent: "open_metric",
    copy: `Open the ${labelForMetric(metric).toLowerCase()} Body Ledger row for this day.`
  };
}

function coveragePercent(ledger: NormalizedDailyLedger): number {
  const present = [
    ledger.sleepHours,
    ledger.readinessScore,
    ledger.hrvMs,
    ledger.restingHeartRateBpm,
    ledger.weightKg,
    ledger.meals.length > 0 ? ledger.meals : undefined
  ].filter(Boolean).length;
  return Math.round((present / 6) * 100);
}

function explainMode(
  mode: NormalizedDailyLedger["bodyMode"],
  reasons: string[],
  ledger: NormalizedDailyLedger
): string {
  const reasonCopy = reasons.length ? reasons.join(", ") : "baseline signals look stable";
  const availableInputs = [
    ledger.readinessScore ? "readiness" : undefined,
    ledger.sleepHours ? "sleep" : undefined,
    ledger.temperatureDeviationC ? "temperature" : undefined,
    ledger.stressScore ? "stress" : undefined,
    ledger.calendarPressure ? "calendar pressure" : undefined
  ].filter(Boolean);

  return `${labelForMode(mode)} comes from ${reasonCopy}. Inputs used: ${availableInputs.length ? availableInputs.join(", ") : "none yet"}.`;
}

function headlineForMode(mode: NormalizedDailyLedger["bodyMode"]): string {
  if (mode === "red") return "Shrink the day and protect recovery.";
  if (mode === "yellow") return "Keep routine steady; avoid unnecessary intensity.";
  return "Run the normal plan and capture the missing row.";
}

function planCopyForMode(mode: NormalizedDailyLedger["bodyMode"]): string {
  if (mode === "red") return "Log food, keep movement easy, and prioritize sleep. No diagnosis, just a lower-load operating plan.";
  if (mode === "yellow") return "Walk, keep protein visible, and defer hard training until recovery inputs improve.";
  return "Use the standard day: protein-forward meals, normal movement, and one quick meal or weight check-in.";
}

function labelForMode(mode: NormalizedDailyLedger["bodyMode"]): string {
  return `${mode[0].toUpperCase()}${mode.slice(1)} mode`;
}

function labelForMetric(metric: HealthMetric | "readiness"): string {
  const labels: Record<HealthMetric | "readiness", string> = {
    sleep: "Sleep",
    recovery: "Recovery",
    readiness: "Readiness",
    hrv: "HRV",
    resting_heart_rate: "Resting HR",
    temperature_deviation: "Temperature",
    steps: "Steps",
    workout: "Workout",
    active_energy: "Active energy",
    weight: "Weight",
    meal: "Meals"
  };
  return labels[metric];
}
