import XCTest
@testable import BodyOS

final class DeficitEstimatorTests: XCTestCase {
    func testEstimateDeficitUsesBMRPlusActiveCaloriesMinusMeals() {
        let now = Date()
        let meal = Meal(
            loggedAt: now,
            description: "breakfast",
            estimatedCalories: MetricSample(value: 500, source: .mealPhoto, confidence: 0.55, capturedAt: now)
        )
        let entry = DailyLedgerEntry(
            date: now,
            activeCalories: MetricSample(value: 300, source: .iphone, confidence: 0.45, capturedAt: now),
            meals: [meal]
        )

        XCTAssertEqual(DeficitEstimator().estimateDeficit(entry: entry, bmrEstimate: 1700), 1500)
    }

    func testEstimateDeficitReturnsNilWithoutActiveCaloriesOrMeals() {
        let estimator = DeficitEstimator()
        let now = Date()
        let activeOnly = DailyLedgerEntry(
            date: now,
            activeCalories: MetricSample(value: 300, source: .iphone, confidence: 0.45, capturedAt: now)
        )
        let mealOnly = DailyLedgerEntry(
            date: now,
            meals: [
                Meal(
                    loggedAt: now,
                    description: "lunch",
                    estimatedCalories: MetricSample(value: 700, source: .mealPhoto, confidence: 0.55, capturedAt: now)
                )
            ]
        )

        XCTAssertNil(estimator.estimateDeficit(entry: activeOnly, bmrEstimate: 1700))
        XCTAssertNil(estimator.estimateDeficit(entry: mealOnly, bmrEstimate: 1700))
    }
}
