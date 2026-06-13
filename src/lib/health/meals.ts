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

    // Explicit macros the user typed for this meal are the most specific signal, so they
    // outrank known-food reuse. We only ever surface numbers the text actually stated.
    if (input.text) {
      const stated = parseStatedMacros(input.text);
      if (stated.calories !== undefined || stated.proteinGrams !== undefined) {
        const confidence: MetricConfidence = stated.hedged ? "medium" : "high";
        const note = stated.hedged
          ? "Parsed an approximate value you stated in text; correct it if the portion was different."
          : "Parsed explicit calorie/protein values stated in the meal text.";
        return {
          estimatedCalories: metric(stated.calories, "meal_text", confidence, note),
          estimatedProteinGrams: metric(stated.proteinGrams, "meal_text", confidence, note),
          source: "meal_text",
          confidence,
          notes: ["Used only values stated in the meal text; no macros were invented.", ...stated.outOfRangeNotes]
        };
      }
    }

    const matchedFoods = input.text ? matchKnownFoods(input.text, this.knownFoods) : [];

    if (matchedFoods.length === 1) {
      const food = matchedFoods[0];
      return {
        estimatedCalories: metric(food.calories, "known_food", "medium", `Matched known food: ${food.name}.`),
        estimatedProteinGrams: metric(food.proteinGrams, "known_food", "medium", `Matched known food: ${food.name}.`),
        matchedKnownFood: food,
        source: "known_food",
        confidence: "medium",
        notes: ["Reused a known food match; confirm serving size if this meal was different."]
      };
    }

    if (matchedFoods.length > 1) {
      const calories = sumDefined(matchedFoods.map((food) => food.calories));
      const proteinGrams = sumDefined(matchedFoods.map((food) => food.proteinGrams));
      const names = matchedFoods.map((food) => food.name).join(", ");
      return {
        estimatedCalories: metric(calories, "known_food", "medium", `Summed known foods: ${names}.`),
        estimatedProteinGrams: metric(proteinGrams, "known_food", "medium", `Summed known foods: ${names}.`),
        source: "known_food",
        confidence: "medium",
        notes: [
          `Summed ${matchedFoods.length} known foods (${names}); correct the total if a serving differed or an item was missed.`
        ]
      };
    }

    if (input.photoUrl) notes.push("Photo accepted for future estimator routing, but no image macros were inferred in this backend slice.");
    if (input.text) notes.push("Text preserved, but no known food matched and no explicit macros were stated, so nothing was invented.");

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

// Returns every distinct known food whose name/serving/tag appears in the text, so a
// single message like "chicken rice bowl and a protein shake" can resolve to both foods.
// When two matches overlap (e.g. "rice" inside "chicken rice bowl") we keep the longer,
// more specific one to avoid double-counting. A single match preserves the original
// first-match contract exactly.
function matchKnownFoods(text: string, knownFoods: KnownFood[]): KnownFood[] {
  const normalizedText = normalizeFoodText(text);
  const matched: { food: KnownFood; matchKey: string }[] = [];

  for (const food of knownFoods) {
    const matchKey = [food.name, food.servingDescription, ...(food.tags ?? [])]
      .filter((value): value is string => Boolean(value))
      .map(normalizeFoodText)
      .filter((candidate) => candidate.length >= 3 && normalizedText.includes(candidate))
      .sort((a, b) => b.length - a.length)[0];
    if (matchKey) matched.push({ food, matchKey });
  }

  return matched
    .filter((entry, _index, all) =>
      !all.some((other) => other.food.id !== entry.food.id && other.matchKey.length > entry.matchKey.length && other.matchKey.includes(entry.matchKey))
    )
    .map((entry) => entry.food);
}

interface StatedMacros {
  calories?: number;
  proteinGrams?: number;
  hedged: boolean;
  outOfRangeNotes: string[];
}

// Pulls only macros the user explicitly typed (e.g. "~600 cal, 40g protein"). It never
// guesses from bare food names — text with no stated numbers returns nothing here.
function parseStatedMacros(text: string): StatedMacros {
  const lower = text.toLowerCase();
  const hedged = /(~|\babout\b|\bapprox(?:imately)?\b|\broughly\b|\baround\b)/.test(lower);
  const outOfRangeNotes: string[] = [];

  let calories = firstCapturedNumber(lower, [
    /(\d{2,5})\s*k?cal(?:orie)?s?\b/,
    /\bk?cal(?:orie)?s?\s*[:=]?\s*(\d{2,5})\b/
  ]);
  if (calories !== undefined && (calories < 50 || calories > 6000)) {
    outOfRangeNotes.push(`Ignored a stated calorie value (${calories}) outside the plausible 50-6000 range.`);
    calories = undefined;
  }

  let proteinGrams = firstCapturedNumber(lower, [
    /(\d{1,4})\s*g(?:rams)?\s*(?:of\s+)?protein\b/,
    /\bprotein\s*[:=]?\s*(\d{1,4})\s*g(?:rams)?\b/
  ]);
  if (proteinGrams !== undefined && (proteinGrams < 1 || proteinGrams > 400)) {
    outOfRangeNotes.push(`Ignored a stated protein value (${proteinGrams}g) outside the plausible 1-400g range.`);
    proteinGrams = undefined;
  }

  return { calories, proteinGrams, hedged, outOfRangeNotes };
}

function firstCapturedNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return undefined;
}

function sumDefined(values: (number | undefined)[]): number | undefined {
  const present = values.filter((value): value is number => value !== undefined);
  return present.length ? present.reduce((sum, value) => sum + value, 0) : undefined;
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
