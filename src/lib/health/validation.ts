import type { RawHealthEvent, WearableSource } from "./types";

const sources = new Set<WearableSource>([
  "oura",
  "apple_health",
  "apple_watch",
  "garmin",
  "smart_scale",
  "openclaw",
  "manual"
]);

export interface OpenClawMealInput {
  text?: string;
  photoUrl?: string;
  loggedAt?: string;
  externalId?: string;
}

export interface OpenClawWeightInput {
  weightKg: number;
  loggedAt?: string;
  externalId?: string;
}

export function assertValidDate(value: unknown, field = "date"): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be a YYYY-MM-DD string.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} must be a real calendar date.`);
  }

  return value;
}

export function assertValidIsoDateTime(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be an ISO date-time string.`);
  }

  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new ValidationError(`${field} must be a valid ISO date-time string.`);
  }

  return new Date(time).toISOString();
}

export function validateMealInput(input: unknown): OpenClawMealInput {
  if (!isRecord(input)) {
    throw new ValidationError("Meal input must be an object.");
  }

  const text = optionalString(input.text, "text");
  const photoUrl = optionalString(input.photoUrl, "photoUrl");
  const loggedAt = input.loggedAt === undefined ? undefined : assertValidIsoDateTime(input.loggedAt, "loggedAt");
  const externalId = optionalString(input.externalId, "externalId");

  if (!text && !photoUrl) {
    throw new ValidationError("Meal input requires text or photoUrl.");
  }

  return { text, photoUrl, loggedAt, externalId };
}

export function validateWeightInput(input: unknown): OpenClawWeightInput {
  if (!isRecord(input)) {
    throw new ValidationError("Weight input must be an object.");
  }

  if (typeof input.weightKg !== "number" || !Number.isFinite(input.weightKg)) {
    throw new ValidationError("weightKg must be a finite number.");
  }

  if (input.weightKg < 25 || input.weightKg > 350) {
    throw new ValidationError("weightKg is outside the accepted range.");
  }

  const loggedAt = input.loggedAt === undefined ? undefined : assertValidIsoDateTime(input.loggedAt, "loggedAt");
  const externalId = optionalString(input.externalId, "externalId");

  return { weightKg: input.weightKg, loggedAt, externalId };
}

export function validateRawHealthEvent(input: unknown): RawHealthEvent {
  if (!isRecord(input)) {
    throw new ValidationError("Raw event must be an object.");
  }

  const id = optionalString(input.id, "id") ?? "";
  const source = input.source;
  if (typeof source !== "string" || !sources.has(source as WearableSource)) {
    throw new ValidationError("source is not supported.");
  }

  if (typeof input.type !== "string" || input.type.length === 0) {
    throw new ValidationError("type is required.");
  }

  const observedAt = assertValidIsoDateTime(input.observedAt, "observedAt");
  const receivedAt = assertValidIsoDateTime(input.receivedAt, "receivedAt");
  const externalId = optionalString(input.externalId, "externalId");

  if (!("payload" in input)) {
    throw new ValidationError("payload is required.");
  }

  return {
    id,
    source: source as WearableSource,
    type: input.type,
    observedAt,
    receivedAt,
    externalId,
    payload: input.payload
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
