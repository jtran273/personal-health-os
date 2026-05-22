import test from "node:test";
import assert from "node:assert/strict";
import { buildTodayInteractionModel } from "@/lib/openclaw/health/interactions";
import type { NormalizedDailyLedger } from "@/lib/health";

const baseLedger: NormalizedDailyLedger = {
  date: "2026-05-21",
  bodyMode: "yellow",
  readinessScore: { value: 66, source: "apple_watch", confidence: "medium" },
  sleepHours: { value: 6.2, source: "apple_watch", confidence: "high" },
  meals: [],
  rawEventIds: ["event-1"],
  generatedAt: "2026-05-21T15:30:00.000Z"
};

test("builds Today CTAs that route to plan and body-mode explanation", () => {
  const model = buildTodayInteractionModel(baseLedger, ["moderate readiness", "reduced sleep"]);

  assert.equal(model.primaryAction.href, "#today-plan");
  assert.equal(model.secondaryAction.href, "#why-this-mode");
  assert.match(model.explanation, /moderate readiness, reduced sleep/);
  assert.match(model.explanation, /readiness, sleep/);
});

test("routes missing meal and weight signals to safe capture contexts", () => {
  const model = buildTodayInteractionModel(baseLedger);

  assert.deepEqual(model.missingSignals.map((prompt) => prompt.signal), ["meal", "weight", "hrv"]);
  assert.equal(model.missingSignals[0].href, "/api/health/meals?date=2026-05-21");
  assert.equal(model.missingSignals[1].href, "#body-ledger-weight");
  assert.match(model.missingSignals[1].copy, /manual Body Ledger row/);
});

test("metric taps target Body Ledger day and row context", () => {
  const model = buildTodayInteractionModel(baseLedger);

  const sleep = model.metricLinks.find((metric) => metric.metric === "sleep");
  const readiness = model.metricLinks.find((metric) => metric.metric === "readiness");
  const coverage = model.metricLinks.find((metric) => metric.label === "Coverage");

  assert.equal(sleep?.href, "/?date=2026-05-21#body-ledger-sleep");
  assert.equal(readiness?.href, "/?date=2026-05-21#body-ledger-readiness");
  assert.equal(coverage?.href, "#body-ledger-coverage");
});

test("does not prompt for missing HRV before sleep exists", () => {
  const model = buildTodayInteractionModel({
    ...baseLedger,
    sleepHours: undefined,
    readinessScore: undefined
  });

  assert.deepEqual(model.missingSignals.map((prompt) => prompt.signal), ["meal", "weight", "sleep"]);
  assert.match(model.dataStateCopy, /normalized ledger rows/);
});
