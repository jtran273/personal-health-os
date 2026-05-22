import test from "node:test";
import assert from "node:assert/strict";
import { authenticateOpenClawHealthRequest } from "@/lib/openclaw/health";

test("rejects OpenClaw health requests when the server token is missing", () => {
  const result = authenticateOpenClawHealthRequest(new Headers(), undefined);

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, "openclaw_health_token_missing");
  assert.match(result.message ?? "", /OPENCLAW_HEALTH_TOKEN/);
});

test("requires bearer authorization", () => {
  const result = authenticateOpenClawHealthRequest(new Headers(), "server-token");

  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(result.code, "openclaw_health_token_required");
});

test("rejects the wrong bearer token without echoing it", () => {
  const result = authenticateOpenClawHealthRequest(
    new Headers({ authorization: "Bearer wrong-token" }),
    "server-token"
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(result.code, "openclaw_health_token_invalid");
  assert.doesNotMatch(JSON.stringify(result), /wrong-token|server-token/);
});

test("accepts the configured bearer token", () => {
  const result = authenticateOpenClawHealthRequest(
    new Headers({ authorization: "Bearer server-token" }),
    "server-token"
  );

  assert.deepEqual(result, { ok: true, status: 200 });
});

