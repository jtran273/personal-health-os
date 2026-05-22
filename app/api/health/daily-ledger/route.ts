import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildNormalizedDailyLedger, isValidationError, assertValidDate } from "@/lib/health";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    return NextResponse.json(await buildDailyLedgerResponse(getDefaultRawHealthEventStore(), date));
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function buildDailyLedgerResponse(store: RawHealthEventStore, date: string) {
  const validDate = assertValidDate(date);
  const events = await store.list();
  const result = buildNormalizedDailyLedger({ date: validDate, events });

  return {
    ledger: result.ledger,
    bodyModeReasons: result.bodyModeReasons
  };
}
