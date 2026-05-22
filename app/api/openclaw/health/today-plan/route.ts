import { NextResponse, type NextRequest } from "next/server";
import { buildOpenClawTodayPlan } from "@/lib/openclaw/health";
import { requireOpenClawHealthAuth } from "../_shared";

export async function GET(request: NextRequest) {
  const authResponse = requireOpenClawHealthAuth(request);
  if (authResponse) return authResponse;

  return NextResponse.json(buildOpenClawTodayPlan());
}

