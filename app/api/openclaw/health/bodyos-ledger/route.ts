import { NextResponse, type NextRequest } from "next/server";
import { buildOpenClawDailySummary } from "@/lib/openclaw/health";
import {
  bodyOSAssistantBridgeSafetyMetadata,
  validateBodyOSAssistantHealthExport,
  type BodyOSAssistantDailySummary,
} from "@/lib/providers/bodyos";
import type { RawHealthEvent } from "@/lib/health";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
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

  const receivedAt = new Date().toISOString();
  const events: RawHealthEvent[] = (result.payload?.dailySummaries ?? []).map(
    (summary: BodyOSAssistantDailySummary): RawHealthEvent => ({
      id: "",
      source: "openclaw",
      type: "bodyos_daily_summary",
      observedAt: `${summary.date}T00:00:00.000Z`,
      receivedAt,
      externalId: `bodyos:daily:${summary.date}`,
      payload: summary
    })
  );

  await getDefaultRawHealthEventStore().insertMany(events);

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
