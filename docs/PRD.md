# Personal Health OS PRD

## Product Thesis

Personal Health OS is a James-first body and diet operating system. Its job is to reduce cognitive load, not create another dashboard. OpenClaw should ask for the smallest useful input, absorb passive signals from wearables and health apps, and return a clear daily operating mode for food, movement, recovery, and schedule decisions.

Version 2 connects body, diet, budget, and calendar. The foundation starts with a source-agnostic health ledger so the app can change devices and data vendors without changing the product model.

## MVP Scope

- Capture meal logs from OpenClaw text and future meal photos.
- Capture weight from prompts or a future smart scale integration.
- Ingest wearable signals from Apple Watch through Apple Health, with dormant Oura support as a fallback.
- Normalize raw events into a daily ledger with confidence per metric.
- Classify a daily body mode: Green, Yellow, or Red.
- Return simple JSON API responses for future OpenClaw and frontend clients.
- Keep the web frontend useful but lightweight while the native iOS app remains the primary product surface.

## Backend Persistence Milestone

The first backend persistence milestone uses a local-first raw event ledger instead of a production database. Development data lives in `.data/health-events.jsonl`, is git-ignored, and can be deleted to reset local state. Provider payloads are retained for reprocessing, but public daily summary responses expose only normalized ledger fields and meal summaries.

This milestone should be treated as a durable contract test for source independence, not as the final production storage choice.

## Out of Scope for MVP

- Auth and account management.
- Payment and subscriptions.
- Medical advice or diagnosis.
- Full budget/calendar automation.
- Production database schema and migrations.

## Hardware Strategy

No single wearable is treated as truth. The app uses each device where it is strongest and where
James actually has hardware connected:

- Apple Watch / Apple Health: sleep, resting heart rate, HRV, steps, active energy, workouts, and Health-sourced weight when present.
- Oura: dormant fallback for sleep, readiness, HRV, resting heart rate, and temperature deviation.
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

## Current Web Shell

The web homepage is a lightweight Health OS control surface for James and future agents. It is not
the primary mobile UI yet. Its job is to make the current state obvious: today's sample body mode,
source coverage, meal/weight capture path, OpenClaw route status, and Apple Watch / smart-scale
readiness.
