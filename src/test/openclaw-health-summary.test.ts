import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenClawDailySummary,
  buildOpenClawTodayPlan,
  buildSampleOpenClawLedger
} from "@/lib/openclaw/health";

const fixedNow = new Date("2026-05-21T15:30:00.000Z");

test("builds a concise assistant-facing daily summary", () => {
  const summary = buildOpenClawDailySummary(buildSampleOpenClawLedger(fixedNow), fixedNow);

  assert.equal(summary.kind, "openclaw.health.daily_summary");
  assert.equal(summary.date, "2026-05-21");
  assert.equal(summary.bodyMode, "green");
  assert.equal(summary.dataState, "sample_until_persistence");
  assert.match(summary.nextAction, /normal plan/i);
  assert.ok(summary.missingSignals.includes("weight"));
});

test("builds a today plan with next check-ins instead of dashboard noise", () => {
  const plan = buildOpenClawTodayPlan(buildSampleOpenClawLedger(fixedNow), fixedNow);

  assert.equal(plan.kind, "openclaw.health.today_plan");
  assert.equal(plan.mode, "green");
  assert.deepEqual(plan.checkIns, ["meal", "weight"]);
  assert.match(plan.mealPrompt, /first meal/i);
});

test("includes the OpenClaw safety contract on read responses", () => {
  const summary = buildOpenClawDailySummary(buildSampleOpenClawLedger(fixedNow), fixedNow);

  assert.equal(summary.safety.noRawProviderPayloads, true);
  assert.equal(summary.safety.noSecrets, true);
  assert.equal(summary.safety.writesLimitedTo, "ingestion_events_only");
  assert.equal(summary.safety.medicalDiagnosis, false);
});

