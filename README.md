# Personal Health OS

James-first health and diet operating system for reducing cognitive load around body composition, meals, recovery, and day planning.

OpenClaw is the daily interface. This app is the source-agnostic backend and eventual frontend shell that receives meal text/photos, weight prompts, Oura and Apple Health style wearable data, then normalizes them into a daily body ledger.

## Current Scope

- Next.js App Router skeleton with TypeScript.
- Source-agnostic health domain model in `src/lib/health`.
- Local-first raw health event ledger under `src/lib/health/ledger`.
- Basic normalization from raw Oura/OpenClaw events into daily ledgers.
- API routes for daily ledger reads, meal ingestion, and Oura sync backed by local JSONL storage.
- Native SwiftUI iOS app under `ios/BodyOS` with verified real-device HealthKit ingestion.
- Product and architecture docs under `docs/`.

No auth, payment, production persistence, or polished UI is implemented yet. The frontend is intentionally plain so a designer can replace the surface without fighting the backend foundation.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### iOS app

The native BodyOS app lives in `ios/BodyOS`.

```bash
cd ios/BodyOS
xcodegen generate
xcodebuild test -project BodyOS.xcodeproj -scheme BodyOS -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build CODE_SIGNING_ALLOWED=NO
```

For real-device HealthKit testing, use the setup notes in `ios/BodyOS/README.md`.

## Checks

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env.local` and fill values locally.

```bash
OURA_PAT=
OPENCLAW_INGESTION_TOKEN=
```

Do not commit real tokens.

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
