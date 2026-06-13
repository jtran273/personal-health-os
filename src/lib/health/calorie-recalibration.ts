import { buildNormalizedDailyLedger } from "./normalization";
import type { MetricConfidence, MetricValue, RawHealthEvent } from "./types";
import { assertValidDate, ValidationError } from "./validation";

export interface WeightTrendInput {
  observedKgDelta: number;
  days: number;
}

export interface CalorieRecalibrationInput {
  wearableActiveCaloriesPerDay?: number;
  loggedIntakeCaloriesPerDay?: number;
  estimatedBasalCaloriesPerDay?: number;
  predictedDeficitCaloriesPerDay?: number;
  minimumTrendDays?: number;
  weightTrend?: WeightTrendInput;
}

export type CalorieCalibrationStatus = "held" | "slipped" | "insufficient_data";

export type CalorieAdjustmentDirection = "hold" | "decrease_intake" | "increase_intake";

export interface NextWeekCalorieAdjustment {
  direction: CalorieAdjustmentDirection;
  caloriesPerDay: number;
  rationale: string;
}

export interface CalorieRecalibrationResult {
  status: CalorieCalibrationStatus;
  predictedDailyDeficitCalories?: MetricValue<number>;
  observedDailyDeficitCalories?: MetricValue<number>;
  nextWeekAdjustment?: MetricValue<NextWeekCalorieAdjustment>;
  adjustedDailyEnergyEstimate?: MetricValue<number>;
  correctionFactor?: number;
  confidence: MetricConfidence;
  notes: string[];
}

export interface BuildWeeklyCalorieCalibrationOptions {
  events: RawHealthEvent[];
  windowDays: number;
  endDate?: string;
}

export interface WeeklyCalorieCalibrationResult extends CalorieRecalibrationResult {
  windowDays: number;
  startDate: string;
  endDate: string;
  completeDeficitDays: number;
  weightRows: number;
  loggedIntakeCaloriesPerDay?: MetricValue<number>;
  wearableActiveCaloriesPerDay?: MetricValue<number>;
  weightTrend?: WeightTrendInput;
  reasons: string[];
}

const kcalPerKg = 7700;
const closeEnoughCaloriesPerDay = 100;

export function recalibrateCalories(
  input: CalorieRecalibrationInput
): CalorieRecalibrationResult {
  const notes = ["Wearable calorie estimates are treated as rough priors."];
  const predictedDailyDeficitCalories = calculatePredictedDailyDeficit(input);

  if (
    predictedDailyDeficitCalories === undefined ||
    input.weightTrend === undefined ||
    input.weightTrend.days < (input.minimumTrendDays ?? 7)
  ) {
    return {
      status: "insufficient_data",
      confidence: "low",
      notes: [...notes, "Need at least 7 days of intake, expenditure, and weight trend data."]
    };
  }

  const observedDailyDeficitCalories =
    (-input.weightTrend.observedKgDelta * kcalPerKg) / input.weightTrend.days;
  const deficitGapCalories = predictedDailyDeficitCalories - observedDailyDeficitCalories;
  const adjustment = calculateNextWeekAdjustment(deficitGapCalories);
  const confidence = input.weightTrend.days >= 14 ? "medium" : "low";
  const expectedTotalBurn =
    input.estimatedBasalCaloriesPerDay === undefined || input.wearableActiveCaloriesPerDay === undefined
      ? undefined
      : input.estimatedBasalCaloriesPerDay + input.wearableActiveCaloriesPerDay;
  const trendImpliedBurn =
    input.loggedIntakeCaloriesPerDay === undefined
      ? undefined
      : input.loggedIntakeCaloriesPerDay + observedDailyDeficitCalories;
  const correctionFactor =
    expectedTotalBurn === undefined || trendImpliedBurn === undefined
      ? undefined
      : trendImpliedBurn / expectedTotalBurn;

  return {
    status: adjustment.direction === "hold" ? "held" : "slipped",
    predictedDailyDeficitCalories: {
      value: roundCalories(predictedDailyDeficitCalories),
      source: "openclaw",
      confidence,
      notes: "Predicted daily deficit from logged intake and available expenditure signals."
    },
    observedDailyDeficitCalories: {
      value: roundCalories(observedDailyDeficitCalories),
      source: "openclaw",
      confidence,
      notes: "Observed daily deficit inferred from scale trend using 7700 kcal per kg."
    },
    nextWeekAdjustment: {
      value: adjustment,
      source: "openclaw",
      confidence,
      notes: "Single next-week adjustment derived from the predicted-vs-observed deficit gap."
    },
    adjustedDailyEnergyEstimate:
      expectedTotalBurn === undefined || correctionFactor === undefined
        ? undefined
        : {
            value: Math.round(expectedTotalBurn * correctionFactor),
            source: "openclaw",
            confidence,
            notes: "Trend-adjusted estimate derived from logged intake, wearable calories, and weight movement."
          },
    correctionFactor: correctionFactor === undefined ? undefined : Number(correctionFactor.toFixed(3)),
    confidence,
    notes: [...notes, "Recalibrated against weight trend; review weekly before using for decisions."]
  };
}

export function buildWeeklyCalorieCalibration(
  options: BuildWeeklyCalorieCalibrationOptions
): WeeklyCalorieCalibrationResult {
  const windowDays = assertCalibrationWindow(options.windowDays);
  const endDate = assertValidDate(options.endDate ?? inferEndDate(options.events), "endDate");
  const startDate = shiftDate(endDate, 1 - windowDays);
  const windowEvents = options.events.filter((event) => event.observedAt.slice(0, 10) >= startDate && event.observedAt.slice(0, 10) <= endDate);
  const weightTrend = buildWeightTrend(windowEvents, Math.max(1, windowDays - 1));
  const dailyRows = buildDailyRows(options.events, startDate, endDate);
  const completeDeficitRows = dailyRows.filter((row) => row.estimatedDeficitCalories !== undefined);
  const reasons: string[] = [];

  if (weightTrend.weightRows < 2) {
    reasons.push("Need at least two real weight rows in the calibration window.");
  }
  if (weightTrend.trend === undefined) {
    reasons.push("Need a weight trend spanning the requested calibration window.");
  }
  if (completeDeficitRows.length < 7) {
    reasons.push("Need at least 7 days with logged intake and total-expenditure-derived deficit.");
  }

  const loggedIntakeCaloriesPerDay = averageDefined(
    completeDeficitRows.map((row) => row.loggedIntakeCalories)
  );
  const wearableActiveCaloriesPerDay = averageDefined(
    completeDeficitRows.map((row) => row.wearableActiveCalories)
  );
  const predictedDeficitCaloriesPerDay = averageDefined(
    completeDeficitRows.map((row) => row.estimatedDeficitCalories)
  );

  if (reasons.length > 0) {
    return {
      status: "insufficient_data",
      confidence: "low",
      notes: [
        "Wearable calorie estimates are treated as rough priors.",
        "Calibration is empty until the missing inputs are present."
      ],
      windowDays,
      startDate,
      endDate,
      completeDeficitDays: completeDeficitRows.length,
      weightRows: weightTrend.weightRows,
      loggedIntakeCaloriesPerDay:
        loggedIntakeCaloriesPerDay === undefined
          ? undefined
          : {
              value: roundCalories(loggedIntakeCaloriesPerDay),
              source: "openclaw",
              confidence: "low",
              notes: "Average logged meal calories across complete calibration days."
            },
      wearableActiveCaloriesPerDay:
        wearableActiveCaloriesPerDay === undefined
          ? undefined
          : {
              value: roundCalories(wearableActiveCaloriesPerDay),
              source: "openclaw",
              confidence: "low",
              notes: "Average wearable active calories across complete calibration days; treated as a rough prior."
            },
      weightTrend: weightTrend.trend,
      reasons
    };
  }

  const recalibration = recalibrateCalories({
    wearableActiveCaloriesPerDay,
    loggedIntakeCaloriesPerDay,
    predictedDeficitCaloriesPerDay,
    minimumTrendDays: Math.max(1, windowDays - 1),
    weightTrend: weightTrend.trend
  });

  return {
    ...recalibration,
    windowDays,
    startDate,
    endDate,
    completeDeficitDays: completeDeficitRows.length,
    weightRows: weightTrend.weightRows,
    loggedIntakeCaloriesPerDay:
      loggedIntakeCaloriesPerDay === undefined
        ? undefined
        : {
            value: Math.round(loggedIntakeCaloriesPerDay),
            source: "openclaw",
            confidence: recalibration.confidence,
            notes: "Average logged meal calories across complete calibration days."
          },
    wearableActiveCaloriesPerDay:
      wearableActiveCaloriesPerDay === undefined
        ? undefined
        : {
            value: Math.round(wearableActiveCaloriesPerDay),
            source: "openclaw",
            confidence: "low",
            notes: "Average wearable active calories across complete calibration days; treated as a rough prior."
          },
    weightTrend: weightTrend.trend,
    reasons,
    notes: recalibration.notes
  };
}

export function assertCalibrationWindow(value: number): number {
  if (!Number.isInteger(value) || value < 7 || value > 28) {
    throw new ValidationError("window must be an integer between 7 and 28.");
  }
  return value;
}

function calculatePredictedDailyDeficit(input: CalorieRecalibrationInput): number | undefined {
  if (input.predictedDeficitCaloriesPerDay !== undefined) return input.predictedDeficitCaloriesPerDay;
  if (
    input.wearableActiveCaloriesPerDay === undefined ||
    input.loggedIntakeCaloriesPerDay === undefined ||
    input.estimatedBasalCaloriesPerDay === undefined
  ) {
    return undefined;
  }
  return input.estimatedBasalCaloriesPerDay + input.wearableActiveCaloriesPerDay - input.loggedIntakeCaloriesPerDay;
}

function calculateNextWeekAdjustment(deficitGapCalories: number): NextWeekCalorieAdjustment {
  const caloriesPerDay = roundCalories(Math.abs(deficitGapCalories));
  if (caloriesPerDay <= closeEnoughCaloriesPerDay) {
    return {
      direction: "hold",
      caloriesPerDay: 0,
      rationale: "Predicted and observed deficit are within 100 kcal/day."
    };
  }

  if (deficitGapCalories > 0) {
    return {
      direction: "decrease_intake",
      caloriesPerDay,
      rationale: "Observed deficit was lower than predicted."
    };
  }

  return {
    direction: "increase_intake",
    caloriesPerDay,
    rationale: "Observed deficit was higher than predicted."
  };
}

interface DailyCalibrationRow {
  date: string;
  loggedIntakeCalories?: number;
  wearableActiveCalories?: number;
  estimatedDeficitCalories?: number;
}

function buildDailyRows(events: RawHealthEvent[], startDate: string, endDate: string): DailyCalibrationRow[] {
  const rows: DailyCalibrationRow[] = [];
  for (const date of eachDate(startDate, endDate)) {
    const result = buildNormalizedDailyLedger({ date, events });
    const loggedIntakeCalories = result.ledger.meals.reduce((sum, meal) => sum + (meal.estimatedCalories?.value ?? 0), 0);
    const totalBurnCalories = totalBurnCaloriesForDate(events, date, result.ledger.activeEnergyCalories?.value);
    rows.push({
      date,
      loggedIntakeCalories: loggedIntakeCalories > 0 ? loggedIntakeCalories : undefined,
      wearableActiveCalories: result.ledger.activeEnergyCalories?.value,
      estimatedDeficitCalories:
        loggedIntakeCalories > 0 && totalBurnCalories !== undefined
          ? totalBurnCalories - loggedIntakeCalories
          : undefined
    });
  }
  return rows;
}

function totalBurnCaloriesForDate(
  events: RawHealthEvent[],
  date: string,
  activeEnergyCalories: number | undefined
): number | undefined {
  const dayEvents = events.filter((event) => event.observedAt.slice(0, 10) === date || readString(event.payload, "day") === date);
  const explicitTotalBurn = averageDefined(
    dayEvents.map((event) =>
      firstNumber(event.payload, [
        "totalBurnCalories",
        "totalEnergyCalories",
        "estimatedTotalBurnCalories",
        "total_calories",
        "calories.total"
      ])
    )
  );
  if (explicitTotalBurn !== undefined) return explicitTotalBurn;

  const basalCalories = averageDefined(
    dayEvents.map((event) =>
      firstNumber(event.payload, [
        "basalCalories",
        "basalEnergyCalories",
        "estimatedBasalCalories",
        "estimatedBasalCaloriesPerDay",
        "basal_calories",
        "calories.basal"
      ])
    )
  );
  if (basalCalories === undefined || activeEnergyCalories === undefined) return undefined;
  return basalCalories + activeEnergyCalories;
}

function buildWeightTrend(events: RawHealthEvent[], minimumDays: number): { trend?: WeightTrendInput; weightRows: number } {
  const weights = events
    .map((event) => ({ observedAt: event.observedAt, weightKg: readNumber(event.payload, "weightKg"), type: event.type }))
    .filter((event): event is { observedAt: string; weightKg: number; type: string } => event.type === "weight" && event.weightKg !== undefined)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));

  if (weights.length < 2) return { weightRows: weights.length };

  const first = weights[0];
  const last = weights[weights.length - 1];
  const days = (Date.parse(last.observedAt) - Date.parse(first.observedAt)) / 86_400_000;
  if (days < minimumDays) return { weightRows: weights.length };

  return {
    weightRows: weights.length,
    trend: {
      observedKgDelta: last.weightKg - first.weightKg,
      days
    }
  };
}

function averageDefined(values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined);
  if (defined.length === 0) return undefined;
  return defined.reduce((sum, value) => sum + value, 0) / defined.length;
}

function roundCalories(value: number): number {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}

function inferEndDate(events: RawHealthEvent[]): string {
  return events.map((event) => event.observedAt.slice(0, 10)).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
}

function eachDate(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  while (cursor <= end) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return dates;
}

function shiftDate(date: string, days: number): string {
  const time = Date.parse(`${date}T00:00:00.000Z`);
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10);
}

function readNumber(payload: unknown, path: string): number | undefined {
  const value = readPath(payload, path);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstNumber(payload: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = readNumber(payload, path);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readString(payload: unknown, path: string): string | undefined {
  const value = readPath(payload, path);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readPath(payload: unknown, path: string): unknown {
  let current = payload;
  for (const part of path.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
