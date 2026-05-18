export type WearableSource =
  | "oura"
  | "apple_health"
  | "apple_watch"
  | "garmin"
  | "smart_scale"
  | "openclaw"
  | "manual";

export type MetricConfidence = "high" | "medium" | "low" | "unknown";

export type BodyMode = "green" | "yellow" | "red";

export type HealthMetric =
  | "sleep"
  | "recovery"
  | "hrv"
  | "resting_heart_rate"
  | "temperature_deviation"
  | "steps"
  | "workout"
  | "active_energy"
  | "weight"
  | "meal";

export interface RawHealthEvent<TPayload = unknown> {
  id: string;
  source: WearableSource;
  type: string;
  observedAt: string;
  receivedAt: string;
  externalId?: string;
  payload: TPayload;
}

export interface MetricValue<TValue> {
  value: TValue;
  source: WearableSource;
  confidence: MetricConfidence;
  notes?: string;
}

export interface MealLog {
  id: string;
  loggedAt: string;
  source: "openclaw" | "manual";
  text?: string;
  photoUrl?: string;
  knownFoods?: KnownFood[];
  estimatedCalories?: MetricValue<number>;
  estimatedProteinGrams?: MetricValue<number>;
}

export interface KnownFood {
  id: string;
  name: string;
  servingDescription?: string;
  calories?: number;
  proteinGrams?: number;
  tags?: string[];
}

export interface CalendarPressure {
  meetingHours: number;
  hasEarlyStart: boolean;
  hasLateEnd: boolean;
  subjectivePressure?: "low" | "medium" | "high";
}

export interface NormalizedDailyLedger {
  date: string;
  bodyMode: BodyMode;
  weightKg?: MetricValue<number>;
  weightTrendKgPerWeek?: MetricValue<number>;
  readinessScore?: MetricValue<number>;
  sleepHours?: MetricValue<number>;
  hrvMs?: MetricValue<number>;
  restingHeartRateBpm?: MetricValue<number>;
  temperatureDeviationC?: MetricValue<number>;
  stressScore?: MetricValue<number>;
  steps?: MetricValue<number>;
  activeEnergyCalories?: MetricValue<number>;
  meals: MealLog[];
  calendarPressure?: CalendarPressure;
  rawEventIds: string[];
  generatedAt: string;
}
