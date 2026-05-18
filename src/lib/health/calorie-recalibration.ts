import type { MetricConfidence, MetricValue } from "./types";

export interface WeightTrendInput {
  observedKgDelta: number;
  days: number;
}

export interface CalorieRecalibrationInput {
  wearableActiveCaloriesPerDay?: number;
  loggedIntakeCaloriesPerDay?: number;
  estimatedBasalCaloriesPerDay?: number;
  weightTrend?: WeightTrendInput;
}

export interface CalorieRecalibrationResult {
  adjustedDailyEnergyEstimate?: MetricValue<number>;
  correctionFactor?: number;
  confidence: MetricConfidence;
  notes: string[];
}

const kcalPerKg = 7700;

export function recalibrateCalories(
  input: CalorieRecalibrationInput
): CalorieRecalibrationResult {
  const notes = ["Wearable calorie estimates are treated as rough priors."];

  if (
    input.wearableActiveCaloriesPerDay === undefined ||
    input.loggedIntakeCaloriesPerDay === undefined ||
    input.estimatedBasalCaloriesPerDay === undefined ||
    input.weightTrend === undefined ||
    input.weightTrend.days < 7
  ) {
    return {
      confidence: "low",
      notes: [...notes, "Need at least 7 days of intake, expenditure, and weight trend data."]
    };
  }

  const expectedTotalBurn =
    input.estimatedBasalCaloriesPerDay + input.wearableActiveCaloriesPerDay;
  const observedDailyDeficit =
    (input.weightTrend.observedKgDelta * kcalPerKg) / input.weightTrend.days;
  const trendImpliedBurn = input.loggedIntakeCaloriesPerDay - observedDailyDeficit;
  const correctionFactor = trendImpliedBurn / expectedTotalBurn;

  return {
    adjustedDailyEnergyEstimate: {
      value: Math.round(expectedTotalBurn * correctionFactor),
      source: "manual",
      confidence: "medium",
      notes: "Trend-adjusted estimate derived from logged intake, wearable calories, and weight movement."
    },
    correctionFactor: Number(correctionFactor.toFixed(3)),
    confidence: "medium",
    notes: [...notes, "Recalibrated against weight trend; review weekly before using for decisions."]
  };
}
