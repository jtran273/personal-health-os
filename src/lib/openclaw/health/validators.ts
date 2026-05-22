import type { MealLog, MetricValue, RawHealthEvent } from "@/lib/health";

const maxMealTextLength = 1000;
const minWeightKg = 35;
const maxWeightKg = 250;

export interface ValidationResult<TValue> {
  ok: boolean;
  value?: TValue;
  errors?: string[];
}

export interface OpenClawMealIngestionInput {
  text?: unknown;
  photoUrl?: unknown;
  loggedAt?: unknown;
  estimatedCalories?: unknown;
  estimatedProteinGrams?: unknown;
}

export interface AcceptedMealIngestion {
  eventType: "meal_ingestion";
  meal: MealLog;
  acceptedAt: string;
}

export interface OpenClawWeightIngestionInput {
  weightKg?: unknown;
  loggedAt?: unknown;
}

export interface AcceptedWeightIngestion {
  eventType: "weight_ingestion";
  event: RawHealthEvent<{ weightKg: number }>;
  acceptedAt: string;
}

export function validateAndNormalizeMealIngestion(
  payload: unknown,
  now = new Date()
): ValidationResult<AcceptedMealIngestion> {
  const input = toRecord(payload);
  const errors: string[] = [];
  const acceptedAt = now.toISOString();
  const text = normalizeOptionalText(input.text);
  const photoUrl = normalizeOptionalText(input.photoUrl);
  const loggedAt = normalizeOptionalIsoDate(input.loggedAt, "loggedAt", errors) ?? acceptedAt;
  const estimatedCalories = normalizeOptionalNumber(input.estimatedCalories, "estimatedCalories", 0, 5000, errors);
  const estimatedProteinGrams = normalizeOptionalNumber(
    input.estimatedProteinGrams,
    "estimatedProteinGrams",
    0,
    350,
    errors
  );

  if (!text && !photoUrl) {
    errors.push("Provide at least one of text or photoUrl.");
  }

  if (text && text.length > maxMealTextLength) {
    errors.push(`text must be ${maxMealTextLength} characters or fewer.`);
  }

  if (photoUrl && !isHttpUrl(photoUrl)) {
    errors.push("photoUrl must be an http or https URL.");
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  const meal: MealLog = {
    id: `openclaw:meal:${loggedAt}`,
    source: "openclaw",
    loggedAt,
    text,
    photoUrl
  };

  if (estimatedCalories !== undefined) {
    meal.estimatedCalories = estimatedMetric(estimatedCalories, "OpenClaw user-provided estimate.");
  }

  if (estimatedProteinGrams !== undefined) {
    meal.estimatedProteinGrams = estimatedMetric(estimatedProteinGrams, "OpenClaw user-provided estimate.");
  }

  return {
    ok: true,
    value: {
      eventType: "meal_ingestion",
      meal,
      acceptedAt
    }
  };
}

export function validateAndNormalizeWeightIngestion(
  payload: unknown,
  now = new Date()
): ValidationResult<AcceptedWeightIngestion> {
  const input = toRecord(payload);
  const errors: string[] = [];
  const acceptedAt = now.toISOString();
  const weightKg = normalizeOptionalNumber(input.weightKg, "weightKg", minWeightKg, maxWeightKg, errors);
  const loggedAt = normalizeOptionalIsoDate(input.loggedAt, "loggedAt", errors) ?? acceptedAt;

  if (weightKg === undefined) {
    errors.push("weightKg is required.");
  }

  if (errors.length || weightKg === undefined) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      eventType: "weight_ingestion",
      event: {
        id: `openclaw:weight:${loggedAt}`,
        source: "openclaw",
        type: "weight",
        observedAt: loggedAt,
        receivedAt: acceptedAt,
        payload: { weightKg }
      },
      acceptedAt
    }
  };
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function toRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload as Record<string, unknown>;
}

function normalizeOptionalIsoDate(value: unknown, field: string, errors: string[]): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    errors.push(`${field} must be an ISO-8601 string when provided.`);
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${field} must be a valid ISO-8601 date.`);
    return undefined;
  }

  return parsed.toISOString();
}

function normalizeOptionalNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
  errors: string[]
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${field} must be a finite number.`);
    return undefined;
  }

  if (value < min || value > max) {
    errors.push(`${field} must be between ${min} and ${max}.`);
    return undefined;
  }

  return value;
}

function estimatedMetric(value: number, notes: string): MetricValue<number> {
  return {
    value,
    source: "openclaw",
    confidence: "medium",
    notes
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
