import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as ouraCallbackGet } from "../../app/api/integrations/oura/callback/route";
import { syncOuraRequest } from "../../app/api/integrations/oura/sync/route";
import type { RawHealthEventStore } from "@/lib/health/ledger";
import {
  buildOuraAuthorizeUrl,
  getOuraAccessToken,
  ouraDefaultScopes
} from "@/lib/providers/oura-oauth";
import {
  clearOuraTokens,
  readOuraTokens,
  writeOuraTokens,
  type OuraTokenSet
} from "@/lib/providers/oura-token-store";

function makeStoreStub(): RawHealthEventStore {
  const fail = () => {
    throw new Error("store should not be touched");
  };
  return { insert: fail, insertMany: fail, list: fail, clear: fail };
}

test("oura token store: round-trips and clears token sets", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "bodyos-oura-tokens-"));
  const tokenPath = join(tempDir, "nested", "oura-tokens.json");
  const tokens: OuraTokenSet = {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAt: "2026-06-11T12:00:00.000Z",
    scope: "daily heartrate",
    tokenType: "Bearer"
  };

  try {
    assert.equal(await readOuraTokens(tokenPath), null);

    await writeOuraTokens(tokens, tokenPath);
    assert.deepEqual(await readOuraTokens(tokenPath), tokens);

    await clearOuraTokens(tokenPath);
    assert.equal(await readOuraTokens(tokenPath), null);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("getOuraAccessToken: refreshes an expired token and persists the rotated refresh token", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "bodyos-oura-refresh-"));
  const tokenPath = join(tempDir, "oura-tokens.json");
  await writeOuraTokens(
    {
      accessToken: "stale-access",
      refreshToken: "old-refresh",
      expiresAt: new Date(Date.now() - 1000).toISOString()
    },
    tokenPath
  );

  const originalFetch = globalThis.fetch;
  let tokenRequests = 0;
  globalThis.fetch = async (input, init) => {
    tokenRequests += 1;
    assert.equal(String(input), "https://api.ouraring.com/oauth/token");
    assert.equal(init?.method, "POST");

    const headers = init?.headers as Record<string, string>;
    const expectedBasic = `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`;
    assert.equal(headers.Authorization, expectedBasic);

    const body = init?.body as URLSearchParams;
    assert.equal(body.get("grant_type"), "refresh_token");
    assert.equal(body.get("refresh_token"), "old-refresh");

    return Response.json({
      access_token: "fresh-access",
      refresh_token: "rotated-refresh",
      expires_in: 86400,
      token_type: "Bearer",
      scope: "daily"
    });
  };

  try {
    const token = await getOuraAccessToken({
      tokenPath,
      clientId: "client-id",
      clientSecret: "client-secret"
    });

    assert.equal(token, "fresh-access");
    assert.equal(tokenRequests, 1);

    const stored = await readOuraTokens(tokenPath);
    assert.equal(stored?.accessToken, "fresh-access");
    assert.equal(stored?.refreshToken, "rotated-refresh");
    assert.ok(Date.parse(stored?.expiresAt ?? "") > Date.now());
  } finally {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("getOuraAccessToken: returns a stored token that is not near expiry without refreshing", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "bodyos-oura-valid-"));
  const tokenPath = join(tempDir, "oura-tokens.json");
  await writeOuraTokens(
    {
      accessToken: "live-access",
      refreshToken: "live-refresh",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    },
    tokenPath
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("refresh should not be attempted");
  };

  try {
    assert.equal(await getOuraAccessToken({ tokenPath }), "live-access");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("buildOuraAuthorizeUrl: constructs the Oura authorize URL", () => {
  const url = new URL(
    buildOuraAuthorizeUrl({
      clientId: "client-id",
      redirectUri: "http://localhost:3000/api/integrations/oura/callback",
      state: "state-123"
    })
  );

  assert.equal(url.origin, "https://cloud.ouraring.com");
  assert.equal(url.pathname, "/oauth/authorize");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "client-id");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3000/api/integrations/oura/callback");
  assert.equal(url.searchParams.get("state"), "state-123");
  assert.equal(url.searchParams.get("scope"), ouraDefaultScopes.join(" "));
  assert.equal(url.searchParams.get("scope"), "email personal daily heartrate workout tag session spo2");
});

test("oura callback: rejects a state mismatch without exchanging the code", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("token exchange should not happen on state mismatch");
  };

  try {
    const request = new NextRequest(
      "http://localhost:3000/api/integrations/oura/callback?code=auth-code&state=attacker-state",
      { headers: { cookie: "oura_oauth_state=expected-state" } }
    );
    const response = await ouraCallbackGet(request);

    assert.equal(response.status, 400);
    assert.match(await response.text(), /state mismatch/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("oura sync: reports not connected when neither OAuth tokens nor OURA_PAT exist", async () => {
  const originalPat = process.env.OURA_PAT;
  const originalTokenPath = process.env.OURA_TOKEN_PATH;
  delete process.env.OURA_PAT;
  process.env.OURA_TOKEN_PATH = join(tmpdir(), "bodyos-oura-sync-missing", "oura-tokens.json");

  try {
    const result = await syncOuraRequest(makeStoreStub(), {});

    assert.equal(result.synced, false);
    assert.match(result.reason ?? "", /\/api\/integrations\/oura\/connect/);
  } finally {
    if (originalPat !== undefined) process.env.OURA_PAT = originalPat;
    if (originalTokenPath !== undefined) {
      process.env.OURA_TOKEN_PATH = originalTokenPath;
    } else {
      delete process.env.OURA_TOKEN_PATH;
    }
  }
});
