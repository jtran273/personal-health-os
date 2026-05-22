import { NextResponse, type NextRequest } from "next/server";
import { buildOpenClawDailySummary } from "@/lib/openclaw/health";
import {
  bodyOSAssistantBridgeSafetyMetadata,
  validateBodyOSAssistantHealthExport,
} from "@/lib/providers/bodyos";
import { readJsonBody, requireOpenClawHealthAuth } from "../_shared";

export async function POST(request: NextRequest) {
  const authResponse = requireOpenClawHealthAuth(request);
  if (authResponse) return authResponse;

  const result = validateBodyOSAssistantHealthExport(await readJsonBody(request));

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        errors: result.errors,
        safety: bodyOSAssistantBridgeSafetyMetadata(),
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      acceptedDays: result.acceptedDays,
      latestDailySummary: result.latestLedger ? buildOpenClawDailySummary(result.latestLedger) : undefined,
      latestHandoffSummary: result.payload?.dailySummaries[0],
      handoff: {
        kind: result.payload?.kind,
        bridgeVersion: result.payload?.bridgeVersion,
        exportedAt: result.payload?.exportedAt,
        healthKitPermission: result.payload?.device.healthKitPermission,
      },
      safety: bodyOSAssistantBridgeSafetyMetadata(),
    },
    { status: 202 }
  );
}
