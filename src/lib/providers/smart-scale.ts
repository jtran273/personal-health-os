import type { RawHealthEvent, WearableSource } from "@/lib/health";
import { deterministicRawEventId } from "@/lib/health/ledger";

export interface SmartScaleBodyMeasurement {
  weight_kg: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  bone_mass_kg?: number;
  water_mass_kg?: number;
  visceral_fat_index?: number;
  measured_at: string;
  source_device?: string;
}

export interface WithingsWebhookPayload {
  userid: number;
  startdate: number;
  enddate: number;
  appli: number;
}

export interface WithingsGetmeasResponse {
  status: number;
  body: {
    measuregrps: WithingsMeasureGroup[];
  };
}

export interface WithingsMeasureGroup {
  grpid: number;
  attrib: number;
  date: number;
  category: number;
  measures: WithingsMeasure[];
}

interface WithingsMeasure {
  type: number;
  value: number;
  unit: number;
}

// Withings encodes values as: actual = measure.value * 10^measure.unit
function withingsValue(measure: WithingsMeasure): number {
  return measure.value * Math.pow(10, measure.unit);
}

const WITHINGS_TYPE_WEIGHT = 1;
const WITHINGS_TYPE_FAT_PERCENT = 6;
const WITHINGS_TYPE_MUSCLE_MASS = 76;
const WITHINGS_TYPE_WATER_MASS = 77;
const WITHINGS_TYPE_BONE_MASS = 88;
const WITHINGS_TYPE_VISCERAL_FAT = 170;

export function parseWithingsMeasureGroup(grp: WithingsMeasureGroup): SmartScaleBodyMeasurement | null {
  const byType = new Map<number, WithingsMeasure>();
  for (const m of grp.measures) {
    byType.set(m.type, m);
  }

  const weightMeasure = byType.get(WITHINGS_TYPE_WEIGHT);
  if (!weightMeasure) return null;

  const weight_kg = withingsValue(weightMeasure);
  const measured_at = new Date(grp.date * 1000).toISOString();

  const result: SmartScaleBodyMeasurement = { weight_kg, measured_at };

  const fatMeasure = byType.get(WITHINGS_TYPE_FAT_PERCENT);
  if (fatMeasure) result.body_fat_percent = withingsValue(fatMeasure);

  const muscleMeasure = byType.get(WITHINGS_TYPE_MUSCLE_MASS);
  if (muscleMeasure) result.muscle_mass_kg = withingsValue(muscleMeasure);

  const boneMeasure = byType.get(WITHINGS_TYPE_BONE_MASS);
  if (boneMeasure) result.bone_mass_kg = withingsValue(boneMeasure);

  const waterMeasure = byType.get(WITHINGS_TYPE_WATER_MASS);
  if (waterMeasure) result.water_mass_kg = withingsValue(waterMeasure);

  const visceralMeasure = byType.get(WITHINGS_TYPE_VISCERAL_FAT);
  if (visceralMeasure) result.visceral_fat_index = withingsValue(visceralMeasure);

  return result;
}

export function formatSmartScaleMeasurementAsEvents(
  measurement: SmartScaleBodyMeasurement,
  source: "withings" | "renpho" | "smart_scale"
): RawHealthEvent[] {
  const receivedAt = new Date().toISOString();
  const observedAt = measurement.measured_at;

  const weightEvent: RawHealthEvent = {
    id: "",
    source: source as WearableSource,
    type: "weight",
    observedAt,
    receivedAt,
    payload: { weightKg: measurement.weight_kg }
  };
  weightEvent.id = deterministicRawEventId(weightEvent);

  const events: RawHealthEvent[] = [weightEvent];

  const hasBodyComp =
    measurement.body_fat_percent !== undefined ||
    measurement.muscle_mass_kg !== undefined ||
    measurement.bone_mass_kg !== undefined ||
    measurement.water_mass_kg !== undefined ||
    measurement.visceral_fat_index !== undefined;

  if (hasBodyComp) {
    const bodyCompEvent: RawHealthEvent = {
      id: "",
      source: source as WearableSource,
      type: "body_composition",
      observedAt,
      receivedAt,
      payload: {
        bodyFatPercent: measurement.body_fat_percent,
        muscleMassKg: measurement.muscle_mass_kg,
        boneMassKg: measurement.bone_mass_kg,
        waterMassKg: measurement.water_mass_kg,
        visceralFatIndex: measurement.visceral_fat_index
      }
    };
    bodyCompEvent.id = deterministicRawEventId(bodyCompEvent);
    events.push(bodyCompEvent);
  }

  return events;
}
