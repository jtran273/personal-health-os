# Conventions

Code style and patterns for BodyOS. If a pattern repeats three times, capture it here.

## Language & platform

- Swift 5.9+, iOS 17+. Use Swift 5.9 features (`@Observable`, macros) freely.
- SwiftUI only. No UIKit unless wrapping something HealthKit-adjacent that requires it.
- No external dependencies without an entry in `decisions.md`. SwiftPM only if added.

## Naming

- Types: `UpperCamelCase`. Vars/funcs: `lowerCamelCase`.
- Services end in `Service` (`OuraService`, `MealLogService`).
- Engines / pure logic types end in `Engine` or `Estimator` (`BodyModeEngine`, `DeficitEstimator`).
- View models end in `ViewModel`.
- Views end in `View`.

## Files

- One primary type per file. File name matches the type.
- New code under `BodyOS/`. New docs under `docs/` or `memory-bank/`.
- No new files at repo root without a reason.

## Style

- `final class` unless inheritance is intended.
- `///` doc comments on public types and key methods — one line is fine.
- Inline `//` comments only when the *why* is non-obvious. Don't narrate what the code does.
- No emojis in code.
- Use `async`/`await`, not callbacks. Use `actor` for shared mutable state.

## Architecture rules

- **Models/** types are pure data. No I/O, no SwiftUI imports, no service references.
- **Services/** never import SwiftUI.
- **Features/** never import vendor types (`HealthKit`, Oura DTOs). Read `DailyLedgerEntry` and friends.
- **Views read view models, not services directly.** Inject services into view models via init.
- **`AppDependencies` is the only place services are constructed at app scope.** Pass it through the environment.

## Metric handling rules

- Every displayed metric must be traceable to a `MetricSource`. Use `SourceBadge` to show it.
- Never invent values. Empty state ("Connect Apple Health") beats a fake number.
- `confidence` flows from the source through the UI. Low-confidence values can be rendered with reduced opacity or a hedge ("~250g protein").

## Testing

- `BodyOSTests` exists. When adding pure logic or an ingestor, add XCTest coverage against the model/store boundary.
- Keep Apple Health reads behind `HealthKitReading` so ingestion can be tested without a real device or HealthKit database.
- View changes verified by running the app. `#Preview` blocks are encouraged but not a substitute for the simulator.

## Memory bank discipline

- Read `active-context.md` at session start.
- Update `active-context.md` at session end.
- Append to `decisions.md` whenever a non-trivial choice is made.
- Add to `features.md` whenever James asks for something new.
