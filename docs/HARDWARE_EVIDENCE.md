# Hardware Evidence

This scorecard keeps device strategy practical. The numbers are useful for choosing source priority, not for making medical claims.

## Wearable Scorecard

| Device / Metric | Evidence Number | Plain-English Read |
| --- | ---: | --- |
| Oura HRV | MAPE 5.96% | Strong fallback evidence if Oura is explicitly re-enabled. |
| Oura resting heart rate | CCC 0.98 | Very strong agreement; useful fallback for RHR if the ring returns. |
| Apple Watch active heart rate | 86.3% | Useful for workouts and active periods. |
| Apple Watch SpO2 | MAE 2.2% | Reasonable consumer signal, not a diagnostic source. |
| Apple Watch step count | 81.1% | Good enough for daily activity trend. |
| Garmin step count | 82.6% | Good enough for daily activity trend. |
| Garmin Fenix VO2 | MAPE 7.05% | Useful fitness trend estimate. |
| Apple Watch calories | 71% | Weak for precise calorie decisions. Use only as a rough prior. |
| Fitbit calories | 65.6% | Weak for precise calorie decisions. Use only as a rough prior. |
| Garmin calories | 48% | Very weak for precise calorie decisions. Use only as a rough prior. |

## Product Implications

- During James's 14-day Apple Watch trial, prioritize Apple Watch / Apple Health for sleep, HRV, resting heart rate, steps, active energy, and workouts.
- Keep Oura dormant. A saved token is not permission to auto-ingest; use it only as an explicitly enabled fallback.
- Use a smart scale or manual/OpenClaw weight prompt as the anchor for body composition direction, with Apple Health body-mass samples accepted when present.
- Treat calories burned as a recalibrated estimate, not truth.
- Keep source confidence visible in the domain model so later UI can explain uncertainty without clutter.
