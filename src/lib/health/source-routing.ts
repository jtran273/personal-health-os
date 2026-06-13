import type { HealthMetric, MetricConfidence, WearableSource } from "./types";

export type HealthKitAttributedSource = Extract<WearableSource, "apple_health" | "apple_watch" | "apple_iphone" | "smart_scale">;

export interface SourceRoute {
  metric: HealthMetric;
  preferredSource: WearableSource;
  fallbackSources: WearableSource[];
  defaultConfidence: MetricConfidence;
  rationale: string;
}

const routes: Record<HealthMetric, SourceRoute> = {
  sleep: {
    metric: "sleep",
    preferredSource: "apple_health",
    fallbackSources: ["apple_watch", "oura", "garmin", "manual"],
    defaultConfidence: "high",
    rationale: "Apple Health is the active bridge for Apple Watch sleep data."
  },
  recovery: {
    metric: "recovery",
    preferredSource: "apple_health",
    fallbackSources: ["apple_watch", "oura", "garmin", "manual"],
    defaultConfidence: "high",
    rationale: "Recovery should prioritize the Apple Watch signals James currently wears."
  },
  hrv: {
    metric: "hrv",
    preferredSource: "apple_health",
    fallbackSources: ["apple_watch", "oura", "garmin"],
    defaultConfidence: "high",
    rationale: "Apple Health is the active bridge for Apple Watch HRV trend use."
  },
  resting_heart_rate: {
    metric: "resting_heart_rate",
    preferredSource: "apple_health",
    fallbackSources: ["apple_watch", "oura", "garmin"],
    defaultConfidence: "high",
    rationale: "Apple Health is the active bridge for Apple Watch resting heart rate."
  },
  temperature_deviation: {
    metric: "temperature_deviation",
    preferredSource: "oura",
    fallbackSources: ["apple_health", "manual"],
    defaultConfidence: "medium",
    rationale: "Temperature deviation is most useful as a recovery or illness context signal."
  },
  steps: {
    metric: "steps",
    preferredSource: "apple_health",
    fallbackSources: ["apple_watch", "apple_iphone", "garmin", "oura", "manual"],
    defaultConfidence: "medium",
    rationale: "HealthKit-style aggregation is preferred for daily steps when available."
  },
  workout: {
    metric: "workout",
    preferredSource: "apple_watch",
    fallbackSources: ["apple_health", "garmin", "oura", "manual"],
    defaultConfidence: "medium",
    rationale: "Watches are preferred for active heart rate and workout capture."
  },
  active_energy: {
    metric: "active_energy",
    preferredSource: "apple_health",
    fallbackSources: ["apple_watch", "apple_iphone", "garmin", "oura", "manual"],
    defaultConfidence: "low",
    rationale: "Wearable calories are weak and should be recalibrated against weight trend."
  },
  weight: {
    metric: "weight",
    preferredSource: "smart_scale",
    fallbackSources: ["withings", "renpho", "openclaw", "manual"],
    defaultConfidence: "high",
    rationale: "Weight trend is the anchor for calorie recalibration."
  },
  meal: {
    metric: "meal",
    preferredSource: "openclaw",
    fallbackSources: ["manual"],
    defaultConfidence: "medium",
    rationale: "OpenClaw is the low-friction meal capture interface."
  },
  resilience: {
    metric: "resilience",
    preferredSource: "oura",
    fallbackSources: ["manual"],
    defaultConfidence: "high",
    rationale: "Oura Ring 5 daily resilience is a proprietary composite score."
  },
  spo2: {
    metric: "spo2",
    preferredSource: "oura",
    fallbackSources: ["apple_health", "apple_watch", "manual"],
    defaultConfidence: "medium",
    rationale: "SpO2 from wearables is a screening signal, not a clinical measurement."
  },
  cardiovascular_age: {
    metric: "cardiovascular_age",
    preferredSource: "oura",
    fallbackSources: ["manual"],
    defaultConfidence: "medium",
    rationale: "Oura Ring 5 cardiovascular age is a model-derived estimate."
  },
  body_fat_percentage: {
    metric: "body_fat_percentage",
    preferredSource: "withings",
    fallbackSources: ["renpho", "smart_scale", "manual"],
    defaultConfidence: "medium",
    rationale: "Smart scale BIA measurements are useful for trends, not absolute precision."
  }
};

export function getSourceRoute(metric: HealthMetric): SourceRoute {
  return routes[metric];
}

export function chooseBestSource(
  metric: HealthMetric,
  availableSources: WearableSource[]
): SourceRoute & { selectedSource?: WearableSource; confidence: MetricConfidence } {
  const route = getSourceRoute(metric);

  if (availableSources.includes(route.preferredSource)) {
    return { ...route, selectedSource: route.preferredSource, confidence: route.defaultConfidence };
  }

  const selectedSource = route.fallbackSources.find((source) => availableSources.includes(source));
  return {
    ...route,
    selectedSource,
    confidence: selectedSource ? degradeConfidence(route.defaultConfidence) : "unknown"
  };
}

export function classifyHealthKitSource(metadata: unknown): HealthKitAttributedSource {
  const text = healthKitMetadataText(metadata);

  if (containsAny(text, smartScaleHints)) return "smart_scale";
  if (containsAny(text, appleWatchHints)) return "apple_watch";
  if (containsAny(text, appleIPhoneHints)) return "apple_iphone";

  return "apple_health";
}

function degradeConfidence(confidence: MetricConfidence): MetricConfidence {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return confidence;
}

const smartScaleHints = [
  "smart scale",
  "body scale",
  "bathroom scale",
  "withings",
  "health mate",
  "body cardio",
  "body comp",
  "body smart",
  "body+",
  "renpho",
  "eufy smart scale",
  "fitbit aria",
  "qardio",
  "wyze scale"
];

const appleWatchHints = [
  "apple watch",
  "applewatch",
  "model watch",
  "device watch",
  "com.apple.nano",
  "com.apple.health.watch",
  "watchos"
];

const appleIPhoneHints = [
  "iphone",
  "ios device",
  "com.apple.health.iphone"
];

function healthKitMetadataText(metadata: unknown): string {
  const values = collectStringValues(metadata);
  return values.join(" ").toLowerCase();
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (!value || typeof value !== "object") return [];

  const strings: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    strings.push(key);
    strings.push(...collectStringValues(nested));
  }
  return strings;
}

function containsAny(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}
