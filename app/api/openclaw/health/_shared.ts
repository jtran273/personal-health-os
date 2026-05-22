import { NextResponse, type NextRequest } from "next/server";
import { authenticateOpenClawHealthRequest, openClawHealthSafetyMetadata } from "@/lib/openclaw/health";

export function requireOpenClawHealthAuth(request: NextRequest): NextResponse | undefined {
  const auth = authenticateOpenClawHealthRequest(request.headers);
  if (auth.ok) return undefined;

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: auth.code,
        message: auth.message
      },
      safety: openClawHealthSafetyMetadata
    },
    { status: auth.status }
  );
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  return request.json().catch(() => ({}));
}

