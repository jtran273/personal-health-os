import { NextResponse, type NextRequest } from "next/server";
import { assertValidDate, buildNormalizedDailyLedger, isValidationError } from "@/lib/health";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
import { fetchOuraDailyActivity, fetchOuraDailyReadiness, fetchOuraDailySleep } from "@/lib/providers/oura";

export async function POST(request: NextRequest) {
  try {
    const response = await syncOuraRequest(getDefaultRawHealthEventStore(), await request.json().catch(() => ({})));
    return NextResponse.json(response, { status: response.synced ? 200 : 503 });
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function syncOuraRequest(store: RawHealthEventStore, body: unknown) {
  const parsed = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const today = new Date().toISOString().slice(0, 10);
  const startDate = assertValidDate(parsed.startDate ?? today, "startDate");
  const endDate = assertValidDate(parsed.endDate ?? startDate, "endDate");

  if (!process.env.OURA_PAT) {
    return {
      synced: false,
      reason: "OURA_PAT is not configured."
    };
  }

  const [sleepEvents, readinessEvents, activityEvents] = await Promise.all([
    fetchOuraDailySleep({ startDate, endDate }),
    fetchOuraDailyReadiness({ startDate, endDate }),
    fetchOuraDailyActivity({ startDate, endDate })
  ]);

  const events = [...sleepEvents, ...readinessEvents, ...activityEvents];
  const write = await store.insertMany(events);
  const normalized = buildNormalizedDailyLedger({
    date: endDate,
    events: await store.list()
  });

  return {
    synced: true,
    fetchedEventCount: events.length,
    insertedEventCount: write.inserted,
    skippedDuplicateCount: write.skipped,
    ledger: normalized.ledger,
    bodyModeReasons: normalized.bodyModeReasons
  };
}
