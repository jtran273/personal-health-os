# Hardware Strategy

The per-metric source hierarchy that `HealthDataRouter` encodes. Derived from PRD §6 and Appendix A.

## Core principle

> Never ask "which wearable is most accurate overall?" Ask "which source is best for *this metric*, for *this decision*, at *this moment*?"

## Per-metric source preference (best → fallback)

| Metric | Preferred | Fallback | Why |
|---|---|---|---|
| Sleep stages / total | Apple Watch | iPhone Health data → Oura disabled fallback | James now wears Apple Watch. Sleep is good enough for BodyOS decisions; do not pretend it is clinical sleep staging. |
| Overnight HRV | Apple Watch | iPhone Health data → Oura disabled fallback | Native HealthKit access wins for the current hardware. Treat HRV as directional. |
| Resting heart rate | Apple Watch | iPhone Health data → Oura disabled fallback | Native HealthKit access wins for the current hardware. |
| Active heart rate (workouts) | Apple Watch | Garmin → Fitbit | Oura is weak for daytime/exercise HR. |
| Steps | Apple Watch / Garmin | iPhone | Oura is poor at step counting. |
| Active calories | Apple Watch | Fitbit → Garmin | All wearables are weak here. **Recalibrate against weight trend.** |
| Skin temperature | Oura | (no good fallback) | Oura is strong; manufacturer-funded evidence noted. |
| Weight | Smart scale | Manual entry | The calibration layer for everything. |
| Body composition % | Smart scale | (skip) | Approximate; trend over time matters more than absolute. |
| Food calories / protein | Meal photo + Known Foods | Manual estimate | Wearable accuracy is irrelevant to food. |
| Blood work | Manual upload (later) | — | Clinician-reviewed, not in MVP. |

## Today (2026-05-21)

James returned **Oura** and now owns an **Apple Watch** connected to his Apple account. Oura code remains in the app but is disabled for now. Real iPhone HealthKit authorization and Apple Watch data display have been verified in BodyOS.

So today, the router falls back to:
- Sleep, HRV, RHR → Apple Watch through Apple Health, then `.estimated`.
- Steps, active calories → Apple Watch through Apple Health, then iPhone / `.estimated`.
- Weight → manual entry.
- Food → meal photo + known foods.

## Near-term roadmap

1. **Smart scale next.** Highest ROI — weight trend recalibrates the whole calorie model.
2. **HealthKit source attribution.** Distinguish Apple Watch, iPhone, and future scale samples inside Apple Health instead of labeling aggregates too broadly.
3. **Don't chase Garmin** unless serious endurance training becomes a goal.

## Source attribution readiness

HealthKit movement and weight reads now preserve source class before ingestion. Steps and active calories can remain Apple Watch or iPhone sourced; HealthKit body-mass samples can be classified as smart scale, Oura bridge, iPhone, or manual where sample metadata exposes enough detail. This is ready for simulator/unit coverage, but physical iPhone testing still needs to confirm Apple's real source names for James's devices and any future scale.

## Important: never trust wearable calorie burn

PRD §6 explicit principle. Use it as directional input; calibrate the BMR + activity model against the weight trend over multi-week windows. If the system "thinks" James is in a 500-cal deficit and the trend doesn't move in 3 weeks, the math is wrong — adjust assumed burn, not the user's behavior.
