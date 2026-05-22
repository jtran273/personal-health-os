# BodyOS

A personal physical-health operating system. One user (James). One job: **reduce daily cognitive load while moving toward health goals.**

> The product is not "the most accurate wearable dashboard." It's "least cognitive load health execution." Accuracy matters only because it improves defaults and decisions.

This repo is a SwiftUI iOS app (iOS 17+, Swift 5.9+). A web companion may follow later.

## What it is

- **Today screen** — Green / Yellow / Red body mode + one recommended action.
- **Meal log** — text or photo, with a Known Foods library that learns over time.
- **Weight log** — manual now, smart scale later.
- **Weekly review** — weight trend, sleep avg, activity, and next-week focus.
- **Source-agnostic ledger** — every metric stores raw value + source + confidence. Different metrics route to different "best source" devices.

Read the full product thesis in [`docs/PRD.md`](./docs/PRD.md).

## Project layout

```
BodyOS/
├── App/                # @main entry, root tab, dependency container
├── Models/             # plain Swift types (ledger, samples, meals, weight)
├── Services/           # Oura, HealthKit, ledger store, body-mode engine
├── DesignSystem/       # theme tokens, typography, reusable components
├── Features/           # Today, Copilot, Body, WeeklyReview, Sources, Settings
└── Resources/          # Info.plist, entitlements, bundled fonts

docs/                   # PRD, architecture, decisions, hardware notes
memory-bank/            # Agentic-coding memory (see below)
CLAUDE.md               # Instructions for Claude Code
AGENTS.md               # Instructions for Codex and other agents
```

## Getting set up in Xcode

The repo currently includes a generated `BodyOS.xcodeproj`. The source of truth is still `project.yml`; after adding Swift files, regenerate the project:

```bash
xcodegen generate
```

Build and test:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test \
  -project BodyOS.xcodeproj \
  -scheme BodyOS \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO
```

CI parity:

```bash
scripts/ci-ios.sh
```

Run the command from the repository root. It installs XcodeGen with Homebrew if needed, regenerates `BodyOS.xcodeproj` from `project.yml`, fails if the generated project is out of sync or references `Secrets.plist`, then runs `xcodebuild test` on the first available iOS Simulator. Override simulator selection with `IOS_DESTINATION='platform=iOS Simulator,name=iPhone 17 Pro' scripts/ci-ios.sh`.

Run on the simulator:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl boot "iPhone 17 Pro" 2>/dev/null || true
open -a Simulator
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl install booted \
  build/Build/Products/Debug-iphonesimulator/BodyOS.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl terminate booted com.jamestran.bodyos 2>/dev/null || true
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl launch booted \
  com.jamestran.bodyos --initial-tab sources
```

HealthKit needs a real iPhone for James's Apple Watch data. On device, open **Sources → Apple Watch → Connect** and approve read access for sleep, HRV, resting heart rate, steps, active energy, and body mass.

Real-device verification is known-good on James's iPhone with bundle id `com.jamestran.bodyos` after trusting the local developer profile:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project BodyOS.xcodeproj \
  -scheme BodyOS \
  -destination 'id=00008150-000E0CAA0AB9401C' \
  -configuration Debug \
  -derivedDataPath build-device \
  -allowProvisioningUpdates \
  build
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun devicectl device install app \
  --device A822F5E7-D132-5422-B755-35DEF85D6AD7 \
  build-device/Build/Products/Debug-iphoneos/BodyOS.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun devicectl device process launch \
  --device A822F5E7-D132-5422-B755-35DEF85D6AD7 \
  com.jamestran.bodyos
```

## Agentic coding

This repo is structured for collaboration with coding agents (Claude Code, Codex, Cursor, etc.). Three things to know:

1. **`CLAUDE.md`** is loaded into Claude Code's context automatically — it explains the architecture, conventions, and where to look.
2. **`AGENTS.md`** is the equivalent for Codex and other agent runners that read that filename.
3. **`memory-bank/`** is a structured set of markdown files that capture *durable* project knowledge — decisions, features asked for, conventions, ongoing work. Read it before starting a non-trivial task; update it after.

Start any agentic session by reading `CLAUDE.md` → `memory-bank/README.md`.
