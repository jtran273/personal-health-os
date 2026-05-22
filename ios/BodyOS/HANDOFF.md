# Handoff to Codex

You are picking up the BodyOS project mid-build. Read this first, then `AGENTS.md`, then the memory bank.

## Where things stand (2026-05-21)

The app builds, runs, and tests cleanly on iPhone 17 Pro simulator. The Apple Watch pivot is verified on James's real iPhone: the app installs as `com.jamestran.bodyos`, launches after trusting the developer profile, requests Apple Health permission, and displays real Apple Watch data. Most recent screenshots are `/tmp/bodyos-wrap-final.png`, `/tmp/bodyos-copilot-manual-meal.png`, `/tmp/bodyos-body-persistence-weight.png`, `/tmp/bodyos-weekly-0403.png`, and `/tmp/bodyos-sources-oura-manage.png` (temporary files; assume gone on reboot). Root tabs now cover Today, Copilot, Body, Weekly, and Sources.

What's working right now:
- Source-agnostic ledger (`MetricSample<Value>` + `DailyLedgerEntry`).
- Real Oura v2 API client (`OuraService`, `OuraDTO`, `OuraIngestor`) remains in code but is disabled for now because James returned the ring.
- Token storage in iOS Keychain + gitignored `Secrets.plist` fallback (token is in `BodyOS/Resources/Secrets.plist`, which is **not** committed).
- Design tokens / theme / typography from the handoff (`design-handoff/`).
- Custom fonts bundled and registered (Instrument Serif, Geist, JetBrains Mono).
- Components shipped: `BodyModeOrb`, `SourceChip`, `Sparkline`, `MetricTile`, `LedgerRow`.
- `SwiftDataLedgerStore` is now the default app store behind the existing `LedgerStore` protocol. Domain models remain plain `Codable`; SwiftData stores one encoded ledger payload per day.
- Today presentation now ingests Apple Health when enabled and derives open loops / metrics / timeline from `DailyLedgerEntry`.
- Body Ledger is now the root **Body** tab. It uses a 7-day picker, coverage ring, grouped `LedgerRow`s, and source/confidence stories derived from `DailyLedgerEntry`. It also has a reachable manual weight entry sheet that writes today's weight into the ledger with source `.manual` and high confidence.
- Copilot tab is still mostly a static OpenClaw chat shell, but it now has a live manual meal fallback. User-entered calories/protein write to today's ledger with `.manual` source and recompute estimated deficit when active calories are available.
- Weekly Review UI is built and ingests recent Apple Health source data on load. Real calibration still needs at least two weight rows and meal/deficit data.
- Sources tab is built. It shows coverage, routing, source cards, has an Apple Health connect action, and shows Oura as disabled for now.
- `HealthKitService` now requests authorization and reads sleep duration, HRV, resting HR, steps, active energy, and body mass. `HealthKitIngestor` writes those into the ledger when `source.healthKit` is enabled.
- `BodyOSTests` exists and covers body mode, deficit estimator, source routing, confidence bands, SwiftData ledger persistence, manual meal writes/text parsing, HealthKit ledger ingestion through a mock reader, HealthKit/manual weight precedence, Body Ledger coverage copy, manual weight coverage recomputation, and centralized ledger coverage scoring.
- Root tab launch supports `--initial-tab body|meals|weekly|sources` for simulator verification. Normal launch still starts on Today.
- `BodyOS.xcodeproj` generated via `xcodegen` from `project.yml`.

Recent cleanup:
- Sources Apple Watch connect now runs a 7-day HealthKit ingest immediately after permission succeeds.
- Copilot composer can directly log text like `chicken bowl 650 kcal 42g protein`; missing calories opens the manual sheet prefilled.
- HealthKit weight no longer overwrites a same-day manual weight entry.
- Body coverage copy names missing HRV/resting HR so it matches the coverage denominator.

What's empty / stubbed:
- `MealLogService.estimateMacros` — needs Claude API call.
- `BodyModeBadge` is still scaffold-quality, but Today no longer uses it. Day 3 uses a local `ModePill`.
- Copilot chat messages are static; meal photo flow and AI macro estimation are not wired.
- The old Weight screen still exists in `Features/Weight/` but is no longer on the root tab. Its view model is ledger-backed and reused by Body Ledger's sheet.
- HealthKit compiles, device build succeeds, and real Apple Watch data has been verified on James's iPhone.

## Required reading, in order

1. This file.
2. [`AGENTS.md`](./AGENTS.md) — conventions and rules for agents in this repo.
3. [`memory-bank/active-context.md`](./memory-bank/active-context.md) — current state, open questions.
4. [`memory-bank/architecture.md`](./memory-bank/architecture.md) — source-agnostic ledger explained.
5. [`memory-bank/decisions.md`](./memory-bank/decisions.md) — every non-trivial choice with rationale.
6. [`memory-bank/design-system.md`](./memory-bank/design-system.md) — design layer organization + build-order checklist.
7. [`design-handoff/README.md`](./design-handoff/README.md) — the canonical design spec (product thesis, screens, tokens, voice).
8. [`design-handoff/prototype/screen-chat.jsx`](./design-handoff/prototype/screen-chat.jsx) and [`screen-week.jsx`](./design-handoff/prototype/screen-week.jsx) — useful references if you continue live Copilot / calibration behavior.

## Your next milestone — Live meal flow

The visual build order is now mostly represented in native SwiftUI, and the ledger persists. The next highest-leverage implementation work is one of:

1. **Live Copilot meal photo flow**, because Copilot is still a static shell and meals/protein/deficit are the biggest missing signals.
2. **Manual meal entry fallback**, so calories/protein/deficit can be tested before the photo estimator is live.
3. **Weight trend refinement**, because Weekly calibration needs at least two real weight rows and clearer chart behavior.

Important implementation notes:
- Keep it ledger-derived. Do not create fake values for missing meals, protein, or weight.
- Do not let vendor types leak into `Models/` or `Features/`; keep them in services / ingestors.
- Apple Watch is now the primary wearable path. Smart scale is still a product question.
- If you add new Swift files, run `xcodegen generate` before the full Xcode build.
- Voice: "Say less, mean more." Plain numbers, no emojis, no exclamations. See `design-handoff/README.md` § Voice & tone.

## How to work

### Build / run

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project BodyOS.xcodeproj \
  -scheme BodyOS \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -configuration Debug \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO \
  build

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl boot "iPhone 17 Pro" 2>/dev/null
open -a Simulator
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl install booted \
  build/Build/Products/Debug-iphonesimulator/BodyOS.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl launch booted com.jamestran.bodyos
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl io booted screenshot /tmp/bodyos.png
```

Launch directly into a tab for verification:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl launch booted \
  com.jamestran.bodyos --initial-tab body
```

Valid tab values: `body`, `meals` (Copilot), `weekly`, `sources`.

### Typecheck without building (fast smoke test)

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun -sdk iphonesimulator swiftc \
  -typecheck -target arm64-apple-ios17.0-simulator \
  $(find BodyOS -name "*.swift")
```

Catches type errors in ~3 seconds. Use this before kicking off a full Xcode build.

### Full test suite

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test \
  -project BodyOS.xcodeproj \
  -scheme BodyOS \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO
```

Latest run: `2026-05-21 17:39`, **26 tests passed**, result bundle at `build/Logs/Test/Test-BodyOS-2026.05.21_17-39-10--0700.xcresult`.

### Regenerate the Xcode project (after adding new files)

```bash
xcodegen generate
```

The `project.yml` describes the target. `xcodegen` picks up new `.swift` files automatically from `BodyOS/`.

### Permissions / hooks

There are no hooks. You can `xcodebuild` and run `simctl` freely.

## Things to avoid

- Don't commit `BodyOS/Resources/Secrets.plist` — it has the user's Oura PAT. It's in `.gitignore` already; verify before any `git add`.
- Don't `public` modify types unless they need it. Single-target app, internal is enough.
- Don't add notifications, streaks, or cheerful copy. Voice rules in the handoff are non-negotiable.
- Don't treat wearable calorie estimates as exact. Recalibrate against weight trend per PRD §6.
- Don't introduce vendor types into `Models/` or `Features/`. Oura DTOs stay in `Services/Oura/`.
- Don't add external dependencies without an ADR entry in `memory-bank/decisions.md`.
- This directory currently is not a Git repository (`git status` returns "not a git repository"). Do not assume git can tell you the changed-file list until `.git` exists again.

## Memory bank discipline

Every non-trivial session ends with updates to:

- `memory-bank/active-context.md` — current state.
- `memory-bank/features.md` — what was shipped.
- `memory-bank/decisions.md` — append-only ADR log for any non-trivial choice.

This is how the next agent (or you, next time) stays sharp.

## Things you don't need to ask the user

- Smart scale is still post-MVP. Apple Watch is now the active wearable.
- Onboarding is out of MVP scope.
- Web app is out of scope until iOS is solid.
- Design system is settled — copy from `design-handoff/` everywhere.

## Things you should ask the user

- Anything that changes product behavior beyond what the handoff specifies.
- Smart scale model choice if you start weight automation.

Good luck.
