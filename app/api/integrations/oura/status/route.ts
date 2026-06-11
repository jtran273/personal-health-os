import { NextResponse } from "next/server";
import { readOuraTokens } from "@/lib/providers/oura-token-store";

export async function GET() {
  const tokens = await readOuraTokens();
  if (tokens) {
    return NextResponse.json({
      connected: true,
      method: "oauth",
      expiresAt: tokens.expiresAt
    });
  }

  if (process.env.OURA_PAT) {
    return NextResponse.json({ connected: true, method: "pat" });
  }

  return NextResponse.json({ connected: false, method: null });
}
