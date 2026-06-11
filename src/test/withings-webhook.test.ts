import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { POST } from "../../app/api/integrations/withings/webhook/route";

function makeRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/integrations/withings/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers
    },
    body
  }) as unknown as NextRequest;
}

test("withings webhook: ignores non-body notifications", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  try {
    process.env.WITHINGS_ACCESS_TOKEN = "test-token";
    const response = await POST(makeRequest("userid=123&appli=4&startdate=1717200000&enddate=1717286400"));
    const json = (await response.json()) as { ok: boolean; eventsWritten: number };

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.eventsWritten, 0);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.WITHINGS_ACCESS_TOKEN;
  }
});

test("withings webhook: fetches body measurements with form POST", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await mkdtemp(join(tmpdir(), "bodyos-withings-"));
  process.env.HEALTH_LEDGER_PATH = join(tempDir, "events.jsonl");
  process.env.WITHINGS_ACCESS_TOKEN = "test-token";

  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://wbsapi.withings.net/measure");
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-token");
    assert.equal((init?.headers as Record<string, string>)["Content-Type"], "application/x-www-form-urlencoded");

    const body = init?.body as URLSearchParams;
    assert.equal(body.get("action"), "getmeas");
    assert.equal(body.get("startdate"), "1717200000");
    assert.equal(body.get("enddate"), "1717286400");
    assert.equal(body.get("category"), "1");

    return Response.json({
      status: 0,
      body: {
        measuregrps: [
          {
            grpid: 1,
            attrib: 0,
            date: 1717200000,
            category: 1,
            measures: [
              { type: 1, value: 7500, unit: -2 },
              { type: 6, value: 2000, unit: -2 }
            ]
          }
        ]
      }
    });
  };

  try {
    const response = await POST(makeRequest("userid=123&appli=1&startdate=1717200000&enddate=1717286400"));
    const json = (await response.json()) as { ok: boolean; eventsWritten: number };

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.eventsWritten, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HEALTH_LEDGER_PATH;
    delete process.env.WITHINGS_ACCESS_TOKEN;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("withings webhook: rejects invalid configured HMAC", async () => {
  process.env.WITHINGS_HMAC_SECRET = "secret";
  const body = "userid=123&appli=1&startdate=1717200000&enddate=1717286400";
  const signature = createHmac("sha256", "wrong").update(body).digest("hex");

  try {
    const response = await POST(makeRequest(body, { "x-withings-signature": signature }));
    const json = (await response.json()) as { ok: boolean; error: string };

    assert.equal(response.status, 401);
    assert.equal(json.ok, false);
    assert.equal(json.error, "invalid signature");
  } finally {
    delete process.env.WITHINGS_HMAC_SECRET;
  }
});
