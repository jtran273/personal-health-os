import type { BodyMode, CalendarPressure, MetricValue } from "./types";

export interface BodyModeInput {
  readinessScore?: MetricValue<number>;
  sleepHours?: MetricValue<number>;
  temperatureDeviationC?: MetricValue<number>;
  stressScore?: MetricValue<number>;
  calendarPressure?: CalendarPressure;
}

export interface BodyModeResult {
  mode: BodyMode;
  reasons: string[];
}

export function classifyBodyMode(input: BodyModeInput): BodyModeResult {
  const reasons: string[] = [];
  let riskScore = 0;

  if (input.readinessScore && input.readinessScore.value < 55) {
    riskScore += 2;
    reasons.push("low readiness");
  } else if (input.readinessScore && input.readinessScore.value < 70) {
    riskScore += 1;
    reasons.push("moderate readiness");
  }

  if (input.sleepHours && input.sleepHours.value < 5.5) {
    riskScore += 2;
    reasons.push("short sleep");
  } else if (input.sleepHours && input.sleepHours.value < 6.5) {
    riskScore += 1;
    reasons.push("reduced sleep");
  }

  if (input.temperatureDeviationC && Math.abs(input.temperatureDeviationC.value) >= 0.7) {
    riskScore += 2;
    reasons.push("elevated temperature deviation");
  }

  if (input.stressScore && input.stressScore.value >= 75) {
    riskScore += 2;
    reasons.push("high stress");
  } else if (input.stressScore && input.stressScore.value >= 60) {
    riskScore += 1;
    reasons.push("moderate stress");
  }

  if (isHighPressureDay(input.calendarPressure)) {
    riskScore += 1;
    reasons.push("high calendar pressure");
  }

  if (riskScore >= 4) return { mode: "red", reasons };
  if (riskScore >= 2) return { mode: "yellow", reasons };
  return { mode: "green", reasons: reasons.length ? reasons : ["baseline signals look stable"] };
}

function isHighPressureDay(calendarPressure?: CalendarPressure): boolean {
  if (!calendarPressure) return false;
  return (
    calendarPressure.meetingHours >= 5 ||
    calendarPressure.subjectivePressure === "high" ||
    (calendarPressure.hasEarlyStart && calendarPressure.hasLateEnd)
  );
}
