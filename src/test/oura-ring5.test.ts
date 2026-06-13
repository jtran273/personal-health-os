import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { syncOuraRequest } from "../../app/api/integrations/oura/sync/route";
import { InMemoryRawHealthEventStore } from "@/lib/health/ledger";
import { buildNormalizedDailyLedger } from "@/lib/health/normalization";
import type { RawHealthEvent } from "@/lib/health";

test("fetchOuraSleepPeriods: exported from oura provider", async () => {
  const module = await import("@/lib/providers/oura");
  assert.equal(typeof module.fetchOuraSleepPeriods, "function");
});

test("fetchOuraDailyResilience: exported from oura provider", async () => {
  const module = await import("@/lib/providers/oura");
  assert.equal(typeof module.fetchOuraDailyResilience, "function");
});

test("fetchOuraDailyCardiovascularAge: exported from oura provider", async () => {
  const module = await import("@/lib/providers/oura");
  assert.equal(typeof module.fetchOuraDailyCardiovascularAge, "function");
});

test("fetchOuraDailySpo2: exported from oura provider", async () => {
  const module = await import("@/lib/providers/oura");
  assert.equal(typeof module.fetchOuraDailySpo2, "function");
});

test("fetchOuraDailyStress: exported from oura provider", async () => {
  const module = await import("@/lib/providers/oura");
  assert.equal(typeof module.fetchOuraDailyStress, "function");
});

test("oura ring5 collection fetch throws without OURA_PAT", async () => {
  const module = await import("@/lib/providers/oura");
  const originalPat = process.env.OURA_PAT;
  const originalTokenPath = process.env.OURA_TOKEN_PATH;
  delete process.env.OURA_PAT;
  process.env.OURA_TOKEN_PATH = join(tmpdir(), "bodyos-oura-ring5-missing", "oura-tokens.json");

  try {
    await assert.rejects(
      () => module.fetchOuraDailyResilience({ startDate: "2024-06-01", endDate: "2024-06-01" }),
      /OURA_PAT is required/
    );
    await assert.rejects(
      () => module.fetchOuraDailyCardiovascularAge({ startDate: "2024-06-01", endDate: "2024-06-01" }),
      /OURA_PAT is required/
    );
    await assert.rejects(
      () => module.fetchOuraDailySpo2({ startDate: "2024-06-01", endDate: "2024-06-01" }),
      /OURA_PAT is required/
    );
    await assert.rejects(
      () => module.fetchOuraDailyStress({ startDate: "2024-06-01", endDate: "2024-06-01" }),
      /OURA_PAT is required/
    );
    await assert.rejects(
      () => module.fetchOuraSleepPeriods({ startDate: "2024-06-01", endDate: "2024-06-01" }),
      /OURA_PAT is required/
    );
  } finally {
    if (originalPat !== undefined) process.env.OURA_PAT = originalPat;
    if (originalTokenPath !== undefined) {
      process.env.OURA_TOKEN_PATH = originalTokenPath;
    } else {
      delete process.env.OURA_TOKEN_PATH;
    }
  }
});

test("normalizes Oura sleep duration, HRV, and resting heart rate from detailed sleep periods", () => {
  const events: RawHealthEvent[] = [
    {
      id: "oura-nap",
      source: "oura",
      type: "sleep",
      observedAt: "2026-06-12T00:00:00.000Z",
      receivedAt: "2026-06-12T12:00:00.000Z",
      externalId: "nap-1",
      payload: {
        id: "nap-1",
        day: "2026-06-12",
        type: "sleep",
        total_sleep_duration: 3600,
        average_hrv: 24,
        lowest_heart_rate: 62
      }
    },
    {
      id: "oura-long-sleep",
      source: "oura",
      type: "sleep",
      observedAt: "2026-06-12T00:00:00.000Z",
      receivedAt: "2026-06-12T12:00:00.000Z",
      externalId: "sleep-1",
      payload: {
        id: "sleep-1",
        day: "2026-06-12",
        type: "long_sleep",
        total_sleep_duration: 27_000,
        average_hrv: 42,
        lowest_heart_rate: 54
      }
    },
    {
      id: "oura-daily-sleep",
      source: "oura",
      type: "daily_sleep",
      observedAt: "2026-06-12T00:00:00.000Z",
      receivedAt: "2026-06-12T12:00:00.000Z",
      externalId: "daily-sleep-1",
      payload: {
        day: "2026-06-12",
        score: 81,
        contributors: {
          total_sleep: 30,
          hrv_balance: 99
        }
      }
    },
    {
      id: "oura-readiness",
      source: "oura",
      type: "daily_readiness",
      observedAt: "2026-06-12T00:00:00.000Z",
      receivedAt: "2026-06-12T12:00:00.000Z",
      externalId: "readiness-1",
      payload: {
        day: "2026-06-12",
        score: 73,
        contributors: {
          hrv_balance: 100,
          resting_heart_rate: 85
        }
      }
    }
  ];

  const result = buildNormalizedDailyLedger({
    date: "2026-06-12",
    events,
    generatedAt: "2026-06-12T12:00:00.000Z"
  });

  assert.equal(result.ledger.sleepHours?.value, 7.5);
  assert.equal(result.ledger.sleepHours?.source, "oura");
  assert.equal(result.ledger.sleepHours?.confidence, "high");
  assert.equal(result.ledger.hrvMs?.value, 42);
  assert.equal(result.ledger.hrvMs?.source, "oura");
  assert.equal(result.ledger.hrvMs?.confidence, "high");
  assert.equal(result.ledger.restingHeartRateBpm?.value, 54);
  assert.equal(result.ledger.restingHeartRateBpm?.source, "oura");
  assert.equal(result.ledger.restingHeartRateBpm?.confidence, "high");
  assert.equal(result.ledger.readinessScore?.value, 73);
});

test("assigns Oura sleep periods to the bedtime_end day", () => {
  const events: RawHealthEvent[] = [
    {
      id: "oura-overnight-sleep",
      source: "oura",
      type: "sleep",
      observedAt: "2026-06-11T00:00:00.000Z",
      receivedAt: "2026-06-12T12:00:00.000Z",
      externalId: "sleep-1",
      payload: {
        id: "sleep-1",
        day: "2026-06-11",
        type: "long_sleep",
        bedtime_start: "2026-06-11T23:20:00.000-07:00",
        bedtime_end: "2026-06-12T07:10:00.000-07:00",
        total_sleep_duration: 25_200,
        average_hrv: 45,
        lowest_heart_rate: 55
      }
    },
    {
      id: "oura-readiness",
      source: "oura",
      type: "daily_readiness",
      observedAt: "2026-06-12T00:00:00.000Z",
      receivedAt: "2026-06-12T12:00:00.000Z",
      externalId: "readiness-1",
      payload: {
        day: "2026-06-12",
        score: 80
      }
    }
  ];

  const result = buildNormalizedDailyLedger({
    date: "2026-06-12",
    events,
    generatedAt: "2026-06-12T12:00:00.000Z"
  });

  assert.equal(result.ledger.sleepHours?.value, 7);
  assert.equal(result.ledger.hrvMs?.value, 45);
  assert.equal(result.ledger.restingHeartRateBpm?.value, 55);
  assert.equal(result.ledger.rawEventIds.includes("oura-overnight-sleep"), true);
});

test("daily_sleep scores do not fabricate physical sleep metrics", () => {
  const events: RawHealthEvent[] = [
    {
      id: "oura-daily-sleep",
      source: "oura",
      type: "daily_sleep",
      observedAt: "2026-06-12T00:00:00.000Z",
      receivedAt: "2026-06-12T12:00:00.000Z",
      externalId: "daily-sleep-1",
      payload: {
        day: "2026-06-12",
        score: 81,
        contributors: {
          total_sleep: 30,
          hrv_balance: 99,
          resting_heart_rate: 85
        }
      }
    }
  ];

  const result = buildNormalizedDailyLedger({
    date: "2026-06-12",
    events,
    generatedAt: "2026-06-12T12:00:00.000Z"
  });

  assert.equal(result.ledger.sleepHours, undefined);
  assert.equal(result.ledger.hrvMs, undefined);
  assert.equal(result.ledger.restingHeartRateBpm, undefined);
  assert.equal(result.ledger.readinessScore?.value, 81);
});

test("oura sync fetches prior-day detailed sleep for one-day backfills", async () => {
  const originalPat = process.env.OURA_PAT;
  const originalFetch = globalThis.fetch;
  const requested = new Map<string, URL>();

  process.env.OURA_PAT = "test-token";
  globalThis.fetch = async (input, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-token");
    const url = new URL(String(input));
    requested.set(url.pathname.split("/").at(-1) ?? "", url);
    return Response.json({ data: [] });
  };

  try {
    const result = await syncOuraRequest(new InMemoryRawHealthEventStore(), {
      startDate: "2026-06-12",
      endDate: "2026-06-12"
    });

    assert.equal(result.synced, true);
    assert.equal(requested.get("daily_sleep")?.searchParams.get("start_date"), "2026-06-12");
    assert.equal(requested.get("sleep")?.searchParams.get("start_date"), "2026-06-11");
    assert.equal(requested.get("sleep")?.searchParams.get("end_date"), "2026-06-12");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPat === undefined) {
      delete process.env.OURA_PAT;
    } else {
      process.env.OURA_PAT = originalPat;
    }
  }
});

test("oura ring5 collections produce correct event types from mock data", async () => {
  const { fetchOuraDailyResilience } = await import("@/lib/providers/oura");

  const mockFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    void input;
    void init;
    return Response.json({
      data: [{ id: "abc123", day: "2024-06-01", score: 78, level: "good" }]
    });
  };

  try {
    const events = await fetchOuraDailyResilience({
      startDate: "2024-06-01",
      endDate: "2024-06-01",
      token: "test-token"
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].type, "daily_resilience");
    assert.equal(events[0].source, "oura");
    assert.ok(events[0].id.length > 0);
    assert.deepEqual(events[0].payload, { id: "abc123", day: "2024-06-01", score: 78, level: "good" });
  } finally {
    globalThis.fetch = mockFetch;
  }
});
