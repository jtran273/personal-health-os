import { NextResponse, type NextRequest } from "next/server";
import { assertValidDate, buildNormalizedDailyLedger, isValidationError } from "@/lib/health";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import type { RawHealthEvent } from "@/lib/health";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
import { hasOuraCredentials } from "@/lib/providers/oura-oauth";
import {
  fetchOuraDailyActivity,
  fetchOuraDailyCardiovascularAge,
  fetchOuraDailyReadiness,
  fetchOuraDailyResilience,
  fetchOuraDailySleep,
  fetchOuraDailySpo2,
  fetchOuraDailyStress
} from "@/lib/providers/oura";

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

async function tryFetch(label: string, fn: () => Promise<RawHealthEvent[]>): Promise<RawHealthEvent[]> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`Oura ${label} fetch skipped:`, err instanceof Error ? err.message : err);
    return [];
  }
}

export async function syncOuraRequest(store: RawHealthEventStore, body: unknown) {
  const parsed = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const today = new Date().toISOString().slice(0, 10);
  const endDate = assertValidDate(parsed.endDate ?? today, "endDate");
  // Default to a 7-day lookback: Oura finalizes sleep/readiness the morning
  // after, and inserts are deduped, so re-fetching recent days is safe.
  const defaultStart = new Date(`${endDate}T00:00:00.000Z`);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 6);
  const startDate = assertValidDate(
    parsed.startDate ?? defaultStart.toISOString().slice(0, 10),
    "startDate"
  );

  if (!(await hasOuraCredentials())) {
    return {
      synced: false,
      reason: "Oura is not connected. Visit /api/integrations/oura/connect to authorize, or set OURA_PAT."
    };
  }

  const opts = { startDate, endDate };
  const [
    sleepEvents,
    readinessEvents,
    activityEvents,
    resilienceEvents,
    cardioAgeEvents,
    spo2Events,
    stressEvents
  ] = await Promise.all([
    fetchOuraDailySleep(opts),
    fetchOuraDailyReadiness(opts),
    fetchOuraDailyActivity(opts),
    tryFetch("daily_resilience", () => fetchOuraDailyResilience(opts)),
    tryFetch("daily_cardiovascular_age", () => fetchOuraDailyCardiovascularAge(opts)),
    tryFetch("daily_spo2", () => fetchOuraDailySpo2(opts)),
    tryFetch("daily_stress", () => fetchOuraDailyStress(opts))
  ]);

  const events = [
    ...sleepEvents,
    ...readinessEvents,
    ...activityEvents,
    ...resilienceEvents,
    ...cardioAgeEvents,
    ...spo2Events,
    ...stressEvents
  ];
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
