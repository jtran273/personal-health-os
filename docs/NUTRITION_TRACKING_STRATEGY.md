# Nutrition Tracking Strategy

Last reviewed: 2026-06-10

## Recommendation

Build Health OS around fast capture, correction, and calibration instead of pretending a single food photo is exact.

The durable product loop should be:

1. Log in five seconds by text, voice transcript, barcode/manual fields, or photo.
2. Return a calorie/protein/carb/fat estimate with a confidence band and serving-size question when uncertain.
3. Let James correct the estimate once.
4. Save corrected repeat meals as known foods.
5. Recalibrate daily burn from 7-28 day smart-scale trend plus logged intake.

This is more useful than a pure Cal AI clone because weight trend can tell us whether estimates are directionally wrong.

## Near-Term Build

- Keep the current backend rule: unmatched meal photos are accepted for future routing but do not invent macros yet.
- Add a `meal_photo_estimates` queue/table or file-backed dev queue that stores only a local asset pointer, bounded food labels, macro estimates, confidence, and model metadata.
- Route first-pass estimates through a cheap vision model and require manual confirmation before a meal affects coaching.
- Use known-food matching before calling a model. Repeated meals should cost zero model calls after correction.
- Ask for a serving cue when the model sees dense/ambiguous food: "half bowl", "restaurant portion", "weighed 220g", "shared plate", etc.

## Buy vs Build

| Option | Use Case | Cost Notes | Product Caveat |
| --- | --- | --- | --- |
| Cal AI | Personal stopgap while Health OS matures | App Store listing is free, but food scanning requires subscription. Third-party app intelligence showed monthly around $9.99 and annual offers around $19.99-$29.99; in-app offers can vary, so verify before buying. | Great friction profile, but its data will live outside Health OS unless manually copied or exported. |
| General vision model | Health OS native workflow | OpenAI pricing on 2026-06-10 listed GPT-5.4 mini at $0.75 / 1M input tokens and $4.50 / 1M output tokens. A 1024x1024 image on patch-tokenized mini models is roughly 1.6K billed image tokens before prompt/output, so routine meal estimates should usually be fractions of a cent to low cents each depending model/detail/output. | Needs prompting, nutrition database grounding, correction UX, and accuracy evals. |
| Hybrid | Best long-term path | Use Cal AI for James personally if he wants immediate convenience; build Health OS with model + known-food + scale calibration for ownership. | Avoids blocking on perfect estimation while preserving long-term data control. |

## Accuracy Reality

Photo nutrition tracking is useful for adherence, not truth. The weakest part is portion size, especially mixed bowls, sauces, oils, snacks, and restaurant meals. OpenAI's own vision docs warn that models can be inaccurate and struggle with counting/spatial precision. Recent nutrition research is moving toward multimodal models plus retrieval from standardized nutrition databases; DietAI24 reported better performance from combining image understanding with database lookup rather than free-form guessing.

Health OS should therefore display estimates as ranges or confidence-banded values:

- **High confidence:** corrected known food, barcode/label/manual entry, weighed portion.
- **Medium confidence:** matched known food with similar serving, simple separated foods, photo plus text serving cue.
- **Low confidence:** photo-only mixed meal, restaurant dish, shared plate, sauces/oils not visible.
- **Unknown:** unmatched photo/text when no estimator is configured.

## Validation Plan

Create a small personal benchmark before trusting automation:

1. Pick 25 meals James actually eats often.
2. For each meal, capture photo, short text description, and a manual/corrected calorie + protein target.
3. Run candidate estimators against the same inputs.
4. Track absolute calorie error, protein error, confidence calibration, and whether the model asked a useful clarification.
5. Prefer the estimator that is easiest to correct and best calibrated, not the one that sounds most confident.

Success target for v1: median calorie error under 20% on James's repeat meals after known-food correction, and no auto-coaching from low-confidence estimates.

## Source Notes

- Cal AI App Store page: food scanning analysis requires a subscription.
- Sensor Tower App Store overview: observed Cal AI in-app purchase options included monthly and annual plans.
- OpenAI API pricing and vision docs: image inputs are token-billed; GPT-5.4 mini and GPT-5.5 price points differ materially.
- DietAI24, Communications Medicine 2025: multimodal model plus nutrition database grounding improved dietary assessment accuracy and nutrient coverage.
