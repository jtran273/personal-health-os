# Glossary

Domain terms used throughout BodyOS. Keep definitions tight.

**Body mode** — daily Green / Yellow / Red signal. Green = push it, Yellow = maintain, Red = protect recovery. Computed by `BodyModeEngine` from readiness + sleep.

**Body Ledger** — the conceptual store of one row per day (`DailyLedgerEntry`) with normalized, source-attributed metrics. The architectural core of the app.

**Coverage score** — fraction of expected metrics that were actually captured on a given day, 0–1. Lets the UI honestly report data quality ("60% data — connect more sources").

**Confidence** — per-sample 0–1 score on how much to trust this value. Distinct from source — manual weight from a smart scale is high confidence; a meal-photo calorie estimate is low.

**Deficit estimate** — `BMR + active calories − calories in`. Directional. Must be recalibrated against weight trend, never trusted absolutely.

**Known Food** — a recurring food (e.g. "Sweetgreen harvest bowl") with stored typical calories/protein. Improves over time as James corrects estimates.

**Meal log** — list of `Meal` entries for a day. Each meal may have a photo, a text description, and Claude-estimated macros.

**Metric sample** — `MetricSample<Value>`: value + source + confidence + timestamp. The atomic unit of data in the ledger.

**OpenClaw** — the conversational interface to BodyOS (text/photo → meal log, daily nudges, weekly review). Currently external (iMessage), will move in-app over time.

**Personal OS** — the long-term framing: one assistant covering Finance, Physical Health, and Diet with cross-domain intelligence. BodyOS is the Physical Health + Diet slice.

**Readiness score** — Oura-style 0–100 daily readiness. Primary input to body mode.

**Source-agnostic ledger** — the architectural commitment that no vendor type leaks into models or views. See `architecture.md` and `decisions.md` #002.

**Weight trend** — multi-day moving average of weight. The calibration layer for the calorie model.
