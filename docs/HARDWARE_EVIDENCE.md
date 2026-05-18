# Hardware Evidence

This scorecard keeps device strategy practical. The numbers are useful for choosing source priority, not for making medical claims.

## Wearable Scorecard

| Device / Metric | Evidence Number | Plain-English Read |
| --- | ---: | --- |
| Oura HRV | MAPE 5.96% | Strong enough to prioritize for recovery trend decisions. |
| Oura resting heart rate | CCC 0.98 | Very strong agreement; good default for RHR. |
| Apple Watch active heart rate | 86.3% | Useful for workouts and active periods. |
| Apple Watch SpO2 | MAE 2.2% | Reasonable consumer signal, not a diagnostic source. |
| Apple Watch step count | 81.1% | Good enough for daily activity trend. |
| Garmin step count | 82.6% | Good enough for daily activity trend. |
| Garmin Fenix VO2 | MAPE 7.05% | Useful fitness trend estimate. |
| Apple Watch calories | 71% | Weak for precise calorie decisions. Use only as a rough prior. |
| Fitbit calories | 65.6% | Weak for precise calorie decisions. Use only as a rough prior. |
| Garmin calories | 48% | Very weak for precise calorie decisions. Use only as a rough prior. |

## Product Implications

- Prioritize Oura for sleep, HRV, resting heart rate, readiness, and temperature deviation.
- Use Apple Watch, Garmin, or HealthKit bridge for movement, steps, and workouts.
- Use a smart scale or manual weight prompt as the anchor for body composition direction.
- Treat calories burned as a recalibrated estimate, not truth.
- Keep source confidence visible in the domain model so later UI can explain uncertainty without clutter.
