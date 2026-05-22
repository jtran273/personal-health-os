# Handoff — Body OS (Physical Health Copilot)

A mobile-first physical-health copilot. Quietly ingests messy data from wearables, photos, and manual logs; reconciles them with confidence and source attribution; and tells the user **one useful thing** per moment.

This bundle is the **design reference** — high-fidelity HTML/React prototypes plus a design-system document. It is *not* shippable code. Your job is to recreate it natively in **SwiftUI (iOS 17+)** as the primary platform, with a secondary web port if you also need it. If the target codebase already exists, follow its conventions; if it doesn't, this README is the spec for greenfield.

---

## About these files

Files under `prototype/` are HTML/React mocks I built to design and validate the experience. Treat them as *visual + behavioural specs*, not source. Re-implement using the platform's idioms (SwiftUI for iOS, React if you do web).

**Fidelity: high.** Final colors, typography scale, spacing, motion, voice/tone, and component anatomy are all settled. The only blank areas are real auth flows, network code, and any feature not on the screen list below.

Open these two first:

| File | What it is |
|---|---|
| `prototype/Health Copilot.html` | The clickable prototype — all 5 mobile screens + a desktop view, on a design canvas |
| `prototype/Design System.html` | The full design system spec — tokens, components, patterns, voice, SwiftUI snippets |

Everything else in `prototype/` is the React source that drives those two pages. Read it if you want to see the exact composition; ignore it for porting decisions.

---

## Product summary

A James-first **cognitive-load-reduction system for physical health** (per the PRD). Source-agnostic body ledger, confidence-aware, conversation-led. Five guiding principles, in order:

1. **Say less, mean more.** One useful thing per moment.
2. **Source is part of the truth.** Every number names where it came from.
3. **Trust the trend over the device.** When math disagrees with the scale, the scale wins.
4. **Calm, not clinical.** Warm paper, editorial type, no alarm reds.
5. **Body, then suggestion.** Always lead with what the body is doing today.

---

## Screens in scope

The MVP is five mobile screens + a desktop "Operator" view. Build in this order — each screen builds on the previous.

### 1. Today (`screen-today.jsx`)
**Purpose:** the daily briefing. The first and most-used screen.
**Anatomy, top to bottom:**
- Status header — date label (Instrument Serif 26) + mode pill (`green`/`yellow`/`red` dot + ALL-CAPS label).
- **Body Mode hero** — a breathing organic SVG blob (240pt) centered behind the day's headline (e.g. "Recover, don't push."). Mode reason below in muted body.
- **"The One Thing" card** — the single most important component in the app. Mode-tinted background bloom in the corner. SF Symbol icon in a soft-tinted rounded square. Headline (Instrument Serif 22). Reason (body, muted). Two buttons: `Plan it` (primary, ink-on-paper) and `Why this?` (ghost).
- **Open loops** — small clay-dot rows for missing data (e.g. "Weight not logged · since Saturday · Log now →"). Never blink or badge.
- **Today, so far** — 2-column metric tile grid (Sleep, HRV, Resting HR, Steps, Eaten, Protein, Weight). Each tile: label + source chip + editorial number + delta + sparkline. Tap → Ledger.
- **Day, in order** — vertical timeline of events with source attribution.
- Footer: "Synced 2 min ago. Coverage today 88%."

### 2. Copilot (`screen-chat.jsx`)
**Purpose:** the quiet conversational interface (called "OpenClaw").
**Anatomy:**
- Header — avatar + name "OpenClaw" + status "quiet · always on".
- Mixed message stream: user bubbles (ink-on-paper, right-aligned), short system replies (paper-on-surface, left-aligned), and **System Cards** for structured replies (Meal estimate, Weight trend, Morning briefing).
- Time dividers ("This morning", "12:18 pm") in mono uppercase.
- Suggested-reply pills (rounded outline, transient).
- Input bar: `+` attach, text field, `photo` button, `mic` / `send` button (toggles based on text).

### 3. Body Ledger (`screen-ledger.jsx`)
**Purpose:** the source-agnostic ledger surface. One row per metric, exploded.
**Anatomy:**
- Header — "Body Ledger" cap + title.
- Day picker — horizontal row of date pills, active = ink, inactive = muted.
- Coverage banner — small circular meter + sentence about missing signals.
- **Ledger rows**, grouped by section (Sleep + recovery, Activity, Diet, Body). Each row: icon, label, editorial number + unit, sub-line (baseline/context), source chip + confidence label, optional "story" paragraph explaining how the number got there.
- Footer note: "How the ledger works" — short explanation of source/confidence model.

### 4. Weekly Review (`screen-week.jsx`)
**Purpose:** the calibration story.
**Anatomy:**
- Header — week 20 kicker + date range.
- Editorial headline — explains the week in one sentence.
- **Calibration chart** — the most novel chart in the app. Bars: estimated daily deficit (kcal), both positive and negative around a zero baseline. Line: observed weight trend. When they disagree, OpenClaw narrates the recalibration in an inline callout (clay left-border block).
- Wins / Slipped — two-column lists.
- "Week in two lines" — sleep + protein sparklines, side by side.
- Next week plan — 3 numbered cards. Approve button (primary, full width).

### 5. Sources / Body OS (`screen-sources.jsx`)
**Purpose:** the trust surface. Shows where data flows in.
**Anatomy:**
- Header — "Body OS" + title "What's flowing in."
- Coverage hero — circular meter + sentence about how to raise coverage.
- **Metric routing table** — the key idea. One row per metric → which source we use → why. Current implementation uses Apple Watch / Apple Health for sleep, recovery, movement, and Health-sourced weight; older Oura examples are historical prototype references.
- Source cards, grouped by status: Connected · Pending · Available. Each card: icon + name + status dot + role line + coverage bar + sub-line + manage/connect link.
- Known foods list — meals learned from chat photos, with log count.
- Footer quote.

### 6. Desktop Operator (`screen-desktop.jsx`)
**Purpose:** same body, calmer command surface.
**Layout:** 3-column grid, 1280×800.
- **Left rail (260pt):** date + body mode mini-orb + open loops + connected sources.
- **Center (flex):** "The one thing" headline + metrics row (4 columns) + the calibration chart card + decisions queued for next week (3 cards).
- **Right rail (360pt):** live OpenClaw conversation + composer.

---

## Design tokens (copy-paste-ready)

### Color

| Token | Hex / OKLCH | Use |
|---|---|---|
| `--paper` | `#f6f1e8` | App background |
| `--paper-deep` | `#ede6d8` | Wells, chip backgrounds |
| `--surface` | `#fbf7f0` | Cards |
| `--surface-2` | `#fdfaf3` | Nested surfaces, system bubbles |
| `--ink` | `#1e1b16` | Primary text, primary CTAs |
| `--ink-2` | `#3a342c` | Body text |
| `--muted` | `#6b6358` | Captions, units |
| `--faint` | `#a39a8c` | Disabled, timestamps |
| `--clay` | `oklch(0.60 0.11 40)` | Accent — open-loop dots, weight trend, single emphasized links |
| `--green` | `oklch(0.58 0.08 152)` | Mode: push permitted |
| `--green-soft` | `oklch(0.92 0.04 152)` | Soft fill for green-mode tinting |
| `--yellow` | `oklch(0.74 0.10 78)` | Mode: protect recovery |
| `--yellow-soft` | `oklch(0.93 0.05 78)` | Soft fill |
| `--red` | `oklch(0.55 0.14 28)` | Mode: restore |
| `--red-soft` | `oklch(0.93 0.05 28)` | Soft fill |
| `--hair` | `rgba(30, 27, 22, 0.08)` | Hairline dividers |
| `--hair-strong` | `rgba(30, 27, 22, 0.16)` | Borders on inputs/ghost buttons |

Authoritative copy lives in `prototype/tokens.css`.

### Typography

Three families. Always use the right one for the right job — they encode meaning.

| Token | Family | Size / line-height | Use |
|---|---|---|---|
| display | Instrument Serif | 56 / 1.02 | One-line hero headlines (rare) |
| title | Instrument Serif | 32 / 1.05 | Screen titles |
| heading | Instrument Serif | 22 / 1.15 | "The one thing", section titles |
| number | Instrument Serif (tnum) | 30 / 0.92 | All metric numbers |
| body-l | Geist 400 | 16 / 1.5 | Lead body text |
| body | Geist 400 | 14 / 1.5 | Default UI text |
| caption | Geist 400 | 12 / 1.45 | Sub-lines, timestamps |
| tag | JetBrains Mono 400 | 10 / 1, ALL CAPS, 0.10em tracking | Source labels, time stamps, "TODAY", "YELLOW" |

iOS fonts: register `InstrumentSerif-Regular`, `Geist-Regular/Medium`, `JetBrainsMono-Regular` in `Info.plist`. Use SF Pro as the system fallback only.

### Spacing — 4-pt scale

`xs:4 · sm:8 · md:12 · lg:16 · xl:24 · xxl:32`

### Radii

`tile: 12 · card: 18 · hero: 26 · pill: ∞`

Inner-nested cards: `r.card − 4`.

### Motion

- **Body Mode Orb breathing:** 9s loop, morphs between 3 stable SVG paths with spline easing `0.4 0 0.2 1`.
- **Fade:** 200ms ease-out for reveals / dismisses.
- **Slide:** 320ms ease-out for sheets and tab transitions.
- **Calibration redraw:** 800ms `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- Reduce-motion: orb freezes (first path), chart redraws cross-fade instead of morph. **Honor this.**

---

## Components (with iOS notes)

Full anatomies + SwiftUI snippets are in `prototype/Design System.html`. Quick index:

| Component | iOS approach | Source files |
|---|---|---|
| **Body Mode Orb** | `Canvas` or `Shape` w/ animated `Path`; `TimelineView(.animation)` for breathing. Three stable paths + spline interpolation. | `atoms.jsx` → `ModeOrb` |
| **Source Chip** | Capsule + dot + mono label. Encapsulate confidence as a Swift enum. | `atoms.jsx` → `SourceChip` |
| **Sparkline** | `Canvas` with `StrokeStyle`. Dash array changes with confidence (`high=solid, med=[3,2], low=[1,2]`). Nulls = path breaks. | `atoms.jsx` → `Spark` |
| **Metric Tile** | `VStack` + label/chip row, number, delta+sparkline. 44pt min hit target — full tile is tappable. | `atoms.jsx` → `MetricTile` |
| **System Card** | `VStack` with optional title row (caption + hairline + source chip), then content. Used for structured AI replies in chat. | `screen-chat.jsx` → `SysCard` |
| **Buttons** | Three roles only: `Primary` (ink fill), `Ghost` (hairline outline), `Pill` (transient suggestion). Plus a clay text-link for open-loop CTAs. One primary per screen, max. 44pt min height. `.sensoryFeedback(.selection)` on primary. | `screen-today.jsx` |
| **Tab Bar** | iOS `TabView` with `.tint(.ink)` + `.toolbarBackground(.paper, for: .tabBar)`. 5 tabs: Today · Copilot · Body · Weekly · Sources. SF Symbols in the table below. | `atoms.jsx` → `TabBar` |
| **Chat Input Bar** | `HStack` inside a `Capsule`. Send button toggles between `mic` (empty) and `paperplane.fill` (typing). Photo + `+` buttons surface camera and clarifying actions. | `screen-chat.jsx` |
| **Ledger Row** | Icon + label + editorial number + unit + sub-line + source chip + optional left-border "story" block. | `screen-ledger.jsx` → `LedgerRow` |

### SF Symbol mapping
| Token | SF Symbol |
|---|---|
| sun | `sun.max` |
| moon | `moon.stars` |
| heart | `heart` |
| walk | `figure.walk` |
| flame | `flame` |
| scale | `scalemass` |
| ring (Oura) | `circle.dashed` |
| photo | `photo` |
| spark (protein) | `leaf` |
| steps | `figure.walk` (or `figure.walk.motion`) |
| watch | `applewatch` |
| chat | `bubble.left` |
| cal | `calendar` |
| lab | `flask` |
| phone | `iphone` |

---

## Patterns (with intent)

| Pattern | What it does | Rule |
|---|---|---|
| **The One Thing** | The day's only required attention. Mode-tinted card with action + reason. | Never two per screen. If a second action is warranted, queue it for tomorrow. |
| **Calibration chart** | Reconciles estimated deficit (bars) with observed weight (line). When they disagree, narrate the correction. | The only chart in the app with two scales. |
| **Open Loop** | Quiet row for a missing signal. Clay dot + label + "since" + clay text link. | Never blinks, badges, or interrupts. Waits in a single Today list. |
| **Coverage ring** | Small circular meter showing fraction of expected signals received. | Always pairs with a sentence saying how to raise it. |

---

## Voice & tone

OpenClaw is **quiet, plain, and never cheerful.** Five rules:

1. Lead with the action, then the reason. _"Skip the lift. Walk 25 min at lunch."_ ✅
2. Plain numbers + units. No emojis. No exclamation marks.
3. First person, sparingly. _"I set today to yellow."_ ✅
4. Inform, then let the user decide. _"One thing: walk 25 min at lunch."_ ✅
5. Confidence words mirror line-quality. _"≈ 410 kcal"_ with a dashed sparkline.

**Do not** add streaks, emojis, exclamation marks, generic encouragement ("Great job!"), or first-person-plural ("We've noticed…").

---

## State & data model

Build the iOS app around a single **`BodyLedger`** type. Per the PRD:

```swift
struct BodyLedger {
    let date: Date
    let entries: [Metric: LedgerEntry]   // dictionary of metric → entry
    let mode: BodyMode                    // .green / .yellow / .red
    let coverage: Double                  // 0...1
    let openLoops: [OpenLoop]
}

struct LedgerEntry {
    let raw: AnyVendorReading             // preserve untouched (Oura JSON, HealthKit sample, etc.)
    let normalized: Double                // canonical unit
    let displayValue: String              // pre-formatted for UI
    let source: DataSource                // .oura, .iphone, .photos, .manual, .calendar, .smartScale, .appleWatch
    let confidence: Confidence            // .high / .med / .low — drives line dash + chip dot
    let delta: String?                    // "−18%", "+6", "so far"
    let baseline: Double?                 // 14-day rolling avg
    let trend: [Double?]                  // last 7–14 days (nulls allowed = gaps in sparkline)
    let story: String?                    // optional prose: "Down 18%. This is what flipped today to yellow."
}

enum BodyMode { case green, yellow, red }
enum Confidence { case high, med, low }
enum DataSource { case oura, iphone, appleWatch, smartScale, photos, manual, calendar, lab }
```

**Source routing** (key product idea): each metric is fetched from the source best at it. Routing table:

| Metric | Primary | Fallback | Why |
|---|---|---|---|
| Sleep, HRV, RHR | Apple Watch / Apple Health | Oura disabled fallback | Current hardware James wears |
| Skin temp | Oura | — | Historical fallback only; Oura is disabled for now |
| Workout HR, active HR | Apple Watch | iPhone | Best at exercise |
| Steps | iPhone / Apple Watch | — | Oura under-counts |
| Weight | Smart scale | Manual entry | Source of truth for body comp |
| Active calories | iPhone / Apple Watch (corrected) | — | Always recalibrated by weight trend |
| Food intake | Meal photos (OpenClaw chat) + Known Foods library | — | More important than tiny wearable diffs |
| Daily load | Calendar (meeting density) | — | Cognitive load signal |
| Bloodwork | Manual PDF upload | — | Manual for MVP |

**Calibration rule** (critical): never trust wearable calorie estimates as absolute. Compare estimated weekly deficit vs. observed weight-trend slope; if they disagree, **correct the burn model** and tell the user the correction in plain English.

---

## Integrations

Per the PRD's Phase 0–1 scope:

| Source | API / Bridge | Auth notes |
|---|---|---|
| **Oura** | Oura v2 REST API | Personal access token (paid Membership) — store in Keychain. Pull sleep/recovery/HRV/RHR/temperature daily. |
| **iPhone / Apple Watch** | HealthKit | `NSHealthShareUsageDescription` + `NSHealthUpdateUsageDescription` in Info.plist. Read: steps, active energy, heart rate, HRV SDNN, sleep analysis, body mass. |
| **Smart scale (Withings)** | Sync via Apple Health (preferred) | No direct Withings API needed for MVP. Pull from HealthKit. |
| **Meal photos** | iMessage / in-app capture | OpenAI/Anthropic Vision for nutrition estimate (server-side). Cache estimates in Known Foods library. |
| **Calendar** | EventKit | `NSCalendarsUsageDescription`. Read-only. Used for meeting-density signal. |
| **Lab results** | Manual PDF upload | OCR optional; out of scope for week 1. |

Onboarding is **not** designed yet (intentionally out of MVP scope per the user). When you build it, follow HIG: authorization screens for HealthKit, then per-source connect flow.

---

## Accessibility minimums

| Rule | Target | How |
|---|---|---|
| Hit target | ≥ 44 × 44 pt | All tile rows, all chips with actions, full Metric Tile is tappable |
| Text contrast | ≥ 4.5:1 body | Ink `#1e1b16` on paper `#f6f1e8` ≈ 13:1 |
| Dynamic Type | Scales 100–200% | All `Font` tokens are sized in pt; serif headings can lock |
| Reduce Motion | Honored | Body Mode Orb freezes; chart redraws cross-fade instead of morph |
| VoiceOver | One full sentence per metric | "Sleep, 6 hours 12 minutes. High confidence from Oura. Down 1 hour from baseline." |

---

## File map

```
prototype/
├── Health Copilot.html          ← Open this to see the prototype
├── Design System.html           ← Open this for the full system spec
├── tokens.css                   ← All color/type/radii tokens
├── design-system.css            ← Doc layout (ignore for porting)
├── design-system.jsx            ← Doc content — has SwiftUI snippets inline
├── atoms.jsx                    ← Shared UI atoms: ModeOrb, SourceChip, Spark, MetricTile, Icon, TabBar
├── data.jsx                     ← Sample data (James persona, week 20)
├── screen-today.jsx             ← Screen 1
├── screen-chat.jsx              ← Screen 2
├── screen-ledger.jsx            ← Screen 3
├── screen-week.jsx              ← Screen 4
├── screen-sources.jsx           ← Screen 5
├── screen-desktop.jsx           ← Desktop Operator view
├── design-canvas.jsx            ← Canvas wrapper (ignore)
├── ios-frame.jsx                ← Unused iOS frame helper (ignore)
└── tweaks-panel.jsx             ← Unused tweaks helper (ignore)
```

To view the prototypes locally: run any static server (e.g. `python3 -m http.server` in `prototype/`) and open the two `.html` files.

---

## Suggested build order (one-week MVP)

1. **Day 1** — Project scaffold. Register fonts. Build `tokens.swift` + `Theme.swift`. Implement `BodyMode` orb and `SourceChip` as standalone previews.
2. **Day 2** — `MetricTile` + `Sparkline` + `LedgerRow`. All consumed by the same `LedgerEntry` model.
3. **Day 3** — **Today screen**, fully wired to mocked data. This is the demo.
4. **Day 4** — **Body Ledger** + day picker + coverage ring.
5. **Day 5** — HealthKit + Oura ingestion. Replace mocked data.
6. **Day 6** — **Copilot chat** + meal photo flow (vision API call).
7. **Day 7** — **Weekly Review** + calibration chart + recalibration job.

Sources screen and Desktop Operator are post-MVP.

---

## Open questions / decisions to confirm before coding

1. **Backend:** Server for vision-based meal estimation, or do it all on-device with a Vision framework + LLM call? PRD implies server.
2. **Identity:** Single-user (James) per PRD — skip auth entirely for MVP, or stub Sign-in-with-Apple?
3. **Push notifications:** PRD says "OpenClaw sends only if there is a useful plan or warning." Build the silent-by-default rule from the start.
4. **Onboarding:** Out of MVP scope, but the very first launch needs at least HealthKit auth. Oura is disabled for now.
5. **Widget / Live Activity:** Today's "one thing" is the obvious widget candidate. Post-MVP, but design with it in mind.
