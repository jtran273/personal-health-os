# Architecture

## Core Shape

Personal Health OS uses a source-agnostic body ledger. Provider integrations produce raw events. Normalization turns those events into daily metrics. Product logic consumes normalized ledgers, not provider-specific payloads.

```text
Apple Health / OpenClaw / Oura / Scale
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

- Sleep and recovery: Apple Watch through Apple Health during the 14-day trial; dormant Oura fallback only when explicitly re-enabled.
- Workouts and steps: Apple Watch / Apple Health first, then iPhone HealthKit bridge.
- Weight: smart scale or OpenClaw/manual prompt by default; accept Apple Health body-mass samples when present.
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

## Web and iOS Surfaces

The root web app is an operator shell for humans and agents. It should show body mode, coverage, capture affordances, and route status without pretending persistence is finished.

The iOS app under `ios/BodyOS` is the active product surface. It already owns real-device Apple Health ingestion, SwiftData ledger persistence, and the native Today/Copilot/Body/Weekly/Sources experience. Keep shared concepts aligned across both surfaces: source, confidence, coverage, and body mode.

## OpenClaw Health API Boundary

OpenClaw talks to a narrow health namespace at `/api/openclaw/health/*`. These routes are separate from provider integration routes because they are assistant-facing, stable, and safe by default.

- Auth: `Authorization: Bearer $OPENCLAW_HEALTH_TOKEN`.
- Reads: `GET /daily-summary` and `GET /today-plan` return concise body mode, next action, missing signals, and safety metadata.
- Writes: `POST /meals` and `POST /weight` accept bounded ingestion events only. They normalize input and return the accepted object; persistence can be attached later without changing the response contract.
- Safety: OpenClaw responses do not include raw Oura, HealthKit, Apple Watch, or smart-scale payloads. They do not include secrets. They explicitly set `medicalDiagnosis: false`.

Current web backend reads use the sample normalized ledger until persistence is wired. The response includes `dataState: "sample_until_persistence"` so OpenClaw can avoid overclaiming freshness.
