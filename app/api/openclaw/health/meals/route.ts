import { NextResponse, type NextRequest } from "next/server";
import {
  openClawHealthSafetyMetadata,
  validateAndNormalizeMealIngestion,
  type OpenClawMealIngestionInput
} from "@/lib/openclaw/health";
import { readJsonBody, requireOpenClawHealthAuth } from "../_shared";

export async function POST(request: NextRequest) {
  const authResponse = requireOpenClawHealthAuth(request);
  if (authResponse) return authResponse;

  const body = (await readJsonBody(request)) as OpenClawMealIngestionInput;
  const result = validateAndNormalizeMealIngestion(body);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        errors: result.errors,
        safety: openClawHealthSafetyMetadata
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ingestion: result.value,
      note: "Accepted as a bounded ingestion event only. This is not medical advice.",
      safety: openClawHealthSafetyMetadata
    },
    { status: 202 }
  );
}

