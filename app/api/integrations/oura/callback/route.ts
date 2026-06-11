import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeOuraAuthorizationCode,
  ouraOAuthStateCookie,
  resolveOuraRedirectUri
} from "@/lib/providers/oura-oauth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const providerError = params.get("error");
  if (providerError) {
    return htmlResponse(
      400,
      "Oura connection failed",
      `Oura returned an error during authorization: ${providerError}. You can retry from /api/integrations/oura/connect.`
    );
  }

  const state = params.get("state");
  const expectedState = request.cookies.get(ouraOAuthStateCookie)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return htmlResponse(
      400,
      "Oura connection failed",
      "OAuth state mismatch. Restart the flow from /api/integrations/oura/connect."
    );
  }

  const code = params.get("code");
  if (!code) {
    return htmlResponse(
      400,
      "Oura connection failed",
      "Missing authorization code. Restart the flow from /api/integrations/oura/connect."
    );
  }

  try {
    await exchangeOuraAuthorizationCode({
      code,
      redirectUri: resolveOuraRedirectUri(request.nextUrl.origin)
    });
  } catch (error) {
    console.error("Oura code exchange failed:", error);
    return htmlResponse(
      502,
      "Oura connection failed",
      "Exchanging the authorization code with Oura failed. Check OURA_CLIENT_ID/OURA_CLIENT_SECRET and retry from /api/integrations/oura/connect."
    );
  }

  const response = htmlResponse(
    200,
    "Oura connected",
    "Your Oura Ring is connected. You can close this tab; syncs will now use OAuth tokens."
  );
  response.cookies.set(ouraOAuthStateCookie, "", {
    httpOnly: true,
    path: "/api/integrations/oura",
    maxAge: 0
  });
  return response;
}

function htmlResponse(status: number, title: string, message: string): NextResponse {
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
    <h1 style="font-size: 1.25rem;">${title}</h1>
    <p>${message}</p>
  </body>
</html>`;

  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
