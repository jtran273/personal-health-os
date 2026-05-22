# Personal Health OS

James-first health and diet operating system for reducing cognitive load around body composition, meals, recovery, and day planning.

OpenClaw is the daily interface. This repo holds the source-agnostic health model, API contracts, a lightweight web operator surface, and the native BodyOS iOS app.

## Current Status

- Next.js App Router shell with a static Health OS control surface.
- Source-agnostic TypeScript health domain model in `src/lib/health`.
- Safe provider stubs for Oura, HealthKit-style data, and OpenClaw ingestion.
- Placeholder API routes for daily ledgers, meal capture, and Oura sync.
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

| Route | Method | Current behavior | Next useful step |
| --- | --- | --- | --- |
| `/api/health/daily-ledger` | `GET` | Returns a sample normalized ledger and body-mode reasons. | Back with durable ledger storage. |
| `/api/health/meals` | `GET` | Returns an empty meal list plus TODOs. | Read persisted meals for the requested day. |
| `/api/health/meals` | `POST` | Builds an OpenClaw meal log from text/photo input. | Validate ingestion token and persist raw event. |
| `/api/integrations/oura/sync` | `POST` | Fetches Oura sleep/readiness when `OURA_PAT` is set. | Keep dormant unless Oura becomes active again. |

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

## iOS App

The native BodyOS app is in `ios/BodyOS`. It is currently the most complete product surface.

```bash
cd ios/BodyOS
xcodegen generate
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test \
  -project BodyOS.xcodeproj \
  -scheme BodyOS \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO
```

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
cd ios/BodyOS
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test \
  -project BodyOS.xcodeproj \
  -scheme BodyOS \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO
```

## Agent Workflow

Before non-trivial work:

1. Read this README, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), and the relevant roadmap/integration doc.
2. For iOS work, read [`ios/BodyOS/HANDOFF.md`](./ios/BodyOS/HANDOFF.md) and [`ios/BodyOS/memory-bank/active-context.md`](./ios/BodyOS/memory-bank/active-context.md).
3. Keep vendor types out of domain models and feature views.
4. Prefer source-attributed, confidence-aware ledger rows over fake dashboard values.
5. Update docs or memory-bank files when a durable project decision changes.

The current highest-leverage build path is durable OpenClaw meal/weight ingestion, then weekly weight-trend recalibration once enough real rows exist.
