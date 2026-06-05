import { NextResponse, type NextRequest } from "next/server";
import { assertValidDate, buildNormalizedDailyLedger, isValidationError } from "@/lib/health";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import type { RawHealthEvent } from "@/lib/health";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
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
  const startDate = assertValidDate(parsed.startDate ?? today, "startDate");
  const endDate = assertValidDate(parsed.endDate ?? startDate, "endDate");

  if (!process.env.OURA_PAT) {
    return {
      synced: false,
      reason: "OURA_PAT is not configured."
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
