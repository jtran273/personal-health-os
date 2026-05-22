# Design System

How the BodyOS design system is organized. The authoritative visual reference lives in [`design-handoff/`](../design-handoff/) at repo root — open `design-handoff/prototype/Health Copilot.html` and `Design System.html` in a browser to see the prototype.

## Source of truth

| Topic | File |
|---|---|
| Raw tokens (colors, spacing, radii, motion, font names) | [`BodyOS/DesignSystem/Tokens.swift`](../BodyOS/DesignSystem/Tokens.swift) |
| Semantic aliases (used by views) | [`BodyOS/DesignSystem/Theme.swift`](../BodyOS/DesignSystem/Theme.swift) |
| Typography scale + view helpers | [`BodyOS/DesignSystem/Typography.swift`](../BodyOS/DesignSystem/Typography.swift) |
| Custom fonts setup | [`BodyOS/DesignSystem/Fonts/README.md`](../BodyOS/DesignSystem/Fonts/README.md) |
| Components | [`BodyOS/DesignSystem/Components/`](../BodyOS/DesignSystem/Components/) |
| Design handoff reference | [`design-handoff/README.md`](../design-handoff/README.md) |

## Rules

- **Views read `Theme.*` and `AppFont.*`.** They should not import or reference `Tokens.*` directly — that's the raw layer.
- **No bare hex values in views or features.** If you need a new color, add it to `Tokens.Color` first, then expose via `Theme`.
- **No bare font sizes / families in views.** Add a new `AppFont` token if a new role is needed.
- **Three families, three jobs:** Instrument Serif = headlines + numbers; Geist = body/UI; JetBrains Mono = ALL-CAPS labels and timestamps. Never mix purposes.
- **Mode chromas only.** Saturated colors are reserved for the three body modes. Everything else lives on the paper/ink/muted scale.
- **Confidence flows to UI.** `MetricSample.confidence: Double` → `MetricSample.confidenceBand: Confidence` (high/med/low) → drives `SourceChip` dot color and sparkline dash pattern.

## Build order (from handoff)

1. ✅ Day 1 — Tokens + Theme + Typography + Body Mode Orb + Source Chip (shipped).
2. ✅ Day 2 — MetricTile + Sparkline + LedgerRow (shipped).
3. ✅ Day 3 — Today screen, fully wired.
4. ✅ Day 4 — Body Ledger + day picker + coverage ring.
5. ✅ Day 5 — HealthKit + Oura ingestion (Oura already done).
6. ◩ Day 6 — Copilot chat + meal photo flow (manual meal fallback shipped; live photo/AI flow pending).
7. ◩ Day 7 — Weekly Review + calibration chart (UI shipped; manual weight input now exists; meal/deficit calibration pending).

## Color caveat

The handoff specifies colors in OKLCH. iOS SwiftUI has no native OKLCH color initializer (yet). `Tokens.Color` stores **sRGB approximations** of the OKLCH values. The OKLCH source value is in the comment next to each constant. If color accuracy becomes important (especially for the mode chromas in print or external rendering), swap to a CIE Lab → sRGB conversion at build time.

## Components built so far

- **BodyModeOrb** — 240pt breathing organic blob. Three cubic-bezier keyframes interpolated over a 9s loop with spline easing. Reduce-motion freezes at keyframe 1.
- **SourceChip** — paper-deep capsule with confidence dot + mono ALL-CAPS label. Convenience inits from `MetricSample` or `MetricSource`.
- **Sparkline** — `Canvas`-based line chart. Confidence-driven dash pattern (high solid, med `[3,2]`, low `[1,2]`). Null values break the path. Optional 10% area fill. Smooth midpoint-quadratic interpolation.
- **MetricTile** — Today-grid tile. `MetricTileData` struct → ALL-CAPS label + SourceChip on top, editorial number in the middle, mono delta + 56×16 sparkline on the bottom. Full tile is a tappable hit target.
- **LedgerRow** — Body Ledger row. 32pt icon well + label/value/unit row + sub-line + source chip + confidence label + optional clay-bordered "story" block. SF Symbol icon.
- **Today screen local components** — `ModePill`, `SectionHead`, `OpenLoopRow`, and `TimelineRow` live inside `TodayView.swift` for Day 3. Extract only if reused by Body Ledger / Sources.
- **Body Ledger local components** — `DayPill`, `CoverageRing`, and `LedgerSectionHead` live inside `BodyLedgerView.swift`. Extract coverage ring once Sources needs the same pattern.
- **Sources local components** — `SourceCoverageRing`, `SourceCard`, `KnownFoodRow`, and `SourcesSectionHead` live inside `SourcesView.swift`.
- **Weekly local components** — calibration chart, weekly bullet cards, weekly spark rows, and plan rows live inside `WeeklyReviewView.swift`.

Old **MetricCard** removed; **BodyModeBadge** is still scaffold-quality and no longer used by Today.

## Voice

OpenClaw's voice rules (from handoff, never violate):
1. Lead with the action, then the reason.
2. Plain numbers + units. No emojis. No exclamation marks.
3. First person, sparingly. _"I set today to yellow."_
4. Inform, then let the user decide.
5. Confidence words mirror line quality.

**Do not** add streaks, emojis, exclamation marks, generic encouragement, or first-person-plural.
