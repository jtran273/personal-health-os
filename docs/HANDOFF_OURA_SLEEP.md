# Handoff: Oura sleep duration / HRV / RHR fix

Status: **diagnosed + verified against live data, not yet implemented.** Branch
`fix/oura-sleep-duration-hrv` exists off `main` with no commits. Pick it up and ship it.

## The bug (root-caused via a live PAT sync on 2026-06-13)

A live sync of the new Oura ring produced a ledger with **`sleepHours: 0.01`**, a resting
heart rate that is actually a 0–100 score, and **no HRV at all**. Root cause is one pattern:
`src/lib/health/normalization.ts` reads Oura **`daily_*` contributor scores as physical units**.

- `sleepHours` ← `firstNumber(payload, ["total_sleep_duration", "contributors.total_sleep", "sleep.total_sleep_duration"])`.
  `daily_sleep` has **no duration field** — only `score` and `contributors` (0–100 sub-scores).
  So it grabs `contributors.total_sleep = 30` (a score), treats it as **seconds**, `30/3600 = 0.01 h`.
- `restingHeartRateBpm` ← `daily_readiness` `contributors.resting_heart_rate` (a 0–100 score, e.g. `85`), not bpm.
- `hrvMs` ← never set, because neither `daily_sleep` nor `daily_readiness` carries HRV in ms.

Real duration / HRV / RHR live in Oura's **detailed `sleep` endpoint**
(`/v2/usercollection/sleep`), which this app never fetches. Fields per sleep period:
`day`, `type` ("long_sleep" | naps), `total_sleep_duration` (seconds), `average_hrv` (ms),
`lowest_heart_rate` (bpm, ≈ true resting HR), `average_heart_rate`.

## The fix

1. **`src/lib/providers/oura.ts`** — add `"sleep"` to the `OuraCollection` union (~line 55) and
   export `fetchOuraSleepPeriods(options)` = `fetchOuraCollection("sleep", options)`. The generic
   fetcher already handles deterministic ids (each period has a unique `id`) and `day`-based `observedAt`.

2. **`app/api/integrations/oura/sync/route.ts`** — import `fetchOuraSleepPeriods`, add it to the
   `Promise.all` as **best-effort** `tryFetch("sleep", () => fetchOuraSleepPeriods(opts))`, and spread
   its events into `events`. (Best-effort so a hiccup never kills the whole sync.)

3. **`src/lib/health/normalization.ts`**, function `applyOuraEvents` (lines ~46–90) ONLY:
   - At the top, select the day's **main** sleep period = the `event.type === "sleep"` payload with the
     largest `total_sleep_duration` (the night, not a nap). From it set, with `"high"` confidence:
     `sleepHours = round(total_sleep_duration / 3600, 2)`, `hrvMs = average_hrv`,
     `restingHeartRateBpm = lowest_heart_rate` (fallback `average_heart_rate`).
   - In the `daily_sleep` handler: **delete** the `sleepSeconds` derivation and the hrv/rhr reads.
     Keep only the `score → readinessScore` fallback (guarded by `!ledger.readinessScore`).
   - In the `daily_readiness` handler: **delete** the contributor-score misreads
     `contributors.hrv_balance` and `contributors.resting_heart_rate`. Keep the plain real-unit keys
     `hrv` / `resting_heart_rate` as guarded fallbacks, and keep `score` + `temperature_deviation`.
   - Guard so detailed-sleep `high`-confidence values are not overwritten by the readiness fallbacks
     (the existing `!ledger.hrvMs` / `!ledger.restingHeartRateBpm` guards already do this if detailed
     sleep runs first — keep the detailed-sleep block before the loop).

   Leave `daily_activity` and everything else untouched.

4. **Tests** — `src/test/oura-ring5.test.ts`: assert `fetchOuraSleepPeriods` is exported; add a
   normalization test feeding a detailed `sleep` event (e.g. `total_sleep_duration: 27000` → `7.5h`,
   `average_hrv: 42`, `lowest_heart_rate: 54`) plus a `daily_sleep` event, asserting real
   hours/hrv/rhr **and** that a lone `daily_sleep` no longer fabricates `0.01h`.

5. **Docs** — `docs/OURA_INTEGRATION.md` "Collections fetched" section: add detailed `sleep`
   (best-effort) and a line noting `daily_sleep` is score-only. Delete this handoff file when done.

## Verify (live, no hardware blocker)

- `npm run typecheck && npm run lint && npm test` (baseline before your work: 68 green on `main`).
- A project dev server is already running on **http://localhost:3001** in **PAT mode**
  (`/api/integrations/oura/status` → `{"connected":true,"method":"pat"}`). Re-sync and eyeball:
  `curl -s -X POST localhost:3001/api/integrations/oura/sync -H 'content-type: application/json' -d '{}'`
  Expect a realistic `sleepHours` (~6–8h), an `hrvMs` (~20–80), and `restingHeartRateBpm` (~45–65),
  all `source: "oura"`, `confidence: "high"`. (Ring worn since 6/11, so 1–2 nights exist.)
- Pre-sync ledger backup: `/tmp/health-events.backup.jsonl` (restore to `.data/health-events.jsonl` if needed).

## ⚠️ Coordinate with the other (ongoing) Codex

A separate Codex epic is running in parallel and **its workstream B also edits
`src/lib/health/normalization.ts`** (Apple Health source attribution). To avoid collisions:
- Confine your edits to the **`applyOuraEvents`** function — do not touch the Apple Health /
  source-routing code paths.
- Rebase onto `main` right before opening your PR; if both touched normalization, reconcile by hand.
- Do **not** touch `src/lib/health/meals.ts`, the meal tests, or `ios/` (other owners).
- Open one PR titled like `fix: derive real Oura sleep duration/HRV/RHR from the detailed sleep endpoint`.
