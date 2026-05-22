# Decisions

Append-only log of non-trivial choices. ADR-style but lightweight. New decisions go at the **top**.

Format:
```
## NNN — Title (YYYY-MM-DD)
**Context:** what was happening.
**Decision:** what we chose.
**Why:** the reasoning.
**Consequences:** what this commits us to / rules out.
```

---

## 018 — HealthKit movement and scale reads preserve source class before ingestion (2026-05-21)
**Context:** Apple Health can contain Apple Watch, iPhone, Oura-bridged, manual, and future smart-scale samples. The earlier HealthKit reader returned bare movement integers and labeled HealthKit weight as iPhone.
**Decision:** Return source-attributed `MetricSample<Int>` values for HealthKit steps and active energy, classify HealthKit sample metadata into `MetricSource` where possible, and add a pure `WeightTrendService` for 7/14/28-day trend and calorie-calibration math.
**Why:** Source provenance must survive the service boundary so Today, Body, and Weekly can explain whether a value came from Watch, phone, Oura bridge, manual entry, or scale. Weight trend/calibration should be testable without HealthKit or UI.
**Consequences:** HealthKit source classification is best-effort and still needs physical iPhone validation against real Apple Health source names. Smart-scale readiness exists at the model/service/test layer, but no vendor-specific scale API is connected yet.

## 017 — Real-device HealthKit verification uses James's bundle id (2026-05-21)
**Context:** Simulator tests could verify ledger logic, but Apple Watch data requires James's physical iPhone and Apple Health permission.
**Decision:** Use `com.jamestran.bodyos` as the app bundle identifier for Xcode signing under James Tran's Personal Team. Verify the app on device by installing with `devicectl`, trusting the local developer profile on iPhone, connecting Apple Health from Sources, and confirming real Apple Watch data appears.
**Why:** `com.bodyos.app` could not be registered by the Personal Team, and real HealthKit reads cannot be proven in the simulator.
**Consequences:** Docs, launch commands, and generated project config should use `com.jamestran.bodyos`. HealthKit is no longer a speculative integration; remaining HealthKit work should focus on source attribution and recovery-window refinement.

## 016 — HealthKit ingestion is tested through a domain reader protocol (2026-05-21)
**Context:** Apple Watch is now the active wearable path, but real HealthKit data is only available on James's physical iPhone.
**Decision:** Keep `HealthKitService` as the concrete HealthKit bridge, but make `HealthKitIngestor` depend on a `HealthKitReading` protocol that returns domain models. Centralize daily coverage scoring in `LedgerCoverage`.
**Why:** This lets unit tests verify ledger merging, body-mode recomputation, source attribution, and coverage without requiring a device Health database or importing HealthKit into tests. A single coverage scorer keeps HealthKit, Oura, meal, and weight writes from drifting.
**Consequences:** New Apple Health reads should be added to the protocol and covered with mock-reader ingestor tests. New expected daily signals should update `LedgerCoverage` and its tests. Vendor types still stay inside `Services/`.

## 015 — Apple Watch replaces Oura as the active wearable path (2026-05-21)
**Context:** James returned the Oura ring and bought an Apple Watch connected to his Apple account.
**Decision:** Disable Oura auto-ingestion for now and make Apple Watch / Apple Health the primary wearable route. HealthKit now fills sleep duration, HRV, resting HR, steps, active calories, and Health-sourced weight into the source-agnostic ledger. Oura service/token code stays in place as dormant fallback code.
**Why:** The app should match the hardware James actually wears. HealthKit is the native bridge for Apple Watch and avoids the Oura subscription/API dependency.
**Consequences:** Readiness score and skin temperature are absent unless another source provides them. Body mode falls back to sleep duration when no readiness score exists. Apple Watch calorie burn remains low-confidence and must still be calibrated against weight trend.

## 014 — Manual meals are explicit ledger facts, not AI estimates (2026-05-19)
**Context:** Copilot was a static shell, and meal/protein/deficit were the biggest missing signals after persistence and weight logging.
**Decision:** Add a manual meal fallback before photo estimation. The user enters description, calories, and optional protein; BodyOS stores those as `.manual` metric samples on today's `DailyLedgerEntry`.
**Why:** This unlocks Today, Body Ledger, and Weekly food surfaces without pretending to have AI vision estimates. It gives the app testable food data while preserving source/confidence honesty.
**Consequences:** Manual entry is more work for James than photo logging, but it is dependable. `MealLogService.estimateMacros` remains the future path for Claude vision/text estimation, and known-food matching still needs implementation.

## 013 — Manual weight writes through the ledger, not local UI state (2026-05-19)
**Context:** Weekly calibration needs real weight rows, and the old Weight screen was no longer reachable after the Body Ledger became the root Body tab.
**Decision:** Reuse the Weight feature as a ledger-backed manual-entry flow. Body Ledger presents the manual sheet; `WeightService` converts pounds to kg; the view model upserts today's `DailyLedgerEntry` with source `.manual` and high confidence.
**Why:** Weight is a body signal, not a separate app silo. Keeping it in the ledger makes Today, Body, and Weekly agree immediately and gives calibration a real input.
**Consequences:** Manual weight is reachable again. Weight is still local-only unless HealthKit write support is added later. Historical backfill is not implemented; the sheet logs today's row.

## 012 — SwiftData persists encoded ledger rows behind `LedgerStore` (2026-05-19)
**Context:** The app had real source ingestion and multiple tabs reading the ledger, but `InMemoryLedgerStore` lost all rows on app relaunch.
**Decision:** Add `SwiftDataLedgerStore` as the default `LedgerStore` implementation. SwiftData owns a small `PersistedLedgerEntry` model keyed by normalized day; the payload is encoded `DailyLedgerEntry` data. Domain models stay plain `Codable` structs.
**Why:** This is the smallest persistence slice that preserves the source-agnostic architecture and avoids forcing generic `MetricSample<Value>` into SwiftData models. It keeps the `LedgerStore` seam intact for future migrations.
**Consequences:** Renaming Codable enum cases becomes a migration concern. Meal photos inside `Meal.photoData` could make day payloads large, so long-term photo/blob storage should move out of the ledger payload. Store methods remain non-throwing and fail closed for now.

## 011 — HealthKit has its own ingestor behind the ledger (2026-05-19)
**Context:** Day 5 needed Apple Health reads without breaking the source-agnostic ledger boundary.
**Decision:** Add `HealthKitIngestor` parallel to `OuraIngestor`. `HealthKitService` owns HealthKit APIs and returns domain values; the ingestor writes `MetricSample` / `WeightEntry` into `DailyLedgerEntry`.
**Why:** Keeps HealthKit types out of `Models/` and `Features/`, preserves the same merge/coverage pattern as Oura, and gives each tab a consistent way to pull recent source data.
**Consequences:** HealthKit source attribution is still coarse (`.iphone`) until we inspect HK source/device metadata. Apple Watch and smart-scale-specific routing remain a future refinement.

## 010 — Root tab becomes Body Ledger, not Weight (2026-05-19)
**Context:** Day 4 introduced the source-attributed Body Ledger. The existing root tab had a narrow Weight placeholder, but the product handoff frames the ledger as the trust surface for all body signals.
**Decision:** Replace the root Weight tab with a **Body** tab backed by `BodyLedgerView`. Keep the old `Features/Weight/` code for now, but remove it from primary navigation.
**Why:** Body Ledger is more central to the source-agnostic architecture than a manual weight-only screen. Weight remains a row/source inside the ledger until the logging flow is rebuilt.
**Consequences:** Manual weight logging is not reachable from the root tab yet. Weight should come back as an open-loop action or Body Ledger row action when interactions are wired.

## 009 — Today screen uses ledger-derived presentation data, not prototype mock rows (2026-05-19)
**Context:** Day 3 called for rebuilding Today from `screen-today.jsx`. The prototype ships sample rows for open loops, metrics, and timeline, but the app already has real Oura ingestion.
**Decision:** `TodayViewModel` now asks Oura for 7 recent days and derives the Today presentation from `DailyLedgerEntry` rows. Missing meal/weight data appears as open loops and empty metric tiles instead of mock food or scale values.
**Why:** The product promise is source attribution and no invented metrics. A prettier mock screen would violate the ledger contract.
**Consequences:** The first launch can briefly show a syncing empty state until Oura returns. Meal/protein/weight stay sparse until those sources are implemented. The Today screen remains honest and ready for Day 4 ledger drill-in.

## 008 — Oura ingestor pulls a window, not just today (2026-05-19)
**Context:** Verified live that `daily_sleep.day` is morning-of-score but `sleep.day` is bedtime-of-session, and `daily_activity.day` isn't recorded until end-of-day. The naive "fetch today's row" approach left the Today screen empty most mornings.
**Decision:** `OuraIngestor.ingestRecent(days:)` walks the last N days and upserts each. `OuraService.fetchSleep` queries a 2-day window and prefers the most recent `long_sleep` session. `OuraService.fetchActivity` falls back to yesterday if today is missing.
**Why:** Source-of-truth Oura behavior. Encoded the quirks once in the service so the rest of the app can pretend dates are clean.
**Consequences:** Today screen will sometimes show yesterday's data labeled as today's. Acceptable for MVP — Day 3 will add an explicit "as of" line. Trend ingestion (`ingestRange(days: 14)` for sparklines) is left as a Day 3 task.

## 007 — Design handoff drives the design system; tokens are authoritative (2026-05-19)
**Context:** James shipped a Claude-Designer handoff (`design-handoff/`) with high-fidelity React/HTML mocks, a tokens.css, and explicit SwiftUI guidance.
**Decision:** Port the handoff into `BodyOS/DesignSystem/` as `Tokens.swift` (raw color/space/radii/motion/font-name tokens) + `Theme.swift` (semantic aliases) + `Typography.swift` (font-family + size scale). Views read `Theme.*` and `AppFont.*`, not raw tokens. Three font families bundled: Instrument Serif (serif), Geist (sans), JetBrains Mono (mono). `Confidence` enum (`.high/.med/.low`) added as the presentation-layer projection of `MetricSample.confidence: Double`, mapping `≥0.75 → high`, `≥0.45 → med`, else low.
**Why:** The handoff is opinionated and complete — colors, type scale, motion timings, voice, components are all settled. Treating it as canon avoids style drift. The Token → Theme split keeps the seam open for dark-mode later.
**Consequences:** Every view should use `Theme.*` / `AppFont.*`. New colors require updating both `Tokens` and `Theme` (don't sprinkle hex). OKLCH colors from the handoff are stored as sRGB approximations — if we need higher color fidelity, swap in a ColorSync-based converter.

## 006 — Oura token lives in Keychain, never in the repo (2026-05-19)
**Context:** James pasted his PAT in chat; we needed somewhere to store it.
**Decision:** `OuraTokenStore` reads (in order) Keychain → bundled `Secrets.plist` (gitignored) → `OURA_PAT` env var. Preferred path: user pastes token in **Settings → Oura**, which writes to Keychain (`com.bodyos.oura`, `AccessibleAfterFirstUnlockThisDeviceOnly`).
**Why:** Tokens committed to git get scraped, even from private repos. Keychain is the iOS-native answer. The plist + env fallbacks exist for simulator dev convenience.
**Consequences:** First-run users have to paste their token once. The `Secrets.plist.example` template documents the dev path. See `docs/setup-oura.md`.

## 005 — Documentation system is a `memory-bank/` directory + `CLAUDE.md` + `AGENTS.md` (2026-05-19)
**Context:** James wants the repo optimized for agentic coding — Claude Code, Codex, future tools.
**Decision:** Three pieces. (1) `CLAUDE.md` at repo root for Claude Code. (2) `AGENTS.md` at repo root for Codex and friends. (3) A `memory-bank/` directory with topic-organized markdown files (`architecture.md`, `decisions.md`, `features.md`, `conventions.md`, `active-context.md`, `hardware-strategy.md`, `glossary.md`).
**Why:** Agent entry-files (CLAUDE.md, AGENTS.md) are read automatically. The memory bank is read on-demand — keeps the auto-context small while still having deep project knowledge available when needed. Files are topic-indexed so an agent fetches only what's relevant.
**Consequences:** Agents are expected to *update* the memory bank as part of any non-trivial change. The bank becomes stale if discipline lapses — James should periodically skim it.

## 004 — In-memory persistence first, real DB later (2026-05-19)
**Context:** Need to pick a persistence layer for the ledger.
**Decision:** Start with `actor InMemoryLedgerStore`. Defer the real choice (SwiftData vs GRDB) until we know which queries the app actually needs.
**Why:** The `LedgerStore` protocol is the seam. We can swap implementations without touching anything else. Premature persistence is a bigger risk than premature in-memory.
**Consequences:** Data is lost on app relaunch until we ship a real store. Acceptable for MVP scaffolding.

## 003 — `MetricSample<Value>` is generic, not type-erased (2026-05-19)
**Context:** Considered an `AnyMetricSample` to allow heterogeneous storage.
**Decision:** Use concrete `MetricSample<Int>`, `MetricSample<Double>` fields on `DailyLedgerEntry`. Don't add `AnyMetricSample` until a use case forces it.
**Why:** Generic with concrete fields keeps type safety end-to-end. We never actually need a heterogeneous collection in the current model.
**Consequences:** If we later want a generic "metric history" pipeline, we'll need to revisit. Easy to add `AnyMetricSample` then.

## 002 — Source-agnostic ledger is the core architectural commitment (2026-05-19)
**Context:** PRD §7.1 calls for source-agnostic storage. Could have leaned into Oura as the model (it's what we have today).
**Decision:** Every metric is a `MetricSample<Value>` with explicit `source` and `confidence`. UI reads `DailyLedgerEntry`, never vendor types.
**Why:** Avoid vendor lock-in (PRD §3 secondary goal). Apple Watch, smart scales, future wearables all need to plug in cleanly. Confidence and source must propagate to the UI so we can honestly show data coverage.
**Consequences:** More boilerplate per metric. Worth it. Don't ever leak a vendor type into `Models/` or `Features/`.

## 001 — Build as a SwiftUI iOS app, web companion later (2026-05-19)
**Context:** James wants to learn Swift and the user is iPhone-first.
**Decision:** Native SwiftUI iOS app, iOS 17+, Swift 5.9+, no external dependencies for now. Web app comes later as a separate surface that reads the same ledger (likely via an exported sync layer).
**Why:** HealthKit requires native iOS. Apple Watch integration matters (PRD §5.2). James wants to learn Swift.
**Consequences:** Backend / web piece is deferred. Ledger schema needs to be portable when we get there — keep models Codable.
