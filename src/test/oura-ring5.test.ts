import test from "node:test";
import assert from "node:assert/strict";

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
  delete process.env.OURA_PAT;

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
  } finally {
    if (originalPat !== undefined) process.env.OURA_PAT = originalPat;
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
