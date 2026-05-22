# Personal Health OS

James-first health and diet operating system for reducing cognitive load around body composition, meals, recovery, and day planning.

OpenClaw is the daily interface. This app is the source-agnostic backend and eventual frontend shell that receives meal text/photos, weight prompts, Oura and Apple Health style wearable data, then normalizes them into a daily body ledger.

## Current Scope

- Next.js App Router skeleton with TypeScript.
- Source-agnostic health domain model in `src/lib/health`.
- Safe provider stubs for Oura, HealthKit, and OpenClaw ingestion.
- Placeholder API routes for daily ledger reads, meal ingestion, and Oura sync.
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
OPENCLAW_HEALTH_TOKEN=
OPENCLAW_INGESTION_TOKEN=
```

Do not commit real tokens.

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
