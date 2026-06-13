import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildWeeklyCalorieCalibration, isValidationError, ValidationError } from "@/lib/health";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";

const defaultWindowDays = 14;

export async function GET(request: NextRequest) {
  try {
    const windowDays = parseWindowDays(request.nextUrl.searchParams.get("window"));
    return NextResponse.json(await buildHealthCalibrationResponse(getDefaultRawHealthEventStore(), windowDays));
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function buildHealthCalibrationResponse(
  store: RawHealthEventStore,
  windowDays = defaultWindowDays,
  endDate?: string
) {
  const events = await store.list();
  return buildWeeklyCalorieCalibration({ events, windowDays, endDate });
}

function parseWindowDays(value: string | null): number {
  if (value === null) return defaultWindowDays;
  if (!/^\d+$/.test(value)) {
    throw new ValidationError("window must be an integer between 7 and 28.");
  }
  const windowDays = Number(value);
  if (windowDays < 7 || windowDays > 28) {
    throw new ValidationError("window must be an integer between 7 and 28.");
  }
  return windowDays;
}
