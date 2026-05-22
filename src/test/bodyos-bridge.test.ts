import test from "node:test";
import assert from "node:assert/strict";
import {
  bodyOSAssistantBridgeSafetyMetadata,
  buildLedgerFromBodyOSSummary,
  validateBodyOSAssistantHealthExport,
} from "@/lib/providers/bodyos";

const fixedNow = new Date("2026-05-22T17:00:00.000Z");

const safePayload = {
  kind: "bodyos.openclaw.health.daily_export",
  bridgeVersion: "2026-05-22",
  exportedAt: "2026-05-22T16:55:00.000Z",
  device: {
    app: "BodyOS",
    platform: "iOS",
    healthKitPermission: "granted",
  },
  dailySummaries: [
    {
      date: "2026-05-22",
      bodyMode: "yellow",
      sleepHours: {
        value: 6.7,
        unit: "h",
        source: "apple_watch",
        confidence: "high",
        observedAt: "2026-05-22T14:00:00.000Z",
        freshnessMinutes: 175,
      },
      hrvMs: {
        value: 42,
        unit: "ms",
        source: "apple_watch",
        confidence: "medium",
        observedAt: "2026-05-22T14:00:00.000Z",
        freshnessMinutes: 175,
      },
      steps: {
        value: 8300,
        unit: "count",
        source: "apple_watch",
        confidence: "high",
        observedAt: "2026-05-22T16:50:00.000Z",
        freshnessMinutes: 5,
      },
      weightKg: {
        value: 81.4,
        unit: "kg",
        source: "smart_scale",
        confidence: "high",
        observedAt: "2026-05-22T15:00:00.000Z",
        freshnessMinutes: 115,
      },
      missingSignals: ["meals", "resting_heart_rate"],
      sourceAttribution: [
        {
          signal: "steps",
          source: "apple_watch",
          confidence: "high",
          observedAt: "2026-05-22T16:50:00.000Z",
          freshnessMinutes: 5,
        },
      ],
    },
  ],
  safety: {
    rawHealthKitSamplesIncluded: false,
    rawProviderPayloadsIncluded: false,
    tokenIncluded: false,
  },
};

test("accepts a BodyOS assistant-safe HealthKit ledger handoff", () => {
  const result = validateBodyOSAssistantHealthExport(safePayload, fixedNow);

  assert.equal(result.ok, true);
  assert.equal(result.acceptedDays, 1);
  assert.equal(result.latestLedger?.date, "2026-05-22");
  assert.equal(result.latestLedger?.bodyMode, "yellow");
  assert.equal(result.latestLedger?.steps?.source, "apple_watch");
  assert.equal(result.latestLedger?.weightKg?.confidence, "high");
  assert.equal("payload" in (result.latestLedger?.steps ?? {}), false);
});

test("rejects raw HealthKit/provider dumps and tokens in BodyOS payloads", () => {
  const unsafe = {
    ...safePayload,
    safety: {
      rawHealthKitSamplesIncluded: true,
      rawProviderPayloadsIncluded: true,
      tokenIncluded: true,
    },
  };

  const result = validateBodyOSAssistantHealthExport(unsafe, fixedNow);

  assert.equal(result.ok, false);
  assert.match(result.errors?.join(" ") ?? "", /raw HealthKit samples/);
  assert.match(result.errors?.join(" ") ?? "", /tokens must not be included/);
});

test("builds a normalized ledger from a BodyOS daily summary without raw samples", () => {
  const result = validateBodyOSAssistantHealthExport(safePayload, fixedNow);
  const summary = result.payload?.dailySummaries[0];
  assert.ok(summary);

  const ledger = buildLedgerFromBodyOSSummary(summary, fixedNow);

  assert.equal(ledger.generatedAt, fixedNow.toISOString());
  assert.equal(ledger.rawEventIds.length, 0);
  assert.equal(ledger.sleepHours?.value, 6.7);
  assert.equal(ledger.hrvMs?.source, "apple_watch");
  assert.match(ledger.steps?.notes ?? "", /BodyOS iOS ledger export/);
});

test("documents network auth expectations for BodyOS bridge writes", () => {
  const safety = bodyOSAssistantBridgeSafetyMetadata();

  assert.equal(safety.rawHealthKitSamplesIncluded, false);
  assert.match(safety.networkWritesRequire, /OPENCLAW_HEALTH_TOKEN/);
  assert.match(safety.networkWritesRequire, /never include tokens/);
});
