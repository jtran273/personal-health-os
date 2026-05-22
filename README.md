# Personal Health OS

James-first health and diet operating system for reducing cognitive load around body composition, meals, recovery, and day planning.

OpenClaw is the daily interface. This repo holds the source-agnostic health model, API contracts, a lightweight web operator surface, and the native BodyOS iOS app.

## Current Status

- Next.js App Router shell with a static Health OS control surface.
- Source-agnostic TypeScript health domain model in `src/lib/health`.
- Local-first raw health event ledger under `src/lib/health/ledger` with JSONL dev persistence.
- Basic normalization from raw Oura/OpenClaw events into daily ledgers.
- API routes for daily ledger reads, meal capture, and Oura sync backed by local storage.
- OpenClaw-safe API routes under `/api/openclaw/health`.
- Native SwiftUI iOS app under `ios/BodyOS` with real-device Apple Health ingestion.
- Product, architecture, roadmap, hardware, and integration docs under `docs/`.

No auth, payment, cloud persistence, or secret-backed production ingestion is in place yet.

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` only when you need provider-backed routes:

```bash
OURA_PAT=
OPENCLAW_HEALTH_TOKEN=
OPENCLAW_INGESTION_TOKEN=
```

Do not commit real tokens, `.env.local`, or `ios/BodyOS/BodyOS/Resources/Secrets.plist`.

## Architecture Map

```text
OpenClaw / Apple Health / Oura / Smart scale / Manual entry
  -> provider adapters in src/lib/providers or ios/BodyOS/BodyOS/Services
  -> raw source events with provenance
  -> normalized daily ledger
  -> body mode, coverage, prompts, weekly recalibration
  -> web shell, iOS UI, and future OpenClaw replies
```

Important directories:

| Path | Purpose |
| --- | --- |
| `app/` | Next.js routes, API handlers, and web shell UI. |
| `app/api/openclaw/health/` | Assistant-facing health contracts with bearer auth and bounded JSON. |
| `src/lib/health/` | Source-agnostic model, source routing, body-mode logic, calorie recalibration. |
| `src/lib/openclaw/health/` | OpenClaw auth, validation, summary, and safety helpers. |
| `src/lib/providers/` | Provider-specific adapters and ingestion helpers. |
| `src/test/` | Node test coverage for domain logic. |
| `docs/` | Product, architecture, hardware, roadmap, and OpenClaw strategy. |
| `ios/BodyOS/` | Native SwiftUI app, HealthKit ingestion, SwiftData ledger, design system, tests. |

## API Routes

| Route | Method | Current behavior |
| --- | --- | --- |
| `/api/health/daily-ledger` | `GET` | Returns the normalized daily ledger for a requested date from local dev persistence. |
| `/api/health/meals` | `GET` | Returns normalized meal entries for a requested date. |
| `/api/health/meals` | `POST` | Builds and persists a bounded OpenClaw meal log from text/photo input. |
| `/api/integrations/oura/sync` | `POST` | Fetches Oura sleep/readiness when `OURA_PAT` is set and stores raw source events. |

## OpenClaw Health API

OpenClaw-safe health endpoints live under `/api/openclaw/health` and require:

```bash
Authorization: Bearer $OPENCLAW_HEALTH_TOKEN
```

They return concise, assistant-friendly JSON with safety metadata: no raw provider payloads, no secrets, ingestion-only writes, and `medicalDiagnosis: false`.

Examples:

```bash
curl -H "Authorization: Bearer $OPENCLAW_HEALTH_TOKEN" \
  http://localhost:3000/api/openclaw/health/daily-summary

curl -H "Authorization: Bearer $OPENCLAW_HEALTH_TOKEN" \
  http://localhost:3000/api/openclaw/health/today-plan

curl -X POST http://localhost:3000/api/openclaw/health/meals \
  -H "Authorization: Bearer $OPENCLAW_HEALTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"chicken bowl","estimatedCalories":650,"estimatedProteinGrams":42}'

curl -X POST http://localhost:3000/api/openclaw/health/weight \
  -H "Authorization: Bearer $OPENCLAW_HEALTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weightKg":82.4}'
```

Missing `OPENCLAW_HEALTH_TOKEN` returns `503` with a configuration error. Missing or invalid bearer auth returns `401`. Tokens are never logged or returned.

## Local Health Ledger

Development writes raw provider events to `.data/health-events.jsonl` by default. The file is git-ignored and is meant for local iteration only. Each event keeps its raw provider payload internally, while public summary routes return normalized meals and ledger metrics without echoing raw payloads.

Useful local calls:

```bash
curl "http://localhost:3000/api/health/daily-ledger?date=2026-05-21"
curl "http://localhost:3000/api/health/meals?date=2026-05-21"
curl -X POST "http://localhost:3000/api/health/meals" \
  -H "content-type: application/json" \
  -d '{"text":"eggs and toast","loggedAt":"2026-05-21T15:00:00.000Z"}'
```

Reset local dev health data:

```bash
rm -f .data/health-events.jsonl
```

To store the dev ledger somewhere else, set `HEALTH_LEDGER_PATH=/absolute/path/events.jsonl`.

## iOS App

The native BodyOS app is in `ios/BodyOS`. It is currently the most complete product surface.

```bash
scripts/ci-ios.sh
```

`ci-ios.sh` installs XcodeGen with Homebrew if needed, regenerates `BodyOS.xcodeproj` from `project.yml`, verifies the generated project does not reference `Secrets.plist`, and runs `xcodebuild test` on the first available iOS Simulator. To pin a simulator locally, pass `IOS_DESTINATION='platform=iOS Simulator,name=iPhone 17 Pro' scripts/ci-ios.sh`.

For real-device Apple Watch data, use the setup and launch notes in [`ios/BodyOS/README.md`](./ios/BodyOS/README.md). The active bundle id is `com.jamestran.bodyos`.

## Checks

Run the root checks before opening a PR:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Run iOS checks when touching Swift, Xcode project config, HealthKit behavior, or iOS docs:

```bash
scripts/ci-ios.sh
```

## Agent Workflow

Before non-trivial work:

1. Read this README, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), and the relevant roadmap/integration doc.
2. For iOS work, read [`ios/BodyOS/HANDOFF.md`](./ios/BodyOS/HANDOFF.md) and [`ios/BodyOS/memory-bank/active-context.md`](./ios/BodyOS/memory-bank/active-context.md).
3. Keep vendor types out of domain models and feature views.
4. Prefer source-attributed, confidence-aware ledger rows over fake dashboard values.
5. Update docs or memory-bank files when a durable project decision changes.

The current highest-leverage build path is durable OpenClaw meal/weight ingestion, then weekly weight-trend recalibration once enough real rows exist.
