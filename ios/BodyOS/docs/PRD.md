# PRD v2: Personal OS — Body + Diet

> Canonical product spec. Source of truth for product intent. When this conflicts with code or the memory bank, this wins until explicitly updated.

## 0. Product Thesis

Build a James-first cognitive-load-reduction system for physical health: OpenClaw passively collects body, diet, sleep, activity, and weight signals, reconciles messy data, and tells James the next useful action so he does not have to think throughout the day.

This is not primarily a health dashboard. It is a personal operating system that turns fragmented health data into automated routines, fewer decisions, and steady progress toward James's goals.

## 1. Vision

James should be able to live normally while the system quietly does the work:

- Wearable/phone data syncs in the background.
- James texts meal photos instead of manually logging food.
- Weight is captured through a quick prompt or smart scale.
- OpenClaw reconciles sources, detects missing data, and estimates confidence.
- The system gives one useful recommendation when it matters.
- Weekly, it turns the data into meal prep, grocery defaults, and behavior adjustments.

Long-term, this can become one Personal OS with three tabs:

1. Finance
2. Physical Health
3. Diet

The differentiated angle is the cross-domain intelligence: health, food, money, calendar, and cognitive load in one assistant-driven system.

## 2. North Star

Help James reach his health goals with the least daily cognitive load possible.

Success is not "more charts." Success is:

- Fewer decisions per day.
- Fewer manual logs.
- Fewer apps to check.
- More healthy defaults.
- Better goal progress without more mental overhead.

## 3. James's Goals

Primary goals:

- Improve body composition / manage weight.
- Eat better with less planning.
- Understand calories, protein, and diet quality directionally.
- Use sleep/recovery to adjust workouts, food, and daily load.
- Reduce cognitive load through automated routines.
- Eventually connect health decisions to budget and time constraints.

Secondary goals:

- Track cholesterol/blood-work goals over time.
- Build a product pattern that could later become broader than James.
- Avoid vendor lock-in to Oura or any single wearable.

## 4. MVP Scope

In scope:

- Daily Body Ledger: one row per day.
- Meal Log: photo/text-based meals with calories/macros/protein estimates.
- Known Food Library: recurring restaurant/home foods with better estimates.
- Daily weight logging: text prompt first, smart scale later.
- Wearable ingestion: Apple Watch through HealthKit because James returned Oura.
- Green / Yellow / Red body mode based on recovery, sleep, stress, and schedule.
- Daily deficit estimate: calories eaten vs rough burn.
- Weekly review: weight trend, food consistency, sleep/recovery, activity, and next-week plan.
- OpenClaw as daily interface.

Out of scope for MVP:

- Full native mobile app.
- Perfect macro tracking.
- Clinical medical guidance.
- Automatic grocery purchasing.
- Multi-user support.
- Complex workout programming.
- Treating wearable calories as exact.

## 5. Hardware Strategy (summary)

Full hardware notes are in [`../memory-bank/hardware-strategy.md`](../memory-bank/hardware-strategy.md). Headline:

1. Apple Watch is the active wearable path because James returned Oura.
2. Add a smart scale next (highest-ROI addition).
3. Keep Oura disabled as fallback code only.
4. Don't chase Garmin unless serious training becomes the goal.
5. Build the app source-agnostic so devices can swap underneath it.

## 6. Per-metric source hierarchy

See [`../memory-bank/hardware-strategy.md`](../memory-bank/hardware-strategy.md) for the table. Critical principle: **use weight trend to recalibrate calorie math**. If estimated deficit doesn't match observed weight movement over multiple weeks, adjust assumed burn/intake — don't tell the user to try harder.

## 7. Technical Architecture

### 7.1 Source-agnostic health ledger

Store raw vendor data unchanged. Store normalized daily metrics with source + confidence. Store coverage per day. Store AI interpretation separately from raw data. Implemented as `MetricSample<Value>` + `DailyLedgerEntry` — see [`../memory-bank/architecture.md`](../memory-bank/architecture.md).

### 7.2 Data sources

- **Phase 0:** Apple Watch through HealthKit; OpenClaw/iMessage for meal photos & weight text; local DB for ledger.
- **Phase 1:** Smart scale (Withings); deeper HealthKit verification/refinement.
- **Phase 2:** Google Health API / Fitbit if useful; meal planning + grocery workflows.

### 7.3 API reality

- Oura: clean v2 API, likely requires active membership for Gen3/Ring 4. Keep but avoid lock-in.
- HealthKit: free, native, no server API — requires in-app or Shortcut bridge.
- Google Health / Fitbit: in transition; validate before depending on.
- Garmin: partner-program API; not MVP.
- Terra and other aggregators: overkill for one-user MVP.

## 8. OpenClaw interaction model

- **Morning:** ask for weight (or ingest from scale), pull sleep/recovery, send only if there's a useful plan or warning.
- **During day:** accept meal photos/text, estimate macros, remember known foods, ask at most one clarifying question.
- **Afternoon:** if Green + low movement → suggest workout window. If Yellow/Red → protect recovery.
- **Evening:** summarize the day, set tomorrow's one adjustment.
- **Weekly:** review trend, generate meal-prep + grocery defaults.

## 9. Product Decisions

1. **MVP hardware:** Apple Watch now, smart scale next, Oura disabled for now.
2. **Product angle:** least cognitive load, not most accurate dashboard.
3. **Data strategy:** source-agnostic ledger. No single vendor as truth.
4. **First goal:** body composition / weight management. Clearest loop, easiest to validate.

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wearable inaccuracy (especially calories & sleep stages). | Confidence per sample; trend-based recalibration; show source. |
| Oura subscription/API dependency. | Oura disabled; source-agnostic ledger keeps it as optional fallback code only. |
| HealthKit requires iOS bridge. | We're building iOS native — addressed. |
| Notification overload increases cognitive load. | One useful nudge per day max. Bar is high. |
| Meal-photo estimates can be wrong. | Known Foods library + easy text corrections. |

## 11. Roadmap

- **Phase 0 — Working Prototype:** Apple Watch / HealthKit → Ledger, weight text prompt, meal photo logging, known foods, daily body mode, weekly review.
- **Phase 1 — Better Data Foundation:** Smart scale, HealthKit refinement, coverage score, trend-recalibrated calorie model.
- **Phase 2 — Diet Automation:** Meal-prep defaults, grocery list, budget-aware healthy eating, cholesterol-aware guidance.
- **Phase 3 — Unified Personal OS:** Finance + Physical Health + Diet tabs; cross-domain recommendations.

## 12. Final Recommendation

1. Use Apple Watch / Apple Health for wearable signals.
2. Add a smart scale next.
3. Meal photo + known-food logging through OpenClaw.
4. Source-agnostic body ledger underneath everything.
5. Keep Oura disabled unless there is a concrete reason to re-enable it.
6. Don't chase perfect wearable accuracy; use trends and recalibration.

The best product is not the best tracker. It is the system that removes the most thinking while moving James toward his goals.

---

Wearable accuracy evidence and the per-device scorecard live in [`../memory-bank/hardware-strategy.md`](../memory-bank/hardware-strategy.md). External reference (James's Notion): https://www.notion.so/james-tran/PRD-Physical-Health-Copilot-AI-Assisted-Body-OS-364dadc740e2817aa75cfad425cf5fbe
