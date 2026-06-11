import test from "node:test";
import assert from "node:assert/strict";
import { buildNormalizedDailyLedger } from "@/lib/health/normalization";
import type { RawHealthEvent } from "@/lib/health";

function makeEvent(overrides: Partial<RawHealthEvent> & { payload: unknown }): RawHealthEvent {
  const { payload, ...rest } = overrides;
  return {
    id: "test-id",
    source: "withings",
    type: "body_composition",
    observedAt: "2024-06-01T06:00:00.000Z",
    receivedAt: "2024-06-01T07:00:00.000Z",
    payload,
    ...rest
  };
}

test("applySmartScaleEvents: populates bodyComposition from withings body_composition event", () => {
  const events: RawHealthEvent[] = [
    makeEvent({
      payload: {
        bodyFatPercent: 20,
        muscleMassKg: 58,
        boneMassKg: 3.2,
        waterMassKg: 55,
        visceralFatIndex: 8
      }
    })
  ];

  const { ledger } = buildNormalizedDailyLedger({ date: "2024-06-01", events });

  assert.ok(ledger.bodyComposition !== undefined);
  assert.equal(ledger.bodyComposition!.bodyFatPercentage?.value, 20);
  assert.equal(ledger.bodyComposition!.muscleMassKg?.value, 58);
  assert.equal(ledger.bodyComposition!.boneMassKg?.value, 3.2);
  assert.equal(ledger.bodyComposition!.waterMassKg?.value, 55);
  assert.equal(ledger.bodyComposition!.visceralFatIndex?.value, 8);
});

test("applySmartScaleEvents: partial body comp fields are populated correctly", () => {
  const events: RawHealthEvent[] = [
    makeEvent({
      payload: { bodyFatPercent: 22, muscleMassKg: 56 }
    })
  ];

  const { ledger } = buildNormalizedDailyLedger({ date: "2024-06-01", events });

  assert.ok(ledger.bodyComposition !== undefined);
  assert.equal(ledger.bodyComposition!.bodyFatPercentage?.value, 22);
  assert.equal(ledger.bodyComposition!.muscleMassKg?.value, 56);
  assert.equal(ledger.bodyComposition!.boneMassKg, undefined);
  assert.equal(ledger.bodyComposition!.waterMassKg, undefined);
});

test("applySmartScaleEvents: source is preserved on MetricValue", () => {
  const events: RawHealthEvent[] = [
    makeEvent({ source: "renpho", payload: { bodyFatPercent: 19 } })
  ];

  const { ledger } = buildNormalizedDailyLedger({ date: "2024-06-01", events });

  assert.equal(ledger.bodyComposition!.bodyFatPercentage?.source, "renpho");
});

test("applySmartScaleEvents: no body_composition event leaves bodyComposition undefined", () => {
  const events: RawHealthEvent[] = [
    {
      id: "w1",
      source: "withings",
      type: "weight",
      observedAt: "2024-06-01T06:00:00.000Z",
      receivedAt: "2024-06-01T07:00:00.000Z",
      payload: { weightKg: 75 }
    }
  ];

  const { ledger } = buildNormalizedDailyLedger({ date: "2024-06-01", events });
  assert.equal(ledger.bodyComposition, undefined);
});

test("applyOuraRing5Events: populates resilienceScore and resilienceLevel", () => {
  const events: RawHealthEvent[] = [
    {
      id: "r1",
      source: "oura",
      type: "daily_resilience",
      observedAt: "2024-06-01T00:00:00.000Z",
      receivedAt: "2024-06-01T01:00:00.000Z",
      payload: { day: "2024-06-01", score: 82, level: "good" }
    }
  ];

  const { ledger } = buildNormalizedDailyLedger({ date: "2024-06-01", events });

  assert.equal(ledger.resilienceScore?.value, 82);
  assert.equal(ledger.resilienceLevel?.value, "good");
});

test("applyOuraRing5Events: populates spo2Percentage from daily_spo2", () => {
  const events: RawHealthEvent[] = [
    {
      id: "s1",
      source: "oura",
      type: "daily_spo2",
      observedAt: "2024-06-01T00:00:00.000Z",
      receivedAt: "2024-06-01T01:00:00.000Z",
      payload: { day: "2024-06-01", spo2_percentage: { average: 97.5 } }
    }
  ];

  const { ledger } = buildNormalizedDailyLedger({ date: "2024-06-01", events });
  assert.equal(ledger.spo2Percentage?.value, 97.5);
});

test("applyOuraRing5Events: populates cardiovascularAge from daily_cardiovascular_age", () => {
  const events: RawHealthEvent[] = [
    {
      id: "c1",
      source: "oura",
      type: "daily_cardiovascular_age",
      observedAt: "2024-06-01T00:00:00.000Z",
      receivedAt: "2024-06-01T01:00:00.000Z",
      payload: { day: "2024-06-01", age: 28 }
    }
  ];

  const { ledger } = buildNormalizedDailyLedger({ date: "2024-06-01", events });
  assert.equal(ledger.cardiovascularAge?.value, 28);
});
