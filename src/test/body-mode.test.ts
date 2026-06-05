import test from "node:test";
import assert from "node:assert/strict";
import { classifyBodyMode } from "@/lib/health/body-mode";

test("classifies stable signals as green", () => {
  const result = classifyBodyMode({
    readinessScore: { value: 82, source: "oura", confidence: "high" },
    sleepHours: { value: 7.5, source: "oura", confidence: "high" }
  });

  assert.equal(result.mode, "green");
});

test("classifies moderate strain as yellow", () => {
  const result = classifyBodyMode({
    readinessScore: { value: 66, source: "oura", confidence: "high" },
    sleepHours: { value: 6.2, source: "oura", confidence: "high" }
  });

  assert.equal(result.mode, "yellow");
});

test("classifies stacked recovery risk as red", () => {
  const result = classifyBodyMode({
    readinessScore: { value: 48, source: "oura", confidence: "high" },
    sleepHours: { value: 5.1, source: "oura", confidence: "high" },
    calendarPressure: {
      meetingHours: 6,
      hasEarlyStart: true,
      hasLateEnd: false
    }
  });

  assert.equal(result.mode, "red");
});

test("low resilience score adds risk (+1)", () => {
  // readinessScore=66 → riskScore=1 (moderate readiness → green)
  // adding resilienceScore=35 → riskScore=2 → yellow
  const baseline = classifyBodyMode({
    readinessScore: { value: 66, source: "oura", confidence: "high" }
  });
  const withLowResilience = classifyBodyMode({
    readinessScore: { value: 66, source: "oura", confidence: "high" },
    resilienceScore: { value: 35, source: "oura", confidence: "high" }
  });

  assert.equal(baseline.mode, "green");
  assert.equal(withLowResilience.mode, "yellow");
  assert.ok(withLowResilience.reasons.includes("low resilience"));
});

test("excellent resilience score subtracts risk", () => {
  // readinessScore=66 + sleepHours=6.2 → riskScore=2 → yellow
  // adding resilienceScore=90 → riskScore=1 → green
  const withoutResilience = classifyBodyMode({
    readinessScore: { value: 66, source: "oura", confidence: "high" },
    sleepHours: { value: 6.2, source: "oura", confidence: "high" }
  });
  const withExcellentResilience = classifyBodyMode({
    readinessScore: { value: 66, source: "oura", confidence: "high" },
    sleepHours: { value: 6.2, source: "oura", confidence: "high" },
    resilienceScore: { value: 90, source: "oura", confidence: "high" }
  });

  assert.equal(withoutResilience.mode, "yellow");
  assert.equal(withExcellentResilience.mode, "green");
});

test("resilience score 40 is the exact boundary for low resilience risk", () => {
  const atBoundary = classifyBodyMode({
    resilienceScore: { value: 40, source: "oura", confidence: "high" }
  });
  const justAbove = classifyBodyMode({
    resilienceScore: { value: 41, source: "oura", confidence: "high" }
  });

  assert.ok(atBoundary.reasons.includes("low resilience"));
  assert.ok(!justAbove.reasons.includes("low resilience"));
});

test("risk score cannot go below zero from resilience subtraction", () => {
  const result = classifyBodyMode({
    resilienceScore: { value: 90, source: "oura", confidence: "high" }
  });
  assert.equal(result.mode, "green");
});
