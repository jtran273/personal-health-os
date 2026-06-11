import { randomBytes } from "node:crypto";
import {
  readOuraTokens,
  writeOuraTokens,
  type OuraTokenSet
} from "./oura-token-store";

const ouraAuthorizeBaseUrl = "https://cloud.ouraring.com/oauth/authorize";
const ouraTokenUrl = "https://api.ouraring.com/oauth/token";

// Refresh ahead of expiry so in-flight API calls don't race an expiring token.
const refreshSkewMs = 60_000;

export const ouraDefaultScopes = [
  "email",
  "personal",
  "daily",
  "heartrate",
  "workout",
  "tag",
  "session",
  "spo2"
];

interface OuraOAuthClientOptions {
  clientId?: string;
  clientSecret?: string;
  tokenPath?: string;
}

interface OuraTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export const ouraOAuthStateCookie = "oura_oauth_state";

export function createOuraOAuthState(): string {
  return randomBytes(16).toString("hex");
}

export function resolveOuraRedirectUri(origin: string): string {
  return process.env.OURA_REDIRECT_URI ?? new URL("/api/integrations/oura/callback", origin).toString();
}

export function buildOuraAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}): string {
  const url = new URL(ouraAuthorizeBaseUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("scope", (options.scopes ?? ouraDefaultScopes).join(" "));
  url.searchParams.set("state", options.state);
  return url.toString();
}

export async function exchangeOuraAuthorizationCode(
  options: { code: string; redirectUri: string } & OuraOAuthClientOptions
): Promise<OuraTokenSet> {
  const tokens = await requestOuraTokens(
    {
      grant_type: "authorization_code",
      code: options.code,
      redirect_uri: options.redirectUri
    },
    options
  );
  await writeOuraTokens(tokens, options.tokenPath);
  return tokens;
}

export async function refreshOuraTokens(
  refreshToken: string,
  options: OuraOAuthClientOptions = {}
): Promise<OuraTokenSet> {
  const tokens = await requestOuraTokens(
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken
    },
    options
  );
  await writeOuraTokens(tokens, options.tokenPath);
  return tokens;
}

export async function getOuraAccessToken(
  options: OuraOAuthClientOptions & { forceRefresh?: boolean } = {}
): Promise<string | null> {
  const stored = await readOuraTokens(options.tokenPath);
  if (!stored) {
    return process.env.OURA_PAT ?? null;
  }

  const expiresSoon = Date.parse(stored.expiresAt) - Date.now() <= refreshSkewMs;
  if (!options.forceRefresh && !expiresSoon) {
    return stored.accessToken;
  }

  const refreshed = await refreshOuraTokens(stored.refreshToken, options);
  return refreshed.accessToken;
}

export async function hasOuraCredentials(options: OuraOAuthClientOptions = {}): Promise<boolean> {
  if (await readOuraTokens(options.tokenPath)) {
    return true;
  }
  return Boolean(process.env.OURA_PAT);
}

async function requestOuraTokens(
  params: Record<string, string>,
  options: OuraOAuthClientOptions
): Promise<OuraTokenSet> {
  const clientId = options.clientId ?? process.env.OURA_CLIENT_ID;
  const clientSecret = options.clientSecret ?? process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("OURA_CLIENT_ID and OURA_CLIENT_SECRET are required for the Oura OAuth flow.");
  }

  const response = await fetch(ouraTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params)
  });

  if (!response.ok) {
    throw new Error(`Oura token request (${params.grant_type}) failed with ${response.status}.`);
  }

  const payload = (await response.json()) as OuraTokenResponse;
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error("Oura token response is missing access_token or refresh_token.");
  }

  const expiresInSeconds = typeof payload.expires_in === "number" ? payload.expires_in : 0;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    scope: payload.scope,
    tokenType: payload.token_type
  };
}
