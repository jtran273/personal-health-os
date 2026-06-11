import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDefaultRawHealthEventStore } from "@/lib/health/server-store";
import {
  formatSmartScaleMeasurementAsEvents,
  parseWithingsMeasureGroup,
  type WithingsGetmeasResponse,
  type WithingsWebhookPayload
} from "@/lib/providers/smart-scale";

const WITHINGS_APPLI_BODY = 1;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const hmacSecret = process.env.WITHINGS_HMAC_SECRET;
    if (hmacSecret) {
      const signature = request.headers.get("x-withings-signature") ?? "";
      const expected = createHmac("sha256", hmacSecret).update(rawBody).digest("hex");
      if (signature !== expected) {
        return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
      }
    }

    const params = new URLSearchParams(rawBody);
    const payload: WithingsWebhookPayload = {
      userid: Number(params.get("userid") ?? "0"),
      startdate: Number(params.get("startdate") ?? "0"),
      enddate: Number(params.get("enddate") ?? "0"),
      appli: Number(params.get("appli") ?? "-1")
    };

    if (payload.appli !== WITHINGS_APPLI_BODY) {
      return NextResponse.json({ ok: true, eventsWritten: 0 });
    }

    const token = process.env.WITHINGS_ACCESS_TOKEN;
    if (!token) {
      console.warn("WITHINGS_ACCESS_TOKEN not configured; skipping measurement fetch.");
      return NextResponse.json({ ok: true, eventsWritten: 0 });
    }

    let getMeasData: WithingsGetmeasResponse;
    try {
      const body = new URLSearchParams({
        action: "getmeas",
        startdate: String(payload.startdate),
        enddate: String(payload.enddate),
        category: "1"
      });
      const resp = await fetch("https://wbsapi.withings.net/measure", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
      if (!resp.ok) {
        console.error(`Withings getmeas returned ${resp.status}; acking anyway.`);
        return NextResponse.json({ ok: true, eventsWritten: 0 });
      }
      getMeasData = (await resp.json()) as WithingsGetmeasResponse;
    } catch (err) {
      console.error("Withings API fetch failed:", err);
      return NextResponse.json({ ok: true, eventsWritten: 0 });
    }

    const groups = getMeasData.body?.measuregrps ?? [];
    const events = groups.flatMap((grp) => {
      const measurement = parseWithingsMeasureGroup(grp);
      return measurement ? formatSmartScaleMeasurementAsEvents(measurement, "withings") : [];
    });

    const store = getDefaultRawHealthEventStore();
    const writeResult = await store.insertMany(events);

    return NextResponse.json({ ok: true, eventsWritten: writeResult.inserted });
  } catch (err) {
    console.error("Withings webhook handler error:", err);
    return NextResponse.json({ ok: true, eventsWritten: 0 });
  }
}
