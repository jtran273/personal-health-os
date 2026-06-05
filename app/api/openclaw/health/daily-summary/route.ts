import { NextResponse, type NextRequest } from "next/server";
import { buildNormalizedDailyLedger } from "@/lib/health";
import { buildOpenClawDailySummary } from "@/lib/openclaw/health";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
import { requireOpenClawHealthAuth } from "../_shared";

export async function GET(request: NextRequest) {
  const authResponse = requireOpenClawHealthAuth(request);
  if (authResponse) return authResponse;

  const today = new Date().toISOString().slice(0, 10);
  const allEvents = await getDefaultRawHealthEventStore().list();
  const { ledger } = buildNormalizedDailyLedger({ date: today, events: allEvents });

  return NextResponse.json(buildOpenClawDailySummary(ledger));
}

