import { NextResponse, type NextRequest } from "next/server";
import {
  assertValidDate,
  buildNormalizedDailyLedger,
  createKnownFoodEvent,
  createKnownFoodFromCorrection,
  isValidationError,
  knownFoodsFromEvents,
  MealLogService,
  validateMealInput
} from "@/lib/health";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
import { createOpenClawMealEvent } from "@/lib/providers/openclaw";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    return NextResponse.json(await buildMealsResponse(getDefaultRawHealthEventStore(), date));
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await ingestMealRequest(getDefaultRawHealthEventStore(), await request.json());
    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function buildMealsResponse(store: RawHealthEventStore, date: string) {
  const validDate = assertValidDate(date);
  const events = await store.list();
  const result = buildNormalizedDailyLedger({ date: validDate, events });
  return { meals: result.ledger.meals };
}

export async function ingestMealRequest(store: RawHealthEventStore, body: unknown) {
  const input = validateMealInput(body);
  const existingEvents = await store.list();
  const service = new MealLogService(knownFoodsFromEvents(existingEvents));
  const estimate = service.estimateMacros(input);
  const event = createOpenClawMealEvent(input);

  event.payload = {
    ...(event.payload as Record<string, unknown>),
    estimatedCalories: estimate.estimatedCalories?.value,
    estimatedCaloriesSource: estimate.estimatedCalories?.source,
    estimatedProteinGrams: estimate.estimatedProteinGrams?.value,
    estimatedProteinGramsSource: estimate.estimatedProteinGrams?.source,
    estimationConfidence: estimate.confidence,
    entrySource: estimate.source,
    knownFoodId: estimate.matchedKnownFood?.id,
    knownFoodName: estimate.matchedKnownFood?.name,
    estimationNotes: estimate.notes
  };

  const eventsToInsert = [event];
  let knownFood = estimate.matchedKnownFood;
  if (input.saveAsKnownFood) {
    knownFood = createKnownFoodFromCorrection({
      name: input.knownFoodName ?? input.text ?? "Corrected meal",
      servingDescription: input.servingDescription,
      calories: input.correctedCalories,
      proteinGrams: input.correctedProteinGrams,
      tags: input.text ? [input.text] : undefined
    });
    eventsToInsert.push(createKnownFoodEvent(knownFood, event.observedAt));
    (event.payload as Record<string, unknown>).knownFoodId = knownFood.id;
    (event.payload as Record<string, unknown>).knownFoodName = knownFood.name;
  }

  const write = await store.insertMany(eventsToInsert);
  const result = buildNormalizedDailyLedger({
    date: event.observedAt.slice(0, 10),
    events: await store.list()
  });

  const meal = result.ledger.meals.find((candidate) => candidate.id === event.id);
  return {
    accepted: write.inserted > 0,
    deduped: write.skipped >= eventsToInsert.length,
    meal,
    knownFood,
    estimate: { source: estimate.source, confidence: estimate.confidence, notes: estimate.notes },
    eventId: event.id
  };
}
