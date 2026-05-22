import { join } from "node:path";
import { JsonlRawHealthEventStore } from "./ledger";

const defaultStorePath = join(process.cwd(), ".data", "health-events.jsonl");

export function getDefaultRawHealthEventStore(): JsonlRawHealthEventStore {
  return new JsonlRawHealthEventStore(process.env.HEALTH_LEDGER_PATH ?? defaultStorePath);
}
