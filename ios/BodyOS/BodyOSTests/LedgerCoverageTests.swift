import XCTest
@testable import BodyOS

final class LedgerCoverageTests: XCTestCase {
    func testScoreUsesAppleWatchMVPSignalSet() {
        let now = Date()
        let entry = DailyLedgerEntry(
            date: now,
            sleep: SleepRecovery(
                date: now,
                totalSleepMinutes: MetricSample(value: 420, source: .appleWatch, confidence: 0.75),
                hrv: MetricSample(value: 38, source: .appleWatch, confidence: 0.7),
                restingHR: MetricSample(value: 56, source: .appleWatch, confidence: 0.75)
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
        )

        XCTAssertEqual(LedgerCoverage.score(for: entry), 1.0)
    }

    func testScoreDoesNotRequireOuraOnlyReadinessForFullCoverage() {
        let now = Date()
        let entry = DailyLedgerEntry(
            date: now,
            sleep: SleepRecovery(
                date: now,
                totalSleepMinutes: MetricSample(value: 420, source: .appleWatch, confidence: 0.75),
                hrv: MetricSample(value: 38, source: .appleWatch, confidence: 0.7),
                restingHR: MetricSample(value: 56, source: .appleWatch, confidence: 0.75),
                readinessScore: nil
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
        )

        XCTAssertEqual(LedgerCoverage.score(for: entry), 1.0)
    }
}
