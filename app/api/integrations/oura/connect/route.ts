import { NextResponse, type NextRequest } from "next/server";
import {
  buildOuraAuthorizeUrl,
  createOuraOAuthState,
  ouraOAuthStateCookie,
  resolveOuraRedirectUri
} from "@/lib/providers/oura-oauth";

export async function GET(request: NextRequest) {
  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "OURA_CLIENT_ID is not configured." }, { status: 503 });
  }

  const state = createOuraOAuthState();
  const authorizeUrl = buildOuraAuthorizeUrl({
    clientId,
    redirectUri: resolveOuraRedirectUri(request.nextUrl.origin),
    state
  });

  const response = NextResponse.redirect(authorizeUrl, 302);
  response.cookies.set(ouraOAuthStateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/api/integrations/oura",
    maxAge: 600
  });
  return response;
}
