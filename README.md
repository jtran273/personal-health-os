# Personal Health OS

James-first health and diet operating system for reducing cognitive load around body composition, meals, recovery, and day planning.

OpenClaw is the daily interface. This app is the source-agnostic backend and eventual frontend shell that receives meal text/photos, weight prompts, Oura and Apple Health style wearable data, then normalizes them into a daily body ledger.

## Current Scope

- Next.js App Router skeleton with TypeScript.
- Source-agnostic health domain model in `src/lib/health`.
- Safe provider stubs for Oura, HealthKit, and OpenClaw ingestion.
- Placeholder API routes for daily ledger reads, meal ingestion, and Oura sync.
- Product and architecture docs under `docs/`.

No auth, payment, production persistence, or polished UI is implemented yet. The frontend is intentionally plain so a designer can replace the surface without fighting the backend foundation.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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
