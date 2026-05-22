import test from "node:test";
import assert from "node:assert/strict";
import { chooseBestSource } from "@/lib/health/source-routing";

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
