import type { MetricConfidence, MetricValue, NormalizedDailyLedger, WearableSource } from "@/lib/health";
import { openClawHealthSafetyMetadata } from "@/lib/openclaw/health/safety";

export type BodyOSAssistantExportKind = "bodyos.openclaw.health.daily_export";
export type BodyOSSignalName =
  | "sleep"
  | "readiness"
  | "hrv"
  | "resting_heart_rate"
  | "temperature_deviation"
  | "steps"
  | "active_energy"
  | "weight"
  | "meals";

export interface BodyOSAssistantMetric<TValue = number> {
  value: TValue;
  unit?: string;
  source: WearableSource;
  confidence: MetricConfidence;
  observedAt: string;
  freshnessMinutes: number;
  notes?: string;
}

export interface BodyOSAssistantDailySummary {
  date: string;
  bodyMode?: NormalizedDailyLedger["bodyMode"];
  sleepHours?: BodyOSAssistantMetric<number>;
  readinessScore?: BodyOSAssistantMetric<number>;
  hrvMs?: BodyOSAssistantMetric<number>;
  restingHeartRateBpm?: BodyOSAssistantMetric<number>;
  temperatureDeviationC?: BodyOSAssistantMetric<number>;
  steps?: BodyOSAssistantMetric<number>;
  activeEnergyCalories?: BodyOSAssistantMetric<number>;
  weightKg?: BodyOSAssistantMetric<number>;
  meals?: {
    count: number;
    calories?: BodyOSAssistantMetric<number>;
    proteinGrams?: BodyOSAssistantMetric<number>;
  };
  missingSignals: BodyOSSignalName[];
  sourceAttribution: BodyOSSourceAttribution[];
}

export interface BodyOSSourceAttribution {
  signal: BodyOSSignalName;
  source: WearableSource;
  confidence: MetricConfidence;
  observedAt: string;
  freshnessMinutes: number;
}

export interface BodyOSAssistantHealthExport {
  kind: BodyOSAssistantExportKind;
  bridgeVersion: string;
  exportedAt: string;
  device: {
    app: "BodyOS";
    platform: "iOS";
    healthKitPermission: "granted" | "not_granted" | "not_available" | "unknown";
  };
  dailySummaries: BodyOSAssistantDailySummary[];
  safety: {
    rawHealthKitSamplesIncluded: false;
    rawProviderPayloadsIncluded: false;
    tokenIncluded: false;
  };
}

export interface BodyOSAssistantHandoffResult {
  ok: boolean;
  acceptedDays?: number;
  latestLedger?: NormalizedDailyLedger;
  payload?: BodyOSAssistantHealthExport;
  errors?: string[];
}

const maxDailySummaries = 14;

export function validateBodyOSAssistantHealthExport(input: unknown, now = new Date()): BodyOSAssistantHandoffResult {
  const errors: string[] = [];
  const payload = toRecord(input);

  if (payload.kind !== "bodyos.openclaw.health.daily_export") {
    errors.push("kind must be bodyos.openclaw.health.daily_export.");
  }
  const bridgeVersion = requiredString(payload.bridgeVersion, "bridgeVersion", errors);
  const exportedAt = normalizeIsoDate(payload.exportedAt, "exportedAt", errors);
  const device = toRecord(payload.device);
  if (device.app !== "BodyOS") errors.push("device.app must be BodyOS.");
  if (device.platform !== "iOS") errors.push("device.platform must be iOS.");
  if (!isHealthKitPermission(device.healthKitPermission)) {
    errors.push("device.healthKitPermission is invalid.");
  }

  const safety = toRecord(payload.safety);
  if (safety.rawHealthKitSamplesIncluded !== false) errors.push("raw HealthKit samples are not accepted.");
  if (safety.rawProviderPayloadsIncluded !== false) errors.push("raw provider payloads are not accepted.");
  if (safety.tokenIncluded !== false) errors.push("tokens must not be included in the payload body.");

  if (!Array.isArray(payload.dailySummaries)) {
    errors.push("dailySummaries must be an array.");
  } else if (payload.dailySummaries.length > maxDailySummaries) {
    errors.push(`dailySummaries must include ${maxDailySummaries} days or fewer.`);
  }

  const dailySummaries = Array.isArray(payload.dailySummaries)
    ? payload.dailySummaries.map((summary, index) => validateDailySummary(summary, `dailySummaries[${index}]`, errors))
    : [];

  if (errors.length || !bridgeVersion || !exportedAt || !isHealthKitPermission(device.healthKitPermission)) {
    return { ok: false, errors };
  }

  const normalized: BodyOSAssistantHealthExport = {
    kind: "bodyos.openclaw.health.daily_export",
    bridgeVersion,
    exportedAt,
    device: {
      app: "BodyOS",
      platform: "iOS",
      healthKitPermission: device.healthKitPermission,
    },
    dailySummaries,
    safety: {
      rawHealthKitSamplesIncluded: false,
      rawProviderPayloadsIncluded: false,
      tokenIncluded: false,
    },
  };

  const latest = [...dailySummaries].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    ok: true,
    acceptedDays: dailySummaries.length,
    latestLedger: latest ? buildLedgerFromBodyOSSummary(latest, now) : undefined,
    payload: normalized,
  };
}

export function buildLedgerFromBodyOSSummary(
  summary: BodyOSAssistantDailySummary,
  now = new Date()
): NormalizedDailyLedger {
  return {
    date: summary.date,
    bodyMode: summary.bodyMode ?? "green",
    sleepHours: toMetric(summary.sleepHours),
    readinessScore: toMetric(summary.readinessScore),
    hrvMs: toMetric(summary.hrvMs),
    restingHeartRateBpm: toMetric(summary.restingHeartRateBpm),
    temperatureDeviationC: toMetric(summary.temperatureDeviationC),
    steps: toMetric(summary.steps),
    activeEnergyCalories: toMetric(summary.activeEnergyCalories),
    weightKg: toMetric(summary.weightKg),
    meals: [],
    rawEventIds: [],
    generatedAt: now.toISOString(),
  };
}

export function bodyOSAssistantBridgeSafetyMetadata() {
  return {
    ...openClawHealthSafetyMetadata,
    source: "BodyOS iOS HealthKit ledger export",
    rawHealthKitSamplesIncluded: false,
    localHandoffAllowed: true,
    networkWritesRequire: "OPENCLAW_HEALTH_TOKEN bearer auth; never include tokens in JSON bodies or commits",
  } as const;
}

function validateDailySummary(input: unknown, path: string, errors: string[]): BodyOSAssistantDailySummary {
  const record = toRecord(input);
  const date = validateDate(record.date, `${path}.date`, errors) ?? "1970-01-01";
  const missingSignals = Array.isArray(record.missingSignals)
    ? record.missingSignals.filter(isSignalName)
    : [];
  if (!Array.isArray(record.missingSignals)) errors.push(`${path}.missingSignals must be an array.`);
  if (Array.isArray(record.missingSignals) && missingSignals.length !== record.missingSignals.length) {
    errors.push(`${path}.missingSignals contains unsupported signal names.`);
  }

  const sourceAttribution = Array.isArray(record.sourceAttribution)
    ? record.sourceAttribution.map((item, index) => validateAttribution(item, `${path}.sourceAttribution[${index}]`, errors))
    : [];
  if (!Array.isArray(record.sourceAttribution)) errors.push(`${path}.sourceAttribution must be an array.`);

  const bodyMode = record.bodyMode === undefined || isBodyMode(record.bodyMode) ? record.bodyMode : undefined;
  if (record.bodyMode !== undefined && !isBodyMode(record.bodyMode)) errors.push(`${path}.bodyMode is invalid.`);

  return {
    date,
    bodyMode,
    sleepHours: optionalMetric(record.sleepHours, `${path}.sleepHours`, errors),
    readinessScore: optionalMetric(record.readinessScore, `${path}.readinessScore`, errors),
    hrvMs: optionalMetric(record.hrvMs, `${path}.hrvMs`, errors),
    restingHeartRateBpm: optionalMetric(record.restingHeartRateBpm, `${path}.restingHeartRateBpm`, errors),
    temperatureDeviationC: optionalMetric(record.temperatureDeviationC, `${path}.temperatureDeviationC`, errors),
    steps: optionalMetric(record.steps, `${path}.steps`, errors),
    activeEnergyCalories: optionalMetric(record.activeEnergyCalories, `${path}.activeEnergyCalories`, errors),
    weightKg: optionalMetric(record.weightKg, `${path}.weightKg`, errors),
    meals: validateMeals(record.meals, `${path}.meals`, errors),
    missingSignals,
    sourceAttribution,
  };
}

function validateMeals(input: unknown, path: string, errors: string[]): BodyOSAssistantDailySummary["meals"] {
  if (input === undefined) return undefined;
  const record = toRecord(input);
  const count = typeof record.count === "number" && Number.isInteger(record.count) && record.count >= 0 ? record.count : undefined;
  if (count === undefined) errors.push(`${path}.count must be a non-negative integer.`);
  return {
    count: count ?? 0,
    calories: optionalMetric(record.calories, `${path}.calories`, errors),
    proteinGrams: optionalMetric(record.proteinGrams, `${path}.proteinGrams`, errors),
  };
}

function validateAttribution(input: unknown, path: string, errors: string[]): BodyOSSourceAttribution {
  const record = toRecord(input);
  const signal = isSignalName(record.signal) ? record.signal : "sleep";
  if (!isSignalName(record.signal)) errors.push(`${path}.signal is invalid.`);
  const source = isWearableSource(record.source) ? record.source : "manual";
  if (!isWearableSource(record.source)) errors.push(`${path}.source is invalid.`);
  const confidence = isMetricConfidence(record.confidence) ? record.confidence : "unknown";
  if (!isMetricConfidence(record.confidence)) errors.push(`${path}.confidence is invalid.`);
  const observedAt = normalizeIsoDate(record.observedAt, `${path}.observedAt`, errors) ?? new Date(0).toISOString();
  const freshnessMinutes = nonNegativeNumber(record.freshnessMinutes, `${path}.freshnessMinutes`, errors) ?? 0;
  return { signal, source, confidence, observedAt, freshnessMinutes };
}

function optionalMetric(input: unknown, path: string, errors: string[]): BodyOSAssistantMetric<number> | undefined {
  if (input === undefined || input === null) return undefined;
  const record = toRecord(input);
  const value = typeof record.value === "number" && Number.isFinite(record.value) ? record.value : undefined;
  if (value === undefined) errors.push(`${path}.value must be a finite number.`);
  const source = isWearableSource(record.source) ? record.source : "manual";
  if (!isWearableSource(record.source)) errors.push(`${path}.source is invalid.`);
  const confidence = isMetricConfidence(record.confidence) ? record.confidence : "unknown";
  if (!isMetricConfidence(record.confidence)) errors.push(`${path}.confidence is invalid.`);
  const observedAt = normalizeIsoDate(record.observedAt, `${path}.observedAt`, errors) ?? new Date(0).toISOString();
  const freshnessMinutes = nonNegativeNumber(record.freshnessMinutes, `${path}.freshnessMinutes`, errors) ?? 0;
  const unit = typeof record.unit === "string" ? record.unit : undefined;
  const notes = typeof record.notes === "string" ? record.notes : undefined;
  return { value: value ?? 0, unit, source, confidence, observedAt, freshnessMinutes, notes };
}

function toMetric(metric?: BodyOSAssistantMetric<number>): MetricValue<number> | undefined {
  if (!metric) return undefined;
  return {
    value: metric.value,
    source: metric.source,
    confidence: metric.confidence,
    notes: metric.notes ?? `BodyOS iOS ledger export; observed ${metric.observedAt}, ${metric.freshnessMinutes} minutes fresh.`,
  };
}

function toRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}

function requiredString(value: unknown, field: string, errors: string[]): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  errors.push(`${field} is required.`);
  return undefined;
}

function normalizeIsoDate(value: unknown, field: string, errors: string[]): string | undefined {
  if (typeof value !== "string") {
    errors.push(`${field} must be an ISO date-time string.`);
    return undefined;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    errors.push(`${field} must be a valid ISO date-time string.`);
    return undefined;
  }
  return new Date(time).toISOString();
}

function validateDate(value: unknown, field: string, errors: string[]): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${field} must be a YYYY-MM-DD string.`);
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    errors.push(`${field} must be a real calendar date.`);
    return undefined;
  }
  return value;
}

function nonNegativeNumber(value: unknown, field: string, errors: string[]): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  errors.push(`${field} must be a non-negative number.`);
  return undefined;
}

function isHealthKitPermission(value: unknown): value is BodyOSAssistantHealthExport["device"]["healthKitPermission"] {
  return value === "granted" || value === "not_granted" || value === "not_available" || value === "unknown";
}

function isSignalName(value: unknown): value is BodyOSSignalName {
  return typeof value === "string" && [
    "sleep",
    "readiness",
    "hrv",
    "resting_heart_rate",
    "temperature_deviation",
    "steps",
    "active_energy",
    "weight",
    "meals",
  ].includes(value);
}

function isWearableSource(value: unknown): value is WearableSource {
  return typeof value === "string" && [
    "oura",
    "apple_health",
    "apple_watch",
    "garmin",
    "smart_scale",
    "openclaw",
    "manual",
  ].includes(value);
}

function isMetricConfidence(value: unknown): value is MetricConfidence {
  return value === "high" || value === "medium" || value === "low" || value === "unknown";
}

function isBodyMode(value: unknown): value is NormalizedDailyLedger["bodyMode"] {
  return value === "green" || value === "yellow" || value === "red";
}
