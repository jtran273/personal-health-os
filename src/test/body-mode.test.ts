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
