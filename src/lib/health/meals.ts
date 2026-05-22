import { createHash } from "node:crypto";
import type { KnownFood, MealEstimateSource, MetricConfidence, MetricValue, RawHealthEvent } from "./types";

export interface MealMacroEstimate {
  estimatedCalories?: MetricValue<number>;
  estimatedProteinGrams?: MetricValue<number>;
  matchedKnownFood?: KnownFood;
  source: MealEstimateSource | "unknown";
  confidence: MetricConfidence;
  notes: string[];
}

export interface MealEstimationInput {
  text?: string;
  photoUrl?: string;
  correctedCalories?: number;
  correctedProteinGrams?: number;
}

export class MealLogService {
  constructor(private readonly knownFoods: KnownFood[] = []) {}

  estimateMacros(input: MealEstimationInput): MealMacroEstimate {
    const notes: string[] = [];

    if (input.correctedCalories !== undefined || input.correctedProteinGrams !== undefined) {
      return {
        estimatedCalories: metric(input.correctedCalories, "manual_entry", "high", "User-corrected meal value."),
        estimatedProteinGrams: metric(input.correctedProteinGrams, "manual_entry", "high", "User-corrected meal value."),
        source: "manual_entry",
        confidence: "high",
        notes: ["Used corrected values; no automatic nutrition values were invented."]
      };
    }

    const matchedKnownFood = input.text ? matchKnownFood(input.text, this.knownFoods) : undefined;
    if (matchedKnownFood) {
      return {
        estimatedCalories: metric(matchedKnownFood.calories, "known_food", "medium", `Matched known food: ${matchedKnownFood.name}.`),
        estimatedProteinGrams: metric(
          matchedKnownFood.proteinGrams,
          "known_food",
          "medium",
          `Matched known food: ${matchedKnownFood.name}.`
        ),
        matchedKnownFood,
        source: "known_food",
        confidence: "medium",
        notes: ["Reused a known food match; confirm serving size if this meal was different."]
      };
    }

    if (input.photoUrl) notes.push("Photo accepted for future estimator routing, but no image macros were inferred in this backend slice.");
    if (input.text) notes.push("Text preserved for future parsing, but no unmatched macros were inferred.");

    return {
      source: "unknown",
      confidence: "unknown",
      notes: notes.length ? notes : ["No estimate available."]
    };
  }
}

export function knownFoodsFromEvents(events: RawHealthEvent[]): KnownFood[] {
  const byId = new Map<string, KnownFood>();

  for (const event of events) {
    if (event.type !== "known_food") continue;
    const food = knownFoodFromPayload(event.payload);
    if (food) byId.set(food.id, food);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function createKnownFoodFromCorrection(input: {
  name: string;
  servingDescription?: string;
  calories?: number;
  proteinGrams?: number;
  tags?: string[];
}): KnownFood {
  const normalizedName = normalizeFoodText(input.name);
  const serving = input.servingDescription?.trim();
  const naturalKey = [normalizedName, serving ?? ""].join("|");
  return {
    id: `known_food:${createHash("sha256").update(naturalKey).digest("hex").slice(0, 16)}`,
    name: input.name.trim(),
    servingDescription: serving || undefined,
    calories: input.calories,
    proteinGrams: input.proteinGrams,
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean)
  };
}

export function createKnownFoodEvent(food: KnownFood, observedAt: string, receivedAt = new Date().toISOString()): RawHealthEvent {
  return {
    id: food.id,
    source: "openclaw",
    type: "known_food",
    observedAt,
    receivedAt,
    externalId: food.id,
    payload: food
  };
}

function matchKnownFood(text: string, knownFoods: KnownFood[]): KnownFood | undefined {
  const normalizedText = normalizeFoodText(text);
  return knownFoods.find((food) => {
    const candidates = [food.name, food.servingDescription, ...(food.tags ?? [])]
      .filter((value): value is string => Boolean(value))
      .map(normalizeFoodText);
    return candidates.some((candidate) => candidate.length >= 3 && normalizedText.includes(candidate));
  });
}

function knownFoodFromPayload(payload: unknown): KnownFood | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") return undefined;
  return {
    id: record.id,
    name: record.name,
    servingDescription: typeof record.servingDescription === "string" ? record.servingDescription : undefined,
    calories: typeof record.calories === "number" && Number.isFinite(record.calories) ? record.calories : undefined,
    proteinGrams: typeof record.proteinGrams === "number" && Number.isFinite(record.proteinGrams) ? record.proteinGrams : undefined,
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : undefined
  };
}

function metric(
  value: number | undefined,
  source: MealEstimateSource,
  confidence: MetricConfidence,
  notes: string
): MetricValue<number> | undefined {
  return value === undefined ? undefined : { value, source, confidence, notes };
}

function normalizeFoodText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
