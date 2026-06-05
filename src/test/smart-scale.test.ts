import test from "node:test";
import assert from "node:assert/strict";
import { formatSmartScaleMeasurementAsEvents, parseWithingsMeasureGroup } from "@/lib/providers/smart-scale";
import type { WithingsMeasureGroup } from "@/lib/providers/smart-scale";

function makeGroup(measures: { type: number; value: number; unit: number }[], date = 1717200000): WithingsMeasureGroup {
  return {
    grpid: 1,
    attrib: 0,
    date,
    category: 1,
    measures
  };
}

test("parseWithingsMeasureGroup: weight-only group", () => {
  const grp = makeGroup([{ type: 1, value: 7500, unit: -2 }]);
  const result = parseWithingsMeasureGroup(grp);

  assert.ok(result !== null);
  assert.equal(result!.weight_kg, 75);
  assert.equal(result!.body_fat_percent, undefined);
  assert.equal(result!.muscle_mass_kg, undefined);
});

test("parseWithingsMeasureGroup: full body composition group", () => {
  const grp = makeGroup([
    { type: 1, value: 7500, unit: -2 },
    { type: 6, value: 2000, unit: -2 },
    { type: 76, value: 5800, unit: -2 },
    { type: 88, value: 320, unit: -2 },
    { type: 77, value: 5500, unit: -2 },
    { type: 170, value: 8, unit: 0 }
  ]);
  const result = parseWithingsMeasureGroup(grp);

  assert.ok(result !== null);
  assert.equal(result!.weight_kg, 75);
  assert.equal(result!.body_fat_percent, 20);
  assert.equal(result!.muscle_mass_kg, 58);
  assert.equal(result!.bone_mass_kg, 3.2);
  assert.equal(result!.water_percent, 55);
  assert.equal(result!.visceral_fat_index, 8);
});

test("parseWithingsMeasureGroup: returns null when no weight measure", () => {
  const grp = makeGroup([{ type: 6, value: 2000, unit: -2 }]);
  const result = parseWithingsMeasureGroup(grp);
  assert.equal(result, null);
});

test("parseWithingsMeasureGroup: missing optional fields are undefined", () => {
  const grp = makeGroup([
    { type: 1, value: 8000, unit: -2 },
    { type: 6, value: 1800, unit: -2 }
  ]);
  const result = parseWithingsMeasureGroup(grp);

  assert.ok(result !== null);
  assert.equal(result!.weight_kg, 80);
  assert.equal(result!.body_fat_percent, 18);
  assert.equal(result!.muscle_mass_kg, undefined);
  assert.equal(result!.bone_mass_kg, undefined);
  assert.equal(result!.water_percent, undefined);
  assert.equal(result!.visceral_fat_index, undefined);
});

test("formatSmartScaleMeasurementAsEvents: weight-only emits single event", () => {
  const events = formatSmartScaleMeasurementAsEvents(
    { weight_kg: 75, measured_at: "2024-06-01T06:00:00.000Z" },
    "withings"
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "weight");
  assert.equal(events[0].source, "withings");
  assert.deepEqual((events[0].payload as { weightKg: number }).weightKg, 75);
});

test("formatSmartScaleMeasurementAsEvents: full body comp emits two events", () => {
  const events = formatSmartScaleMeasurementAsEvents(
    {
      weight_kg: 75,
      body_fat_percent: 20,
      muscle_mass_kg: 58,
      measured_at: "2024-06-01T06:00:00.000Z"
    },
    "withings"
  );

  assert.equal(events.length, 2);
  assert.equal(events[0].type, "weight");
  assert.equal(events[1].type, "body_composition");
  assert.equal(events[1].source, "withings");
});

test("formatSmartScaleMeasurementAsEvents: renpho source is accepted", () => {
  const events = formatSmartScaleMeasurementAsEvents(
    { weight_kg: 70, body_fat_percent: 18, measured_at: "2024-06-01T06:00:00.000Z" },
    "renpho"
  );
  assert.equal(events[0].source, "renpho");
  assert.equal(events[1].source, "renpho");
});

test("formatSmartScaleMeasurementAsEvents: events have deterministic ids", () => {
  const events1 = formatSmartScaleMeasurementAsEvents(
    { weight_kg: 75, measured_at: "2024-06-01T06:00:00.000Z" },
    "withings"
  );
  const events2 = formatSmartScaleMeasurementAsEvents(
    { weight_kg: 75, measured_at: "2024-06-01T06:00:00.000Z" },
    "withings"
  );
  assert.equal(events1[0].id, events2[0].id);
});
