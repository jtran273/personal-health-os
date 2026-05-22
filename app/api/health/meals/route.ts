import { NextResponse, type NextRequest } from "next/server";
import { assertValidDate, buildNormalizedDailyLedger, isValidationError, validateMealInput } from "@/lib/health";
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
  const event = createOpenClawMealEvent(input);
  const write = await store.insert(event);
  const result = buildNormalizedDailyLedger({
    date: event.observedAt.slice(0, 10),
    events: await store.list()
  });

  const meal = result.ledger.meals.find((candidate) => candidate.id === event.id);
  return {
    accepted: write.inserted === 1,
    deduped: write.skipped === 1,
    meal,
    eventId: event.id
  };
}
