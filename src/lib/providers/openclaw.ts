import type { MealLog, RawHealthEvent } from "@/lib/health";
import { deterministicRawEventId } from "@/lib/health/ledger";
import type { OpenClawMealInput, OpenClawWeightInput } from "@/lib/health/validation";

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

export function createOpenClawMealEvent(input: OpenClawMealInput): RawHealthEvent {
  const observedAt = input.loggedAt ?? new Date().toISOString();
  const event: RawHealthEvent = {
    id: "",
    source: "openclaw",
    type: "openclaw_meal",
    observedAt,
    receivedAt: new Date().toISOString(),
    externalId: input.externalId,
    payload: {
      text: input.text,
      photoUrl: input.photoUrl,
      correctedCalories: input.correctedCalories,
      correctedProteinGrams: input.correctedProteinGrams,
      saveAsKnownFood: input.saveAsKnownFood,
      knownFoodName: input.knownFoodName,
      servingDescription: input.servingDescription
    }
  };

  return { ...event, id: deterministicRawEventId(event) };
}

export function createOpenClawWeightEvent(input: OpenClawWeightInput): RawHealthEvent {
  const observedAt = input.loggedAt ?? new Date().toISOString();
  const event: RawHealthEvent = {
    id: "",
    source: "openclaw",
    type: "weight",
    observedAt,
    receivedAt: new Date().toISOString(),
    externalId: input.externalId,
    payload: {
      weightKg: input.weightKg
    }
  };

  return { ...event, id: deterministicRawEventId(event) };
}
