# Architecture

## One-paragraph summary

BodyOS is a SwiftUI iOS app with a **source-agnostic health ledger** at its core. Every metric is captured as a `MetricSample<Value>` carrying `value`, `source: MetricSource`, and `confidence: Double`. Days are aggregated into `DailyLedgerEntry` rows. Services pull raw data from heterogeneous sources (Oura, HealthKit, manual entry, meal photos) and write them through a `LedgerStore` protocol. A `HealthDataRouter` decides which source to trust for which metric, following the per-metric hierarchy in PRD §6. The UI never reads vendor data directly — it reads `DailyLedgerEntry`.

## Layers

```
┌──────────────────────────────────────────────────────────┐
│ Features/    SwiftUI views + view models, one per tab.   │
│              Today, Copilot, Body, WeeklyReview, Sources │
└─────────────────────────┬────────────────────────────────┘
                          │ reads
┌─────────────────────────▼────────────────────────────────┐
│ Services/    LedgerStore protocol, Body-mode engine,     │
│              Deficit estimator, HealthDataRouter,        │
│              OuraService, HealthKitService, MealLogSvc   │
└─────────────────────────┬────────────────────────────────┘
                          │ writes / reads
┌─────────────────────────▼────────────────────────────────┐
│ Models/      Plain Swift types. No I/O, no SwiftUI.      │
│              MetricSample, DailyLedgerEntry, Meal, etc.  │
└──────────────────────────────────────────────────────────┘

DesignSystem/  Reusable views, typography, theme tokens, fonts.
App/           @main, root tab view, AppDependencies.
```

## Key types

- **`MetricSample<Value>`** — generic envelope: `value`, `source: MetricSource`, `confidence: Double` (0–1), `capturedAt: Date`.
- **`MetricSource`** — enum: `.oura, .appleWatch, .iphone, .smartScale, .manual, .mealPhoto, .knownFood, .estimated`.
- **`DailyLedgerEntry`** — the per-day row. Fields: `date`, `sleep: SleepRecovery?`, `weight: WeightEntry?`, `steps`, `activeCalories`, `meals: [Meal]`, `bodyMode: BodyMode?`, `estimatedDeficit: Int?`, `coverageScore: Double`.
- **`BodyMode`** — `.green / .yellow / .red` — the day's high-level signal.
- **`LedgerStore`** — protocol. App default: `SwiftDataLedgerStore`, which stores one encoded `DailyLedgerEntry` payload per normalized day. `InMemoryLedgerStore` remains for previews/fallbacks/tests.

## Important seams

| Seam | Why it matters |
|---|---|
| `LedgerStore` protocol | Lets features read/write ledger rows without knowing whether storage is SwiftData or in-memory. |
| `HealthDataRouter` | Single place that knows the per-metric source hierarchy. Change it once, the whole app updates. |
| `HealthKitReading` | Domain-level Apple Health reader seam so ingestion tests do not require a real HealthKit database; movement and weight values preserve source/confidence before ledger merge. |
| `LedgerCoverage` | Single scorer for daily coverage so ingestors and manual-entry flows use one denominator. |
| `MetricSource` enum | Every value in the system is attributable. Easy to display "via Oura" badges, easy to debug data quality. |
| `AppDependencies` via environment | Views never new-up services themselves. Easy to mock in previews. |

## What this architecture buys us

- **Source independence.** When Oura's subscription model breaks or James buys an Apple Watch, only services change. Models, views, and the ledger don't.
- **Trend-based recalibration.** Because `MetricSample` carries confidence, we can downweight unreliable wearable calorie estimates and lean on weight trend as the calibration layer (PRD §6).
- **Coverage transparency.** `DailyLedgerEntry.coverageScore` lets the UI honestly say "60% data — connect more sources" instead of pretending it knows.

## What this architecture costs

- More boilerplate per metric than a "just store an Int" approach.
- Generic `MetricSample<Value>` complicates persistence; the current solution encodes the concrete `DailyLedgerEntry` as data inside a SwiftData record.

## Open architecture questions

- Exact Apple Health source names still need physical iPhone validation across Apple Watch, iPhone, Oura-bridged samples, and a future smart scale. The classifier is implemented as a best-effort service-layer mapping.
- How to model the Known Foods library as it grows — local-only, or sync via iCloud?

See [`decisions.md`](./decisions.md) for what's been settled.
