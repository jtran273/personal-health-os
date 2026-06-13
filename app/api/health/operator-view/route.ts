import { NextResponse, type NextRequest } from "next/server";
import { buildOperatorView } from "@/lib/health/operator-view";
import { isValidationError } from "@/lib/health";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";

export async function GET(request: NextRequest) {
  try {
    const endDate =
      request.nextUrl.searchParams.get("endDate") ??
      request.nextUrl.searchParams.get("date") ??
      new Date().toISOString().slice(0, 10);
    const days = readDaysParam(request.nextUrl.searchParams.get("days"));

    return NextResponse.json(await buildOperatorViewResponse(getDefaultRawHealthEventStore(), { endDate, days }));
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function buildOperatorViewResponse(
  store: RawHealthEventStore,
  options: { endDate: string; days?: number; generatedAt?: string }
) {
  const events = await store.list();
  return buildOperatorView({ ...options, events });
}

function readDaysParam(value: string | null): number | undefined {
  if (value === null) return undefined;
  const days = Number(value);
  return Number.isInteger(days) ? days : Number.NaN;
}
