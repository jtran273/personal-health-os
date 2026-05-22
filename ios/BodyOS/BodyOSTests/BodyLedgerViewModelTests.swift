import XCTest
@testable import BodyOS

final class BodyLedgerViewModelTests: XCTestCase {
    func testCoverageSentenceIncludesRecoveryMetricGaps() async {
        let store = InMemoryLedgerStore()
        let now = Date()
        let entry = DailyLedgerEntry(
            date: now,
            sleep: SleepRecovery(
                date: now,
                totalSleepMinutes: MetricSample(value: 420, source: .appleWatch, confidence: 0.75)
            ),
            weight: WeightEntry(date: now, weightKg: 82, source: .manual),
            steps: MetricSample(value: 8_200, source: .appleWatch, confidence: 0.75),
            activeCalories: MetricSample(value: 460, source: .appleWatch, confidence: 0.45),
            meals: [
                Meal(
                    loggedAt: now,
                    description: "Dinner",
                    estimatedCalories: MetricSample(value: 700, source: .manual, confidence: 0.95)
                )
            ],
            coverageScore: LedgerCoverage.score(for: DailyLedgerEntry(
                date: now,
                sleep: SleepRecovery(
                    date: now,
                    totalSleepMinutes: MetricSample(value: 420, source: .appleWatch, confidence: 0.75)
                ),
                weight: WeightEntry(date: now, weightKg: 82, source: .manual),
                steps: MetricSample(value: 8_200, source: .appleWatch, confidence: 0.75),
                activeCalories: MetricSample(value: 460, source: .appleWatch, confidence: 0.45),
                meals: [
                    Meal(
                        loggedAt: now,
                        description: "Dinner",
                        estimatedCalories: MetricSample(value: 700, source: .manual, confidence: 0.95)
                    )
                ]
            ))
        )
        await store.upsert(entry)

        let viewModel = BodyLedgerViewModel(store: store)
        await viewModel.refreshFromStore(selectingToday: true)

        XCTAssertEqual(viewModel.coveragePercent, 71)
        XCTAssertEqual(viewModel.coverageSentence, "Missing HRV + resting HR.")
    }
}
