# OpenClaw Integration Strategy

OpenClaw should stay the lowest-friction interface for meals, weight prompts, and daily summaries.
The app should do the bookkeeping; OpenClaw should ask for only the missing signal that matters.

## Current Contracts

| Route | Role | Status |
| --- | --- | --- |
| `POST /api/health/meals` | Accept meal text and future photo references from OpenClaw. | Builds a meal log, no persistence yet. |
| `GET /api/health/meals` | Return meals for the day. | Empty placeholder. |
| `GET /api/health/daily-ledger` | Return body mode, normalized metrics, and missing work. | Sample ledger. |
| `POST /api/openclaw/health/bodyos-ledger` | Accept BodyOS iOS assistant-safe Apple Health ledger summaries. | Validates local/dev handoff, no raw HealthKit samples. |

## Desired Loop

1. Morning: OpenClaw requests the daily summary and sends one body-mode action.
2. During day: James texts a meal or photo; OpenClaw forwards it to the meal route.
3. Evening: OpenClaw asks for only the highest-value missing signal, usually weight or protein.
4. Weekly: OpenClaw summarizes calibration: expected deficit vs observed weight trend.

## Ingestion Rules

- Require explicit bearer auth before accepting writes (`OPENCLAW_HEALTH_TOKEN` for `/api/openclaw/health/*`; legacy ingestion routes may use `OPENCLAW_INGESTION_TOKEN`).
- Store raw OpenClaw payloads unchanged before normalization.
- Preserve source, observed time, received time, and original text/photo URL.
- Mark text/manual calories as `medium` confidence and photo estimates as `low` until corrected.
- Never overwrite same-day manual weight with a lower-confidence source.
- BodyOS HealthKit bridge payloads must include source attribution, confidence, freshness, missing signals, and `safety.*Included=false`; never include raw HealthKit samples or tokens.

## Future Endpoints

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/openclaw/daily-summary` | `GET` | Body mode, one action, missing signals, and source coverage. |
| `/api/openclaw/weight` | `POST` | Manual weight prompt response or future scale relay. |
| `/api/openclaw/meal-photo` | `POST` | Photo reference plus optional text for async macro estimation. |
| `/api/openclaw/weekly-review` | `GET` | Trend and recalibration summary for the weekly message. |

## Response Shape Principles

- Return plain JSON that can be sent directly over iMessage with minimal formatting.
- Include confidence and source labels in every metric block.
- Prefer one recommended action over a dashboard dump.
- Include `missingSignals` so OpenClaw can decide whether to ask a follow-up.
