# Features

Everything James has asked for, with status and pointers to the code. New asks go at the **top** of "Requested". As features ship, move them to "Shipped" with a date.

Status legend: `requested` · `in-progress` · `shipped` · `deferred`

---

## Requested

(none yet — first ask is to scaffold the repo, captured below as shipped scaffolding)

## In progress

(none)

## Shipped — additions

### Health source attribution + weight trend calibration foundation (2026-05-21)
**Ask:** Improve the iOS health-data foundation for Apple Watch now and smart scale later.

**Delivered:**
- HealthKit movement ingestion now preserves source/confidence from the reader boundary instead of relabeling all steps and active energy as Apple Watch.
- HealthKit weight reads classify sample metadata as Apple Watch/iPhone/Oura bridge/smart scale/manual where possible, with smart-scale weight allowed to replace lower-confidence phone weight while manual weight remains protected.
- Added `WeightTrendService` for 7/14/28-day weight trend summaries, insufficient-data flags, and deficit-vs-scale calibration deltas.
- Weekly Review now loads a 28-day window for calibration while keeping the visible weekly charts/plans focused on the current 7 days.
- Today open loops now cap prompts and distinguish "Apple Health not connected" from "Apple Watch data not readable" instead of showing noisy HRV prompts before any wearable data exists.
- Added unit coverage for source classification, HealthKit source-preserving ingestion, smart-scale precedence, trend windows, insufficient trend data, and calibration edge cases.

### Real-device HealthKit verification + Today open-loop actions (2026-05-21)
**Ask:** Test the connected Apple Health path, then keep building high-priority features/tests/docs.

**Delivered:**
- Verified BodyOS launches on James's iPhone and displays real Apple Watch / Apple Health data.
- Fixed XcodeGen signing config to use James's Personal Team ID (`ZDFV9C3CA9`) with bundle id `com.jamestran.bodyos`.
- HealthKit ingestion now recomputes `estimatedDeficit` when active calories arrive after meals.
- Sources distinguishes verified data from "permission set, no samples yet" so coverage is not overstated.
- Today open-loop CTAs now open the existing manual weight and meal sheets, and HRV/health refresh reloads the HealthKit ingest path.
- Added `SourcesViewModelTests` for HealthKit connect success, failure, and no-samples states.

### HealthKit connect sync + text meal logging polish (2026-05-21)
**Ask:** Run multiple agents and implement high-priority app fixes/features/tests.

**Delivered:**
- Sources Apple Watch connect now requests permission and immediately attempts a 7-day HealthKit ingest instead of waiting for another tab load.
- Copilot composer can parse and log text like `chicken bowl 650 kcal 42g protein` directly to today's ledger.
- Composer fallback opens the manual meal sheet prefilled with the typed description when calories are missing.
- HealthKit-sourced weight no longer overwrites a same-day manual weight entry.
- Body Ledger coverage copy now includes missing HRV and resting HR when coverage scoring is partial.
- Added tests for text meal parsing/logging, HealthKit/manual weight precedence, Body coverage copy, and manual weight coverage recomputation.

### HealthKit ingestion test seam + documentation cleanup (2026-05-21)
**Ask:** Clean things up, improve docs, make tests, fix bugs/refactor, and prepare GitHub work.

**Delivered:**
- Added a `HealthKitReading` protocol so `HealthKitIngestor` can be tested without a real iPhone Health database.
- Added `HealthKitIngestorTests` for Apple Health ledger merging and the no-data path.
- Centralized daily coverage scoring in `LedgerCoverage` and covered the Apple Watch MVP signal denominator.
- Expanded HealthKit sleep reads to cover the overnight window around the morning date instead of only midnight-to-midnight samples.
- Updated README setup/run instructions to match the generated Xcode project and Apple Watch verification flow.
- Fixed the HealthKit update usage copy so it no longer claims BodyOS writes manual weight back to Apple Health.
- Excluded local `Secrets.plist` from XcodeGen resources so a private token is not bundled into the generated project.
- Refreshed stale Oura, agent, architecture, and font setup docs after the Apple Watch pivot.

### Apple Watch / Apple Health becomes the active wearable path (2026-05-21)
**Ask:** James returned the Oura ring and bought an Apple Watch connected to his Apple account; build around Apple Watch now and disable Oura for now.

**Delivered:**
- HealthKit now reads sleep duration, HRV, resting heart rate, steps, active energy, and body mass into the ledger.
- `HealthKitIngestor` writes recovery metrics as `.appleWatch` samples and recomputes body mode/coverage from the same `DailyLedgerEntry` path.
- Today, Body Ledger, and Weekly no longer auto-ingest Oura when a token exists; they only ingest Apple Health when `source.healthKit` is enabled.
- Source routing now prefers Apple Watch for sleep, HRV, resting HR, steps, and active calories.
- Sources and Settings present Oura as disabled for now while keeping the Oura service/token code available for a later fallback.

### Manual meal fallback from Copilot (2026-05-19)
**Ask:** Keep building what the app needs without waiting for another prompt.

**Delivered:**
- Added a ledger-backed `MealsViewModel` that loads today's meals from `LedgerStore`.
- Added manual meal logging through Copilot with description, calories, and optional protein.
- `MealLogService` can build manual meals with source `.manual` and confidence on calories/protein.
- Copilot now shows a live "Food today" summary from today's ledger and a logged-meals section when meals exist.
- Manual meal writes recompute `estimatedDeficit` when active calories are already present.
- Added `MealsViewModelTests`; full suite now passes with 12 tests.

### Sources can manage Oura token (2026-05-19)
**Ask:** Keep cleaning up and making the app usable.

**Delivered:**
- Wired the Oura source card in Sources to present `OuraConnectionView`.
- Sources refreshes coverage/source grouping when the Oura sheet dismisses.
- Preserved Apple Health connection behavior on its source card.

### SwiftData ledger persistence + XCTest baseline (2026-05-19)
**Ask:** Keep running overnight, update repo/docs/tests, and build the app out.

**Delivered:**
- Added `SwiftDataLedgerStore` behind the existing `LedgerStore` protocol.
- Kept domain models plain `Codable`; SwiftData stores one encoded `DailyLedgerEntry` payload per normalized day.
- Switched `AppDependencies` to use the persistent store by default with an in-memory fallback if container creation fails.
- Relaxed Today, Body Ledger, and Weekly view models to depend on `any LedgerStore` instead of `InMemoryLedgerStore`.
- Added `BodyOSTests` coverage for SwiftData upsert/read, replacement by day, and recent-window sorting.
- Verified `swiftc -typecheck` and `xcodebuild test` on iPhone 17 Pro simulator: 11 tests, 0 failures.

### Manual weight entry from Body Ledger (2026-05-19)
**Ask:** Keep building what the app needs without waiting for another prompt.

**Delivered:**
- Reworked the weight flow so manual entries write to today's `DailyLedgerEntry` instead of local view-only state.
- Added pounds input and conversion in `WeightService`; stored values remain kg in the model.
- Added `WeightEntry.confidence` and a confidence-band projection so manual weight can show source trust like other metrics.
- Made Body Ledger's first viewport expose a `Log weight` action that presents the manual sheet and refreshes the selected ledger day after save.
- Weekly Review can now use persisted manual weigh-ins once at least two rows exist.

### Day 5 HealthKit and Sources trust surface (2026-05-19)
**Ask:** Continue running overnight and build the app out past Day 4.

**Delivered:**
- Implemented `HealthKitService.requestAuthorization()`, daily step reads, daily active-energy reads, and body-mass reads.
- Added `HealthKitIngestor`, parallel to `OuraIngestor`, to merge HealthKit movement/weight into `DailyLedgerEntry` without leaking HealthKit types into models or views.
- Wired HealthKit service + ingestor through `AppDependencies`.
- Today, Body Ledger, and Weekly can ingest HealthKit data when `source.healthKit` is enabled.
- Added a native Sources / Body OS tab with coverage hero, metric routing table, grouped source cards, known-food placeholders, and Apple Health connect action.
- Root tab now matches the handoff shape: Today / Copilot / Body / Weekly / Sources.
- Regenerated `BodyOS.xcodeproj` and verified full build.

### Copilot chat static UI (2026-05-19)
**Ask:** Continue through the handoff screens after Today and Body Ledger.

**Delivered:**
- Rebuilt the old Meals tab as a static OpenClaw / Copilot chat surface.
- UI includes OpenClaw header, time dividers, user/system bubbles, structured morning briefing, meal estimate and weight-trend cards, suggested replies, and input bar.
- No networking or meal estimation is wired yet; this is a high-fidelity shell for the Day 6 meal-photo flow.

### Weekly Review UI (2026-05-19)
**Ask:** Continue through the handoff screens after Today and Body Ledger.

**Delivered:**
- Replaced the scaffold Weekly list with the handoff-style weekly review screen.
- Added calibration chart shell, held/slipped cards, sleep/protein trend rows, and next-week plan rows.
- Weekly now ingests the recent Oura/HealthKit window on load so direct launch does not show an empty store.
- Missing weight/deficit/protein stays explicit instead of mocked.

### Day 4 Body Ledger screen (2026-05-19)
**Ask:** Continue from the handoff build order after Day 3.

**Delivered:**
- Added `BodyOS/Features/BodyLedger/BodyLedgerView.swift` and `BodyLedgerViewModel.swift`.
- Replaced the old root Weight placeholder tab with a real **Body** tab.
- Body Ledger reads `DailyLedgerEntry` rows from the shared store and ingests 7 recent Oura days on load.
- Built the native ledger anatomy from `screen-ledger.jsx`: header, 7-day picker, coverage ring/banner, grouped ledger rows, and "How the ledger works" footer.
- Reused `LedgerRow` for source/confidence/story rows. Missing weight/meals/protein remain low-confidence empty rows rather than fake values.
- Added `--initial-tab body` launch argument support for simulator verification while keeping Today as the normal default.
- Regenerated `BodyOS.xcodeproj` with `xcodegen` so the new feature files are included.
- Verified on iPhone 17 Pro simulator. Latest Body Ledger screenshot: `/tmp/bodyos-day4-ledger.png`.

### Day 3 Today screen rebuild (2026-05-19)
**Ask:** "Read HANDOFF.md then start Day 3 of the build order — the Today screen rebuild per design-handoff/prototype/screen-today.jsx."

**Delivered:**
- Rebuilt `TodayView` against the handoff anatomy: status header, mode pill, Body Mode Orb hero, "The One Thing" card, open loops, metric grid, timeline, and synced/coverage footer.
- `TodayViewModel.load()` now ingests 7 recent Oura days at launch so sparklines can use real ledger history in the current app run.
- Today metric tiles now include real trend data for sleep, HRV, resting HR, steps, and active calories when present; meal/protein/weight tiles remain honest empty states until those sources exist.
- Open loops are generated from missing ledger signals instead of hard-coded sample data.
- Timeline rows are generated from real ledger events with source chips and confidence.
- Verified on iPhone 17 Pro simulator with real Oura data. Latest screenshot: `/tmp/bodyos-day3-today-v3.png`.

### App runs end-to-end with real Oura data (2026-05-19)
**Ask:** "ok im downloading that right now, do day 2s work?" → "i want to see it running first" → "use that same token its fine, use the token i gave u earlier and reload it".

**Delivered:**
- iOS 26.3 simulator runtime installed by James → `xcodebuild` build succeeds, app installs and launches on iPhone 17 Pro.
- `BodyOS/Resources/Secrets.plist` (gitignored) holds the user's Oura PAT for dev convenience. Resolution order is unchanged (Keychain → plist → env).
- `OuraIngestor.ingestRecent(days:)` pulls the last 3 days so morning gaps don't leave the Today screen empty.
- `TodayViewModel.load()` falls back to the most recent populated entry when today has no data yet.
- Two real-world Oura API quirks fixed in `OuraService`:
  - `sleep` session `day` field is the **bedtime** date — query a 2-day window and prefer the most recent `long_sleep`.
  - `daily_activity` for today isn't recorded until end-of-day — fall back to yesterday's row.
- Verified visually via simulator screenshot: body mode pill renders Green, recommendation card shows correct copy, all six metric tiles populated with Oura data + correct source chips.

### Design-system Day 2 + project generation (2026-05-19)
**Ask:** "i downlaoded xcodegen, can u not go on the web and doanload it youself?" + "ok im downloading that right now, do day 2s work?"

**Delivered:**
- All four Google Fonts downloaded directly (via `curl` from upstream font repos) into `BodyOS/DesignSystem/Fonts/`.
- `project.yml` (xcodegen spec) — iOS 17 target, HealthKit entitlement, all Info.plist usage strings, `UIAppFonts` array, automatic signing.
- `BodyOS.xcodeproj` generated.
- Whole codebase typechecks cleanly against iOS 17 (`swiftc -typecheck` smoke test).
- Fixed compile errors caught by the smoke test:
  - `OuraService.personalInfo()` had `public` access incompatible with internal DTO type — downgraded.
  - Stale `AppFont.headline` / `AppFont.largeTitle` references replaced with `.heading` / `.title`.
- **Day 2 components:**
  - `Sparkline.swift` — `Canvas`-based line chart. Confidence drives dash pattern; nulls break path; optional fill; smooth quadratic curves.
  - `MetricTile.swift` + `MetricTileData` — Today-grid tile per the handoff `atoms.jsx MetricTile`.
  - `LedgerRow.swift` + `LedgerRowData` — Body Ledger row per the handoff `screen-ledger.jsx LedgerRow`. SF Symbol icon well, editorial number with unit, sub-line, source chip + confidence label, optional bordered story block.
- Today screen migrated from `MetricCard` to `MetricTile`; old `MetricCard` removed.

### Design-system Day 1 (2026-05-19)
**Ask:** "Read handoff/README.md and Design System.html. Start with Day 1 — scaffold, register fonts, implement tokens.swift + Theme.swift, then ship the Body Mode Orb and Source Chip as standalone SwiftUI previews."

**Delivered:**
- `design-handoff/` — full Claude Designer handoff copied into the repo as durable reference (README + prototype/).
- `BodyOS/DesignSystem/Tokens.swift` — authoritative color/spacing/radii/motion/font-family tokens, mirrored from `tokens.css`.
- `BodyOS/DesignSystem/Theme.swift` — semantic aliases + `BodyMode` and `Confidence` extensions for tint, soft tint, orb colors, chip dot color.
- `BodyOS/DesignSystem/Typography.swift` — three-family scale (Instrument Serif / Geist / JetBrains Mono) + `metricNumber()` and `kickerStyle()` view helpers.
- `BodyOS/DesignSystem/Fonts/FontRegistration.swift` + `Fonts/README.md` — runtime registration helper, expected file list, setup steps, diagnostic dump.
- `BodyOS/Models/Confidence.swift` — `.high/.med/.low` band derived from `MetricSample.confidence`.
- `BodyOS/DesignSystem/Components/BodyModeOrb.swift` — breathing organic blob, 9s loop, morphs through 3 cubic-bezier keyframes from `atoms.jsx`, radial gradient, mode stroke, inner highlight ring, reduce-motion freeze. Standalone previews for all three modes.
- `BodyOS/DesignSystem/Components/SourceChip.swift` — paper-deep capsule, confidence dot, mono ALL-CAPS label, with `MetricSample` / `MetricSource` convenience inits. Standalone previews.
- Old `SourceBadge` removed; `MetricCard` updated.
- `Info.plist.template` — `UIAppFonts` array added.
- `BodyOSApp.init()` calls `FontRegistration.registerBundledFontsIfNeeded()`.

**To finish font setup:** James downloads four `.ttf` files (links in `Fonts/README.md`) and adds them to the Xcode target.

### Oura integration (2026-05-19)
**Ask:** "Here is my Oura PAT and reference Python client — implement best use for this."

**Delivered:**
- Real `OuraService` against API v2 (`personal_info`, `daily_sleep`, `daily_readiness`, `daily_activity`, `sleep`).
- `OuraDTOs.swift` — Codable shapes; vendor types isolated from the rest of the app.
- `OuraTokenStore.swift` — Keychain + gitignored `Secrets.plist` + env-var fallback.
- `OuraIngestor.swift` — pulls today's data, maps to `MetricSample`s tagged `.oura`, runs body-mode engine, writes `DailyLedgerEntry` to the ledger.
- `OuraConnectionView.swift` — paste / test / clear token in Settings.
- `AppDependencies` wires it all up; `TodayViewModel.load()` triggers an ingest if a token is present.
- `docs/setup-oura.md` — token setup walkthrough.

**Security:** token is never committed. Token resolution order: Keychain → Secrets.plist → env var. See `decisions.md` #006.

## Shipped

### Initial scaffold — SwiftUI app + memory bank (2026-05-19)
**Ask:** "Build the basis I need for this. Update the repo for this Swift-focused app and also build the base repo / skeleton needed. Use multiple sub agents if helpful. Also create good documentation and a repo for this app for agentic coding, like a memory bank of what I ask and the features."

**Delivered:**
- `BodyOS/Models/` — `MetricSource`, `MetricSample`, `BodyMode`, `SleepRecovery`, `WeightEntry`, `Meal`, `KnownFood`, `DailyLedgerEntry`.
- `BodyOS/Services/` — `LedgerStore` protocol + `InMemoryLedgerStore` actor, `HealthDataRouter`, `OuraService` stub, `HealthKitService` stub, `MealLogService` stub, `WeightService`, `BodyModeEngine`, `DeficitEstimator`.
- `BodyOS/DesignSystem/` — `Theme`, `Typography`, `MetricCard`, `BodyModeBadge`, `PrimaryButton`, `SourceBadge` (placeholder tokens — real design system coming).
- `BodyOS/Features/` — Today, Meals, Weight, WeeklyReview, Settings (views + view models).
- `BodyOS/App/` — `BodyOSApp`, `RootTabView`, `AppDependencies`.
- `BodyOS/Resources/Info.plist.template` — HealthKit + camera usage strings.
- `README.md`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`.
- `memory-bank/` — this directory.
- `docs/PRD.md` — the product spec.

**Notes:** No Xcode project committed — README has setup steps. Every service method is a TODO stub; the architecture is real, the data is fake.

## Deferred

Items from PRD that are explicitly out of MVP scope (see PRD §4):
- Full native mobile app polish.
- Perfect macro tracking.
- Clinical medical guidance.
- Automatic grocery purchasing.
- Multi-user support.
- Complex workout programming.
- Treating wearable calories as exact.
