# Active Context

What's being worked on *right now*. Update at the start and end of every session.

**Last updated:** 2026-06-11 (Oura re-enabled as a live source for the new ring)

## Latest session — Oura is live again (2026-06-11)

James got his NEW Oura ring tonight; the new PAT is in gitignored `BodyOS/Resources/Secrets.plist`, which is now bundled again so `OuraTokenStore` resolves it automatically (decision 022).

- `OuraIngestor` now runs `ingestRecent(days: 7)` on Today load and Sources refresh when a token is configured. No token = silent short-circuit.
- Routing is enforced at merge time: `HealthDataRouter.mergedRecovery` merges sleep/recovery per field (Oura > Apple Health > iPhone) and is used by both `OuraIngestor` and `HealthKitIngestor`, so Oura wins sleep/HRV/RHR/readiness and Apple Health fills gaps. Oura movement only fills days with no Apple Health movement. Oura never writes weight or meals (scale/manual wins weight).
- New `OuraReading` protocol seam mirrors `HealthKitReading` for testable ingestion.
- Settings (Sources) Oura card states: connected (Oura rows in last 7 days), connectedNoData ("Connected; waiting for first night of data"), available (no token). Card actions: "refresh" = sync now, "manage" = token sheet (`OuraConnectionView`).
- Live API verified with the real PAT: all endpoints 200, shapes match `OuraService`/`OuraDTO` exactly; only 1 daily_stress record exists so the app correctly shows the waiting state. Sleep/readiness arrive after the first night worn — re-test tomorrow morning.
- Validation: `xcodebuild test` on iPhone 17 Pro — **58 tests, 0 failures** (`build/Logs/Test/Test-BodyOS-2026.06.11_01-51-12--0700.xcresult`). Simulator screenshot of the Oura card states: `/tmp/bodyos-oura-reenabled.png`.
- Caveat: each refresh is up to 21 Oura calls (3 endpoints × 7 days); batch range queries are a future optimization. Test host bundles the real token, so VM tests inject `isOuraTokenConfigured`.

## Current state

App **builds, typechecks, and tests cleanly** after the local PR #25 hardware-readiness merge, simpler UX pass, daily weight preview, and Tide branding pass. Primary iOS navigation is now **Today / Past / Settings**. The visible product brand is **Tide**; the internal Swift target/module, bundle id, and bridge route namespace remain `BodyOS` / `bodyos.*` for compatibility. Today now uses the animated Tide roundel as the body-mode hero. Past shows a compact daily weight trend first; when the ledger is empty it uses clearly labeled preview-only sample rows instead of writing fake data. Settings has a short setup checklist before source cards. Meals and Body Ledger still exist as supporting flows/code, but they are no longer top-level tabs. Oura is the primary recovery/sleep source; Apple Health is the movement/gap bridge; smart scale/manual weight anchor calorie calibration. The web/OpenClaw layer has Oura Ring 5 collection functions, Withings smart-scale webhook ingestion, and Tide-compatible HealthKit bridge validation ready for real credentials and device testing. Ledger persistence is SwiftData-backed by default in iOS and JSONL-backed for local web/API development.

Hand-off doc for the next agent: [`HANDOFF.md`](../HANDOFF.md).

## What's done

- Full folder layout under `BodyOS/`.
- Source-agnostic ledger model (`MetricSample`, `DailyLedgerEntry`, etc).
- SwiftData persistence behind `LedgerStore`; app startup uses `SwiftDataLedgerStore` and falls back to `InMemoryLedgerStore` if container creation fails.
- Manual weight entry is reachable from Body Ledger and writes today's row with `.manual` source and high confidence.
- Manual meal entry is reachable from Copilot and writes user-entered calories/protein into today's ledger with `.manual` source.
- Sources can open Oura token management from the Oura source card and refresh source coverage after dismissal.
- Agentic-coding documentation: `CLAUDE.md`, `AGENTS.md`, `HANDOFF.md`, `memory-bank/`, `docs/PRD.md`.
- Oura integration exists in iOS as optional/fallback code. The web provider also has Ring 5 collection functions for resilience, cardiovascular age, SpO2, and stress.
- Withings smart-scale webhook parsing exists in the web/API layer. It fetches body/weight notifications through the Measure API and writes normalized weight/body-composition events.
- Apple Watch / Apple Health is the active wearable path. HealthKit reads sleep duration, HRV, resting HR, steps, active calories, and body mass; `HealthKitIngestor` merges them into `DailyLedgerEntry`.
- Design-handoff bundle copied into `design-handoff/`.
- Design system Days 1–5 shipped. Day 6 Copilot shell and Day 7 Weekly UI are partially shipped.
- Root tab bar now has Today / Past / Settings. The old Weight screen and Body Ledger still exist in `Features/Weight/` and `Features/BodyLedger/`, but they are supporting flows rather than primary navigation.
- Root tab selection supports `--initial-tab body|meals|weekly|sources` for simulator verification. Normal launch still defaults to Today.
- `HealthKitService` now requests authorization and reads sleep duration, HRV, resting HR, steps, active energy, and body mass.
- `HealthKitIngestor` merges HealthKit recovery/movement/weight into the ledger when `source.healthKit` is enabled.
- `HealthKitIngestor` now depends on the domain-level `HealthKitReading` protocol, with unit tests covering Apple Health ledger merge behavior and the no-data path.
- HealthKit sleep reads now use an overnight window around the morning date so 11pm-7am sleep is not dropped by strict midnight boundaries.
- `LedgerCoverage` is the single daily coverage scorer for HealthKit, Oura, meal, and weight writes.
- `Secrets.plist` is bundled again as of 2026-06-11 (still gitignored) so the Oura PAT resolves automatically in local builds; Keychain via `OuraConnectionView` remains the managed path.
- Sources now runs a recent HealthKit ingest immediately after Apple Health permission succeeds.
- Sources now includes an Apple Watch pilot checklist that separates missing/requested/granted Health permissions, live-vs-waiting data freshness, Apple Watch live data, simulator/sample data, and dormant Oura fallback.
- HealthKit authorization now requests the full Apple Watch trial read set: sleep, HRV, resting HR, respiratory rate, body/wrist temperature, steps, active energy, workouts, and weight.
- Copilot composer can directly log text meals with calories/protein, and falls back to a prefilled manual sheet when calories are missing.
- HealthKit weight reads do not overwrite a same-day manual weight row.
- All four custom fonts downloaded and bundled.
- `BodyOS.xcodeproj` generated via xcodegen from `project.yml`. HealthKit entitlement, all Info.plist usage strings, `UIAppFonts` array, automatic signing.
- Whole codebase typechecks cleanly via `swiftc -typecheck`.
- Full Xcode build succeeds for iPhone 17 Pro simulator.
- `BodyOSTests` runs cleanly on simulator; latest suite has 45 tests, including Oura-first routing, Settings source status, ledger, and meal tests.

## What's *not* done

1. **Meal estimation.** `MealLogService.estimateMacros` needs a Claude API call (vision-capable, since meals are photos + text).
2. **Real Copilot chat actions.** Copilot can log manual meals, but message sending, photo attachment, and known-food save are not wired.
3. **Weight calibration depth.** Manual logging works, but Weekly calibration needs at least two real weigh-ins and clearer chart behavior.
4. **Today / Body interactions.** `Plan it`, `Why this?`, open-loop CTAs, and Today metric taps are visual-only for now. Wire them when Copilot / Ledger / Meal flows exist.

## Tested today

- `npm run typecheck`. Clean.
- `npm test`. **62 tests passed, 0 failures**, including Withings webhook route coverage.
- `npm run lint`. Clean.
- `npm run build`. Clean Next.js production build.
- Local API smoke on `http://localhost:3001` with isolated `/tmp` ledger: empty daily summary returned setup mode; OpenClaw weight and meal writes returned `202`; follow-up daily summary returned `dataState: "live"`, `82.4 kg`, and `1 meal logs today`.
- Withings webhook smoke: unsupported non-scale `appli=4` returned `200` with `eventsWritten: 0`.
- `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer IOS_DESTINATION='platform=iOS Simulator,name=iPhone 17 Pro' scripts/ci-ios.sh`. **46 tests passed, 0 failures**. Latest result bundle: `build/Logs/Test/Test-BodyOS-2026.06.10_16-47-52--1000.xcresult`.
- Simulator install and launch succeeded on iPhone 17 Pro. Latest Sources screenshot: `/tmp/bodyos-sources-hardware-tonight-2.png`.
- Simpler UX pass validation: same iOS CI command passed with **45 tests, 0 failures**. Latest result bundle: `build/Logs/Test/Test-BodyOS-2026.06.10_17-01-46--1000.xcresult`. Latest screenshots: `/tmp/bodyos-simple-today.png` and `/tmp/bodyos-simple-settings.png`.
- Daily weight preview + setup checklist validation: same iOS CI command passed with **45 tests, 0 failures**. Latest result bundle: `build/Logs/Test/Test-BodyOS-2026.06.10_17-09-07--1000.xcresult`. Latest screenshots: `/tmp/bodyos-weight-preview.png` and `/tmp/bodyos-settings-onboarding.png`.
- Tide branding validation:
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ios/BodyOS/BodyOS.xcodeproj -scheme BodyOS -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath ios/BodyOS/build CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`. **45 tests passed, 0 failures**. Latest result bundle: `ios/BodyOS/build/Logs/Test/Test-BodyOS-2026.06.10_17-21-25--1000.xcresult`.
  - `npm test`. **62 tests passed, 0 failures**.
  - `npm run typecheck`. Clean.
  - Simulator screenshots: `/tmp/tide-today-brand.png` and `/tmp/tide-settings-brand.png`.
  - Built app metadata confirms `CFBundleDisplayName = Tide`; executable remains `BodyOS`.
- Real iPhone device signing now uses bundle identifier `com.jamestran.bodyos` with James Tran's Personal Team (`DEVELOPMENT_TEAM=ZDFV9C3CA9`). `xcodebuild` device build succeeds and `devicectl` installs/launches the app on James's iPhone.
- James trusted the developer profile on-device, connected Apple Health from Sources, and confirmed real Apple Watch data appears in the app.
- Install → launch Body, Copilot, and Sources tabs → screenshots via `simctl`. Works.
- Oura is live again (2026-06-11): the new ring's PAT in `Secrets.plist` is bundled, and Today/Settings refreshes auto-ingest the last 7 Oura days.
- Latest screenshots:
  - Today: `/tmp/bodyos-wrap-final.png`
  - Copilot: `/tmp/bodyos-copilot-manual-meal.png`
  - Body: `/tmp/bodyos-body-persistence-weight.png`
  - Weekly: `/tmp/bodyos-weekly-0403.png`
  - Sources: `/tmp/bodyos-sources-oura-manage.png`

## Latest session notes — source attribution / weight calibration lane

- Local branch: `prep/hardware-tonight`.
- James reviewed the app and asked for a simpler dashboard. The app shell now prioritizes Today as the single health management surface, Past for trends, and Settings for sources.
- Oura now wins sleep/recovery routing. Apple Health is presented as a bridge for movement/workouts/health gaps rather than "Apple Watch" as a first-class source.
- Locally merged `origin/feat/oura-ring5-smart-scale` / PR #25, then tightened the Withings webhook before relying on it.
- Withings webhook now only treats `appli=1` as weight/body-composition, fetches measurements with a form POST to the Measure API, and keeps unsupported categories as acked no-ops.
- Withings measure type `77` is normalized as `waterMassKg`, not a percentage.
- Browser plugin Node execution tooling was unavailable in this session, so web UI verification used Next build, localhost HTML response, and API smoke rather than in-app browser automation.
- Past now has a daily weight card above calorie calibration. Empty-ledger preview rows are display-only and labeled `preview`; real ledger rows replace them automatically.
- Settings now includes a short setup checklist: connect Oura, weigh in, log first meal.
- Tide branding was integrated from `/Users/jamestran/Downloads/handoff 2`: `TideMark`, `TideLockup`, `AppBrand`, updated app icons, display name, permission strings, and repo design-handoff `tide-mark.svg`.
- `scripts/ci-ios.sh` still fails its generated-project dirty-diff guard when run before committing the intentional `project.yml` / `.xcodeproj` changes; the equivalent manual `xcodebuild test` command passes.

- HealthKit movement reads now return source-attributed `MetricSample<Int>` values, so `HealthKitIngestor` preserves iPhone vs Apple Watch step/active-energy provenance instead of overwriting everything as `.appleWatch`.
- HealthKit weight reads now classify sample metadata into `.smartScale`, `.oura`, `.iphone`, or `.manual` where possible. Manual same-day weight still wins over passive HealthKit weight; higher-confidence smart-scale weight can replace phone-sourced Health weight.
- `WeightTrendService` computes 7/14/28-day trend summaries, marks insufficient data, and compares estimated deficit against scale-implied deficit for calibration.
- Weekly Review now fetches a 28-day ledger window for calibration math while keeping week UI summaries scoped to the visible 7 days.
- Today open loops are capped to 3 and distinguish missing permission from readable-but-empty Apple Watch data.
- Added tests: `HealthKitSourceAttributionTests`, expanded `HealthKitIngestorTests`, and `WeightTrendServiceTests`.
- Local validation in this worktree: `swiftc -parse $(find BodyOS -name "*.swift")` passed. `xcodebuild`/`swiftc -typecheck` were blocked because `/Applications/Xcode.app/Contents/Developer` is missing here; `xcodegen` is also not installed, so the generated project was updated manually for new Swift files.

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
