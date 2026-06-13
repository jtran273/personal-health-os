import test from "node:test";
import assert from "node:assert/strict";
import { buildNormalizedDailyLedger } from "@/lib/health/normalization";
import { chooseBestSource, classifyHealthKitSource } from "@/lib/health/source-routing";
import type { RawHealthEvent } from "@/lib/health";

test("chooses Apple Health for recovery when available", () => {
  const route = chooseBestSource("recovery", ["apple_health", "oura"]);

  assert.equal(route.selectedSource, "apple_health");
  assert.equal(route.confidence, "high");
});

test("falls back and degrades confidence when preferred source is missing", () => {
  const route = chooseBestSource("weight", ["openclaw"]);

  assert.equal(route.selectedSource, "openclaw");
  assert.equal(route.confidence, "medium");
});

test("marks missing sources as unknown", () => {
  const route = chooseBestSource("meal", ["oura"]);

  assert.equal(route.selectedSource, undefined);
  assert.equal(route.confidence, "unknown");
});

test("classifies mock HealthKit metadata by originating device source", () => {
  assert.equal(
    classifyHealthKitSource({
      sourceRevision: { source: { name: "James Apple Watch", bundleIdentifier: "com.apple.NanoHealth" } },
      device: { model: "Watch", manufacturer: "Apple Inc." }
    }),
    "apple_watch"
  );
  assert.equal(
    classifyHealthKitSource({
      sourceRevision: { source: { name: "James iPhone", bundleIdentifier: "com.apple.Health" } },
      device: { model: "iPhone16,2", manufacturer: "Apple Inc." }
    }),
    "apple_iphone"
  );
  assert.equal(
    classifyHealthKitSource({
      sourceRevision: { source: { name: "Withings", bundleIdentifier: "com.withings.wiScaleNG" } },
      device: { name: "Body Smart", manufacturer: "Withings" }
    }),
    "smart_scale"
  );
  assert.equal(
    classifyHealthKitSource({
      sourceRevision: { source: { name: "Health", bundleIdentifier: "com.apple.Health" } }
    }),
    "apple_health"
  );
});

test("normalizes HealthKit metrics with mock non-watch source attribution", () => {
  const events: RawHealthEvent[] = [
    {
      id: "hk-iphone-steps",
      source: "apple_health",
      type: "steps",
      observedAt: "2026-05-21T18:00:00.000Z",
      receivedAt: "2026-05-21T18:01:00.000Z",
      payload: {
        steps: 6200,
        sourceRevision: { source: { name: "James iPhone", bundleIdentifier: "com.apple.Health" } },
        device: { model: "iPhone16,2", manufacturer: "Apple Inc." }
      }
    },
    {
      id: "hk-scale-weight",
      source: "apple_health",
      type: "weight",
      observedAt: "2026-05-21T15:00:00.000Z",
      receivedAt: "2026-05-21T15:01:00.000Z",
      payload: {
        weightKg: 81.4,
        sourceRevision: { source: { name: "Withings", bundleIdentifier: "com.withings.wiScaleNG" } },
        device: { name: "Body Smart", manufacturer: "Withings" }
      }
    },
    {
      id: "hk-scale-body-comp",
      source: "apple_health",
      type: "body_composition",
      observedAt: "2026-05-21T15:00:00.000Z",
      receivedAt: "2026-05-21T15:01:00.000Z",
      payload: {
        bodyFatPercent: 18.5,
        sourceRevision: { source: { name: "Withings", bundleIdentifier: "com.withings.wiScaleNG" } },
        device: { name: "Body Smart", manufacturer: "Withings" }
      }
    },
    {
      id: "hk-generic-active-energy",
      source: "apple_health",
      type: "active_energy",
      observedAt: "2026-05-21T17:00:00.000Z",
      receivedAt: "2026-05-21T17:01:00.000Z",
      payload: {
        activeEnergyCalories: 430,
        sourceRevision: { source: { name: "Health", bundleIdentifier: "com.apple.Health" } }
      }
    }
  ];

  const result = buildNormalizedDailyLedger({
    date: "2026-05-21",
    events,
    generatedAt: "2026-05-21T20:00:00.000Z"
  });

  assert.equal(result.ledger.steps?.source, "apple_iphone");
  assert.equal(result.ledger.weightKg?.source, "smart_scale");
  assert.equal(result.ledger.weightKg?.confidence, "high");
  assert.equal(result.ledger.bodyComposition?.bodyFatPercentage?.source, "smart_scale");
  assert.equal(result.ledger.activeEnergyCalories?.source, "apple_health");
  assert.equal(result.ledger.activeEnergyCalories?.confidence, "low");
});

test("normalizes direct Apple iPhone raw movement events", () => {
  const result = buildNormalizedDailyLedger({
    date: "2026-05-21",
    events: [
      {
        id: "iphone-steps",
        source: "apple_iphone",
        type: "steps",
        observedAt: "2026-05-21T10:00:00.000Z",
        receivedAt: "2026-05-21T10:01:00.000Z",
        payload: { steps: 1200 }
      }
    ],
    generatedAt: "2026-05-21T20:00:00.000Z"
  });

  assert.equal(result.ledger.steps?.value, 1200);
  assert.equal(result.ledger.steps?.source, "apple_iphone");
});
