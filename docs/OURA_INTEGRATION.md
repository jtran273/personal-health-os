# Oura Ring Integration

How Oura data flows into the health ledger, and how to set it up.

## Overview

The Next.js backend pulls Oura API v2 daily collections and stores them as raw
events in the JSONL ledger (`.data/health-events.jsonl`). Normalization then
folds them into the daily ledger that the BodyOS iOS app and OpenClaw endpoints
read. The iOS app also has its own direct Oura client (`OuraService` +
`OuraIngestor`) that writes into the on-device SwiftData ledger; both paths use
the same source-routing rule: **Oura wins sleep/recovery, Apple Health wins
movement, scale/manual wins weight**.

## Auth: two supported modes

1. **OAuth2 (preferred for production).** Register the app at
   <https://cloud.ouraring.com/oauth/applications>, set `OURA_CLIENT_ID` and
   `OURA_CLIENT_SECRET`, then visit `/api/integrations/oura/connect` to
   authorize. Tokens are persisted to `.data/oura-tokens.json` (override with
   `OURA_TOKEN_PATH`) and auto-refresh ~60s before expiry.
2. **Personal Access Token (simplest for a single user).** Create a PAT at
   <https://cloud.ouraring.com/personal-access-tokens> and set `OURA_PAT`.
   Used as a fallback whenever no OAuth tokens are stored.

The redirect URI registered with Oura must match exactly:
`http://localhost:3000/api/integrations/oura/callback` for local dev, or
`https://<your-domain>/api/integrations/oura/callback` in production
(override with `OURA_REDIRECT_URI`).

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/integrations/oura/connect` | GET | 302 to Oura's authorize page (sets a state cookie) |
| `/api/integrations/oura/callback` | GET | Exchanges the code, persists tokens |
| `/api/integrations/oura/status` | GET | `{connected, method: "oauth"\|"pat"\|null, expiresAt?}` |
| `/api/integrations/oura/sync` | POST | Fetches collections, inserts deduped raw events, returns the normalized ledger |

`sync` accepts an optional JSON body `{startDate, endDate}` (`YYYY-MM-DD`).
Defaults: `endDate` = today, `startDate` = `endDate − 6 days`. Re-syncing the
same range is safe — raw event IDs are deterministic and inserts are deduped.

## Collections fetched

`daily_sleep`, `daily_readiness`, `daily_activity` (required — failures fail
the sync), plus `daily_resilience`, `daily_cardiovascular_age`, `daily_spo2`,
`daily_stress` (best-effort — failures are logged and skipped, since some
require newer ring hardware or take weeks of wear to populate).

A brand-new ring returns almost nothing on day one; sleep/readiness appear the
morning after the first night worn. An empty sync result is normal, not a bug.

## Environment variables

| Var | Required | Notes |
| --- | --- | --- |
| `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` | for OAuth | from the Oura developer portal |
| `OURA_REDIRECT_URI` | no | overrides the request-origin-derived callback URL |
| `OURA_TOKEN_PATH` | no | OAuth token store path, default `.data/oura-tokens.json` |
| `OURA_PAT` | for PAT mode | fallback when no OAuth tokens exist |

Real values live in `.env.local` (gitignored). The iOS app's PAT lives in
`ios/BodyOS/BodyOS/Resources/Secrets.plist` (also gitignored) or the Keychain
via Settings.

## Token refresh behavior

`getOuraAccessToken()` returns the stored OAuth access token, refreshing it
(and persisting the rotated refresh token) when within 60 seconds of expiry.
On a 401 from the Oura API, the fetcher forces one refresh and retries once.
If no OAuth tokens exist it falls back to `OURA_PAT`.

## Tests

- `src/test/oura-ring5.test.ts` — collection fetchers and sync behavior.
- `src/test/oura-oauth.test.ts` — token store, refresh, authorize URL,
  callback state verification, credential guard.

Run with `npm test`.
