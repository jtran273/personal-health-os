import { NextResponse } from "next/server";
import { classifyBodyMode, type NormalizedDailyLedger } from "@/lib/health";

export async function GET() {
  const bodyMode = classifyBodyMode({
    readinessScore: { value: 72, source: "apple_health", confidence: "medium" },
    sleepHours: { value: 7.1, source: "apple_health", confidence: "medium" }
  });

  const ledger: NormalizedDailyLedger = {
    date: new Date().toISOString().slice(0, 10),
    bodyMode: bodyMode.mode,
    readinessScore: { value: 72, source: "apple_health", confidence: "medium" },
    sleepHours: { value: 7.1, source: "apple_health", confidence: "medium" },
    meals: [],
    rawEventIds: [],
    generatedAt: new Date().toISOString()
  };

  return NextResponse.json({
    ledger,
    bodyModeReasons: bodyMode.reasons,
    todos: ["Connect persistence", "Normalize provider payloads", "Expose OpenClaw daily summary"]
  });
}
