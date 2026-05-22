# Architecture

## Core Shape

Personal Health OS uses a source-agnostic body ledger. Provider integrations produce raw events. Normalization turns those events into daily metrics. Product logic consumes normalized ledgers, not provider-specific payloads.

```text
Oura / HealthKit / OpenClaw / Scale
  -> RawHealthEvent[]
  -> NormalizedDailyLedger
  -> Body mode, meal prompts, trend summaries, future budget/calendar links
```

## Raw Events vs Normalized Metrics

Raw events are immutable provider facts:

- source and external id
- observed timestamps
- original payload
- import timestamp

Normalized metrics are app-level facts:

- daily weight and trend direction
- sleep duration and quality
- HRV and resting heart rate
- steps, workouts, active energy estimate
- meals, protein estimate, calorie estimate
- readiness, stress, temperature deviation

The normalized layer is allowed to change as algorithms improve. Raw events should remain available for reprocessing.

## Local Persistence

The web backend now has a small `RawHealthEventStore` abstraction in `src/lib/health/ledger`. The default development implementation is append-only JSONL at `.data/health-events.jsonl`, with an in-memory implementation for tests and future adapters.

Writes dedupe on deterministic natural keys:

- `source`
- `type`
- provider `externalId` when present
- otherwise `observedAt`

This is intentionally simple enough to swap for SQLite, Postgres, or a synced local-first store later. The important contract is that raw events preserve provenance and provider payloads, while summary routes normalize from raw events and do not include raw payloads by default.

Current normalization covers:

- Oura daily sleep/readiness/activity fields when present.
- OpenClaw meal events.
- OpenClaw/manual-style weight events.
- A basic recent weight slope in kg/week.
- Body mode classification from normalized recovery inputs.

## Source Confidence

Every normalized metric carries confidence:

- `high`: preferred source for this metric and recent data is complete.
- `medium`: usable source, incomplete day, or estimated value.
- `low`: rough source, stale data, or inferred value.
- `unknown`: placeholder until data arrives.

Routing defaults:

- Sleep and recovery: Oura.
- Workouts and steps: Apple Watch, Garmin, or HealthKit bridge.
- Weight: smart scale first, then OpenClaw/manual prompt.
- Meals: OpenClaw text/photo ingestion.
- Calories burned: low-confidence prior only.

## Weight Trend Recalibration

Wearable calorie estimates are weak across devices. The app should not directly trust them for diet decisions. Instead:

1. Track weight trend over 7-28 days.
2. Compare expected weight movement from logged intake and estimated expenditure.
3. Calculate a correction factor for calorie estimates.
4. Store the factor and confidence on the ledger.
5. Prefer trend-aware coaching over single-day calorie precision.

## Body Mode

The body mode classifier combines readiness, sleep, temperature deviation, stress, and calendar pressure.

- Green: enough recovery capacity for normal plan.
- Yellow: caution; preserve routine but reduce intensity or decision load.
- Red: recovery debt or illness/stress signal; bias toward rest, simple food, and fewer commitments.

The classifier is intentionally conservative. False confidence is worse than a cautious prompt.
