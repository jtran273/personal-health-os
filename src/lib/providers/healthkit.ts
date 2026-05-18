import type { RawHealthEvent } from "@/lib/health";

export interface HealthKitBridgePayload {
  bridgeVersion: string;
  exportedAt: string;
  events: RawHealthEvent[];
}

export function explainHealthKitBridge(): string {
  return [
    "Apple HealthKit data cannot be fetched directly by a server.",
    "A trusted iOS app or local bridge must read HealthKit on-device, request user permission,",
    "then POST normalized raw events to this backend."
  ].join(" ");
}

export function validateHealthKitBridgePayload(
  payload: HealthKitBridgePayload
): HealthKitBridgePayload {
  return payload;
}
