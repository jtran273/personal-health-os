# AGENTS.md

Instructions for coding agents (Codex, Cursor, Aider, etc.) working in this repo. Claude Code reads `CLAUDE.md` — that file and this one say the same things; keep them in sync when you edit either.

## Project

**BodyOS** — single-user SwiftUI iOS app (iOS 17+, Swift 5.9+). One user: James. Product thesis: **least cognitive load health execution.** Every change should reduce the user's daily decisions, not add to them.

## Required reading before code changes

1. This file.
2. [`HANDOFF.md`](./HANDOFF.md) — current state and your next milestone.
3. [`docs/PRD.md`](./docs/PRD.md) — the product spec.
4. [`design-handoff/README.md`](./design-handoff/README.md) — the canonical design spec.
5. [`memory-bank/README.md`](./memory-bank/README.md) — index of durable project memory.
6. [`memory-bank/architecture.md`](./memory-bank/architecture.md)
7. [`memory-bank/design-system.md`](./memory-bank/design-system.md)
8. [`memory-bank/decisions.md`](./memory-bank/decisions.md)
9. [`memory-bank/active-context.md`](./memory-bank/active-context.md)

## Architecture

Source-agnostic ledger. `MetricSample<Value>` = value + source + confidence. `DailyLedgerEntry` = a day's row. `HealthDataRouter` picks best source per metric per PRD §6. Services (`OuraService`, `HealthKitService`, `MealLogService`, `WeightService`) fill the ledger. SwiftUI views read it via `AppDependencies` injected through environment.

Folder layout: see [`README.md`](./README.md) and `memory-bank/architecture.md`.

## Conventions

- Swift 5.9+, iOS 17+. `@Observable`, `NavigationStack`, Swift Charts, `async/await`.
- No external dependencies without approval.
- No emojis in code.
- `///` doc comments on public types.
- `final class` unless inheritance intended.
- Confidence + source must propagate to the UI. Never invent metric values.
- New code under `BodyOS/`. New docs under `docs/` or `memory-bank/`.

## Agent autonomy

- Do not stop for model-profile routing gates. Use the current session, make the best local engineering judgment, and keep moving unless the task itself requires user input.
- Write plans for broad or risky work, then execute without asking for confirmation on every step.

## After making changes

Update the relevant `memory-bank/` files:
- New feature requested → `memory-bank/features.md`.
- Architectural choice made → `memory-bank/decisions.md` (ADR-style).
- Pattern established → `memory-bank/conventions.md`.
- Current state changed → `memory-bank/active-context.md`.

## Verification

`BodyOSTests` exists. Add focused XCTest coverage for logic-heavy changes (`BodyModeEngine`, `DeficitEstimator`, `HealthDataRouter`, ingestors, stores). Verify view changes by running in the simulator or on device.

## Things to avoid

- Treating wearable calorie burn as exact.
- Adding notifications without strong justification.
- Vendor lock-in (no Oura-specific types leaking into models or views).
- Scope creep beyond PRD §4 MVP without discussion.
