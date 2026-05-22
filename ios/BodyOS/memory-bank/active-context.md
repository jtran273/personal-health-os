# Active Context

What's being worked on *right now*. Update at the start and end of every session.

**Last updated:** 2026-05-21 PT (real-device HealthKit verified)

## Current state

App **builds, typechecks, and tests cleanly** after the Apple Watch pivot. Today, Copilot shell, Body Ledger, Weekly Review, and Sources are all present as root tabs. Oura code still exists but auto-ingestion is disabled for now. Apple Watch / Apple Health is now the active wearable path via HealthKit. Ledger persistence is SwiftData-backed by default.

Hand-off doc for the next agent: [`HANDOFF.md`](../HANDOFF.md).

## What's done

- Full folder layout under `BodyOS/`.
- Source-agnostic ledger model (`MetricSample`, `DailyLedgerEntry`, etc).
- SwiftData persistence behind `LedgerStore`; app startup uses `SwiftDataLedgerStore` and falls back to `InMemoryLedgerStore` if container creation fails.
- Manual weight entry is reachable from Body Ledger and writes today's row with `.manual` source and high confidence.
- Manual meal entry is reachable from Copilot and writes user-entered calories/protein into today's ledger with `.manual` source.
- Sources can open Oura token management from the Oura source card and refresh source coverage after dismissal.
- Agentic-coding documentation: `CLAUDE.md`, `AGENTS.md`, `HANDOFF.md`, `memory-bank/`, `docs/PRD.md`.
- Oura integration exists and was previously verified, but it is now dormant because James returned the ring.
- Apple Watch / Apple Health is the active wearable path. HealthKit reads sleep duration, HRV, resting HR, steps, active calories, and body mass; `HealthKitIngestor` merges them into `DailyLedgerEntry`.
- Design-handoff bundle copied into `design-handoff/`.
- Design system Days 1–5 shipped. Day 6 Copilot shell and Day 7 Weekly UI are partially shipped.
- Root tab bar now has Today / Copilot / Body / Weekly / Sources. The old Weight screen still exists in `Features/Weight/` but is no longer the root tab; its view model is ledger-backed and reused by the Body Ledger sheet.
- Root tab selection supports `--initial-tab body|meals|weekly|sources` for simulator verification. Normal launch still defaults to Today.
- `HealthKitService` now requests authorization and reads sleep duration, HRV, resting HR, steps, active energy, and body mass.
- `HealthKitIngestor` merges HealthKit recovery/movement/weight into the ledger when `source.healthKit` is enabled.
- `HealthKitIngestor` now depends on the domain-level `HealthKitReading` protocol, with unit tests covering Apple Health ledger merge behavior and the no-data path.
- HealthKit sleep reads now use an overnight window around the morning date so 11pm-7am sleep is not dropped by strict midnight boundaries.
- `LedgerCoverage` is the single daily coverage scorer for HealthKit, Oura, meal, and weight writes.
- `Secrets.plist` is excluded from XcodeGen resources; keep using Keychain or scheme env vars for any future Oura testing.
- Sources now runs a recent HealthKit ingest immediately after Apple Health permission succeeds.
- Copilot composer can directly log text meals with calories/protein, and falls back to a prefilled manual sheet when calories are missing.
- HealthKit weight reads do not overwrite a same-day manual weight row.
- All four custom fonts downloaded and bundled.
- `BodyOS.xcodeproj` generated via xcodegen from `project.yml`. HealthKit entitlement, all Info.plist usage strings, `UIAppFonts` array, automatic signing.
- Whole codebase typechecks cleanly via `swiftc -typecheck`.
- Full Xcode build succeeds for iPhone 17 Pro simulator.
- `BodyOSTests` runs cleanly on simulator; latest suite has Sources HealthKit connection coverage in addition to ledger and meal tests.

## What's *not* done

1. **Meal estimation.** `MealLogService.estimateMacros` needs a Claude API call (vision-capable, since meals are photos + text).
2. **Real Copilot chat actions.** Copilot can log manual meals, but message sending, photo attachment, and known-food save are not wired.
3. **Weight calibration depth.** Manual logging works, but Weekly calibration needs at least two real weigh-ins and clearer chart behavior.
4. **Today / Body interactions.** `Plan it`, `Why this?`, open-loop CTAs, and Today metric taps are visual-only for now. Wire them when Copilot / Ledger / Meal flows exist.

## Tested today

- `swiftc -typecheck` against all Swift files. Clean after Apple Watch pivot.
- `xcodebuild test` for iPhone 17 Pro simulator. **26 tests passed, 0 failures**. Latest result bundle: `build/Logs/Test/Test-BodyOS-2026.05.21_17-39-10--0700.xcresult`.
- Real iPhone device signing now uses bundle identifier `com.jamestran.bodyos` with James Tran's Personal Team (`DEVELOPMENT_TEAM=ZDFV9C3CA9`). `xcodebuild` device build succeeds and `devicectl` installs/launches the app on James's iPhone.
- James trusted the developer profile on-device, connected Apple Health from Sources, and confirmed real Apple Watch data appears in the app.
- Install → launch Body, Copilot, and Sources tabs → screenshots via `simctl`. Works.
- Oura PAT may still exist in `Secrets.plist`, but root tabs no longer auto-ingest Oura data.
- Latest screenshots:
  - Today: `/tmp/bodyos-wrap-final.png`
  - Copilot: `/tmp/bodyos-copilot-manual-meal.png`
  - Body: `/tmp/bodyos-body-persistence-weight.png`
  - Weekly: `/tmp/bodyos-weekly-0403.png`
  - Sources: `/tmp/bodyos-sources-oura-manage.png`

## Repo note

`/Users/jamestran/CS/AIphysicalhealth` currently is not a Git repository (`git status` returns "not a git repository"). Track changed files from the handoff until `.git` exists again.

## Verified Oura quirks (encoded in code, but worth knowing)

- `daily_sleep.day` and `daily_readiness.day` use the **morning-of** date (the day the score applies to).
- `sleep.day` on a session uses the **bedtime** date — the session for "this morning's sleep" is dated `today − 1`.
- `daily_activity.day` is recorded **after** the day completes — early morning, today's row doesn't exist yet, so we fall back to yesterday.

## Open questions for James (deferred to next session)

- Smart scale model (Withings Body+ is the obvious choice).
- Apple Watch HealthKit is connected and real-device verified; next priority is meal photo/text flow or smart-scale calibration.
- Notion sync — export target or skip?
- Web app — shared backend or sync from iOS ledger?

None of these block the next persistence or meal-flow milestone.
