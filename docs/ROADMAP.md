# Implementation Roadmap

This is the short working roadmap for the web/API lane. The iOS app has its own detailed
handoff in `ios/BodyOS/HANDOFF.md`.

## Now

1. **Persist ledger rows.** Store raw events and normalized daily ledgers so API responses stop
   being sample-only.
2. **Trust OpenClaw ingestion.** Require `OPENCLAW_INGESTION_TOKEN` on write routes and save the
   raw meal/weight event before normalization.
3. **Finish meal text path.** *(Deterministic slice shipped.)* `MealLogService.estimateMacros`
   now parses explicit user-stated macros from text ("~600 cal, 40g protein" → `meal_text`,
   confidence high for exact numbers / medium when hedged, out-of-range values discarded) and
   sums multiple known foods mentioned in one message, while still preserving the original text
   and refusing to invent macros for bare food names or unmatched photos. Precedence:
   corrected (manual) > explicit stated numbers > known-food match > unknown. Covered by
   `src/test/meal-text-parsing.test.ts`. Remaining: a model-backed estimator for photos and
   free-form descriptions (see Next → Meal photo queue).
4. **Expose daily summary.** Add an endpoint that returns body mode, missing signals, and one
   concise action for OpenClaw to send.
5. **Choose nutrition tracking path.** Use `docs/NUTRITION_TRACKING_STRATEGY.md` as the product
   guardrail: fast capture, confidence-banded estimates, correction, known-food reuse, and
   smart-scale recalibration instead of treating photo-only calories as exact.

## Next

1. **Meal photo queue.** Accept a photo URL or uploaded asset, enqueue macro estimation, and write
   low/medium-confidence estimates back to the ledger. Do not persist raw images outside local/dev
   gitignored storage; store only bounded URLs or estimator outputs in raw events. Ground estimates
   with text/serving cues and known foods before spending model calls.
2. **Weight trend calibration.** Use 7-28 day weight trend plus logged intake to adjust calorie
   burn assumptions. Never treat wearable calorie burn as exact.
3. **HealthKit source attribution.** Distinguish Apple Watch, iPhone, and future smart-scale samples
   when they arrive through Apple Health.
4. **Smart scale bridge.** Pick the scale vendor only after James confirms the device; feed it into
   the existing weight metric route.

## Later

1. Calendar pressure in body-mode classification.
2. Budget/grocery links from known foods.
3. Multi-day operator view for agents.
4. Auth and production deployment once the private single-user flow is stable.

## GitHub Issue Deck

Create or keep a small issue set around these work items:

- Persist raw events and normalized daily ledgers for web API routes.
- Add trusted OpenClaw ingestion for meal and weight writes.
- Add OpenClaw daily summary endpoint.
- Implement meal photo macro-estimation queue.
- Add HealthKit source attribution for Apple Watch/iPhone/scale samples.
- Decide and implement smart-scale integration.

Avoid creating separate issues for every TODO string in code. One issue should represent a
shippable slice with a clear verification path.
