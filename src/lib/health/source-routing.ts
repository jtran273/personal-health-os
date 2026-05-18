import type { HealthMetric, MetricConfidence, WearableSource } from "./types";

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
    preferredSource: "oura",
    fallbackSources: ["apple_health", "apple_watch", "garmin", "manual"],
    defaultConfidence: "high",
    rationale: "Oura is the preferred sleep and recovery source."
  },
  recovery: {
    metric: "recovery",
    preferredSource: "oura",
    fallbackSources: ["apple_health", "apple_watch", "garmin", "manual"],
    defaultConfidence: "high",
    rationale: "Recovery should prioritize Oura readiness, HRV, RHR, and temperature context."
  },
  hrv: {
    metric: "hrv",
    preferredSource: "oura",
    fallbackSources: ["apple_health", "apple_watch", "garmin"],
    defaultConfidence: "high",
    rationale: "Oura HRV has strong practical agreement for recovery trend use."
  },
  resting_heart_rate: {
    metric: "resting_heart_rate",
    preferredSource: "oura",
    fallbackSources: ["apple_health", "apple_watch", "garmin"],
    defaultConfidence: "high",
    rationale: "Oura resting heart rate agreement is strong enough to use as default."
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
    fallbackSources: ["apple_watch", "garmin", "oura", "manual"],
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
    fallbackSources: ["apple_watch", "garmin", "oura", "manual"],
    defaultConfidence: "low",
    rationale: "Wearable calories are weak and should be recalibrated against weight trend."
  },
  weight: {
    metric: "weight",
    preferredSource: "smart_scale",
    fallbackSources: ["openclaw", "manual"],
    defaultConfidence: "high",
    rationale: "Weight trend is the anchor for calorie recalibration."
  },
  meal: {
    metric: "meal",
    preferredSource: "openclaw",
    fallbackSources: ["manual"],
    defaultConfidence: "medium",
    rationale: "OpenClaw is the low-friction meal capture interface."
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

function degradeConfidence(confidence: MetricConfidence): MetricConfidence {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return confidence;
}
