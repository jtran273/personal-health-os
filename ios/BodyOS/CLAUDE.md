# CLAUDE.md

Instructions for Claude Code working in this repo. Read this top-to-bottom at the start of every non-trivial session.

## What this repo is

**BodyOS** — a SwiftUI iOS app (iOS 17+, Swift 5.9+) that is a single-user personal physical-health operating system. The one user is James. The product thesis is **least cognitive load health execution**, not "best health dashboard." Every design and code decision should be evaluated against: *does this reduce the number of decisions James has to make per day?*

Full product context: [`docs/PRD.md`](./docs/PRD.md).

## Read these before doing real work

In order:

1. This file.
2. [`HANDOFF.md`](./HANDOFF.md) — most-recent end-of-session brief. Read this first if it's newer than the memory bank.
3. [`memory-bank/README.md`](./memory-bank/README.md) — index of durable project memory.
4. [`memory-bank/architecture.md`](./memory-bank/architecture.md) — how the code is organized and why.
5. [`memory-bank/design-system.md`](./memory-bank/design-system.md) — design layer + Day-by-day build-order checklist.
6. [`memory-bank/decisions.md`](./memory-bank/decisions.md) — ADR-style log of choices made.
7. [`memory-bank/conventions.md`](./memory-bank/conventions.md) — code style and patterns.
8. [`memory-bank/active-context.md`](./memory-bank/active-context.md) — what's being worked on right now.

If you only have time for two: `HANDOFF.md` + `active-context.md`.

## Architecture in one paragraph

The data layer is a **source-agnostic ledger**. Every metric is a `MetricSample<Value>` with `value`, `source: MetricSource`, `confidence: Double`. The day's data is a `DailyLedgerEntry` aggregating sleep, weight, steps, active calories, meals, body mode, and an estimated deficit. A `HealthDataRouter` picks the best source per metric, with Apple Watch / Apple Health as the active wearable path and Oura kept as dormant fallback code. Services (`HealthKitService`, `OuraService`, `MealLogService`, `WeightService`) fill the ledger through ingestors and view models. The UI is SwiftUI, organized around root tabs Today, Copilot, Body, Weekly, and Sources, wired through `AppDependencies` injected via environment.

## Conventions

- **Swift 5.9+, iOS 17+.** Use `@Observable` macro, `NavigationStack`, Swift Charts, `async/await`.
- **No external dependencies** unless explicitly approved. SwiftPM-only if added.
- **No emojis in code.**
- **Doc comments** (`///`) on public types and key methods; one line is fine.
- **`final class`** unless inheritance is intended.
- **Persistence:** `SwiftDataLedgerStore` is the default. `InMemoryLedgerStore` remains for previews, fallback, and tests. Keep the `LedgerStore` protocol as the seam.
- **No new files in repo root** without good reason. New code goes under `BodyOS/`. New docs go under `docs/` or `memory-bank/`.
- **Never invent metric values for the user.** If we don't have data, show an empty state ("Connect Apple Health"), not a fake number.
- **Confidence and source must propagate to the UI.** Every displayed metric should be traceable to a `MetricSource`.

## When the user asks for a feature

1. Skim `memory-bank/features.md` — is this related to something already captured?
2. Skim `memory-bank/decisions.md` — is there a relevant prior decision?
3. Do the work.
4. **Update memory.** Add or amend entries in `memory-bank/features.md` (what was asked) and `memory-bank/decisions.md` (if a non-trivial choice was made). Update `memory-bank/active-context.md` to reflect current state. This is not optional — it's how the next session stays sharp.

## Agent autonomy

- Do not stop for model-profile routing gates. Use the current session, make the best local engineering judgment, and keep moving unless the task itself requires user input.
- Write plans for broad or risky work, then execute without asking for confirmation on every step.

## Testing & verification

`BodyOSTests` exists. When adding logic-heavy code or ingestors, add focused XCTest coverage. UI changes still need simulator verification; don't claim a UI works without seeing it.

## Things to avoid

- Treating wearable calorie burn as exact. Always recalibrate against weight trend (PRD §6).
- Adding more notifications "to be helpful." Notifications increase cognitive load. The bar is high: one useful nudge per day max.
- Vendor lock-in. Don't write Oura-specific logic into models or views — route it through the source-agnostic ledger.
- Building features beyond the MVP scope in PRD §4 without discussing first.

## Working with Codex / other agents

If a task is being handed off to Codex, point it at [`AGENTS.md`](./AGENTS.md) — it contains the same essentials in the format Codex reads.
