import type { MealLog, RawHealthEvent } from "@/lib/health";

export interface OpenClawMealInput {
  text?: string;
  photoUrl?: string;
  loggedAt?: string;
}

export interface OpenClawWeightInput {
  weightKg: number;
  loggedAt?: string;
}

export function createMealLogFromOpenClaw(input: OpenClawMealInput): MealLog {
  const loggedAt = input.loggedAt ?? new Date().toISOString();

  return {
    id: `openclaw:meal:${loggedAt}`,
    source: "openclaw",
    loggedAt,
    text: input.text,
    photoUrl: input.photoUrl
  };
}

export function createOpenClawWeightEvent(input: OpenClawWeightInput): RawHealthEvent {
  const observedAt = input.loggedAt ?? new Date().toISOString();

  return {
    id: `openclaw:weight:${observedAt}`,
    source: "openclaw",
    type: "weight",
    observedAt,
    receivedAt: new Date().toISOString(),
    payload: {
      weightKg: input.weightKg
    }
  };
}
