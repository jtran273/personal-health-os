import { NextResponse, type NextRequest } from "next/server";
import { fetchOuraDailyReadiness, fetchOuraDailySleep } from "@/lib/providers/oura";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    startDate?: string;
    endDate?: string;
  };
  const today = new Date().toISOString().slice(0, 10);
  const startDate = body.startDate ?? today;
  const endDate = body.endDate ?? today;

  if (!process.env.OURA_PAT) {
    return NextResponse.json(
      {
        synced: false,
        reason: "OURA_PAT is not configured.",
        todos: ["Set OURA_PAT in .env.local", "Persist raw Oura events after fetch"]
      },
      { status: 503 }
    );
  }

  const [sleepEvents, readinessEvents] = await Promise.all([
    fetchOuraDailySleep({ startDate, endDate }),
    fetchOuraDailyReadiness({ startDate, endDate })
  ]);

  return NextResponse.json({
    synced: true,
    eventCount: sleepEvents.length + readinessEvents.length,
    todos: ["Persist raw Oura events", "Run ledger normalization"]
  });
}
