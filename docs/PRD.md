# Personal Health OS PRD

## Product Thesis

Personal Health OS is a James-first body and diet operating system. Its job is to reduce cognitive load, not create another dashboard. OpenClaw should ask for the smallest useful input, absorb passive signals from wearables and health apps, and return a clear daily operating mode for food, movement, recovery, and schedule decisions.

Version 2 connects body, diet, budget, and calendar. The foundation starts with a source-agnostic health ledger so the app can change devices and data vendors without changing the product model.

## MVP Scope

- Capture meal logs from OpenClaw text and future meal photos.
- Capture weight from prompts or a future smart scale integration.
- Ingest wearable signals from Oura and Apple Health style sources.
- Normalize raw events into a daily ledger with confidence per metric.
- Classify a daily body mode: Green, Yellow, or Red.
- Return simple JSON API responses for future OpenClaw and frontend clients.
- Keep the frontend as a placeholder until Claude Designer provides the designed UI.

## Out of Scope for MVP

- Auth and account management.
- Payment and subscriptions.
- Medical advice or diagnosis.
- Full budget/calendar automation.
- Production database schema and migrations.

## Hardware Strategy

No single wearable is treated as truth. The app uses each device where it is strongest:

- Oura: sleep, resting heart rate, HRV, recovery, temperature deviation.
- Apple Watch or Garmin: workouts, active heart rate, steps, activity minutes.
- Smart scale or manual prompt: weight trend.
- OpenClaw: meal context, appetite, symptoms, adherence, and subjective notes.

Calories from wearables are weak everywhere, so they are treated as a rough prior and recalibrated against weight trend and intake estimates.

## Data Source Strategy

The product keeps raw source events and normalized metrics separate. Raw events preserve provenance. Normalized metrics power decisions. Every normalized metric should include source, confidence, observed time range, and recalibration notes when applicable.

## OpenClaw Loop

1. Morning: summarize recovery, weight trend, and body mode.
2. During day: collect meals with the lowest-friction input available.
3. Evening: ask only for missing high-value signals.
4. Weekly: recalibrate calorie and intake assumptions against weight trend.
5. Later: connect diet choices to grocery budget and calendar pressure.
