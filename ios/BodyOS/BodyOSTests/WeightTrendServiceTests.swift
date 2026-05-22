import XCTest
@testable import BodyOS

final class WeightTrendServiceTests: XCTestCase {
    func testComputesSevenFourteenAndTwentyEightDayTrends() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let entries = [
            entry(daysAgo: 27, kg: 84.0, calendar: calendar, today: today),
            entry(daysAgo: 13, kg: 83.0, calendar: calendar, today: today),
            entry(daysAgo: 6, kg: 82.2, calendar: calendar, today: today),
            entry(daysAgo: 0, kg: 81.8, calendar: calendar, today: today)
        ]

        let trends = WeightTrendService(calendar: calendar).trends(entries: entries)

        XCTAssertEqual(trends.map(\.windowDays), [7, 14, 28])
        XCTAssertEqual(trends[0].sampleCount, 2)
        XCTAssertEqual(trends[0].changeKg ?? 0, -0.4, accuracy: 0.001)
        XCTAssertEqual(trends[1].sampleCount, 3)
        XCTAssertEqual(trends[1].changeKg ?? 0, -1.2, accuracy: 0.001)
        XCTAssertEqual(trends[2].sampleCount, 4)
        XCTAssertEqual(trends[2].changeKg ?? 0, -2.2, accuracy: 0.001)
    }

    func testFlagsInsufficientWeightData() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let entries = [entry(daysAgo: 0, kg: 82.0, calendar: calendar, today: today)]

        let trend = WeightTrendService(calendar: calendar).trend(entries: entries, windowDays: 7)

        XCTAssertEqual(trend.status, .insufficientData(required: 2, actual: 1))
        XCTAssertNil(trend.changeKg)
    }

    func testCalibrationComparesEstimatedDeficitToScaleTrend() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let entries = [
            entry(daysAgo: 6, kg: 82.0, deficit: 500, calendar: calendar, today: today),
            entry(daysAgo: 3, kg: 81.7, deficit: 500, calendar: calendar, today: today),
            entry(daysAgo: 0, kg: 81.5, deficit: 500, calendar: calendar, today: today)
        ]

        let calibration = WeightTrendService(calendar: calendar).calibration(entries: entries, windowDays: 7)

        XCTAssertEqual(calibration.status, .ready)
        XCTAssertEqual(calibration.avgEstimatedDeficit, 500)
        XCTAssertEqual(calibration.observedDeficitKcalPerDay, 643)
        XCTAssertEqual(calibration.correctionKcalPerDay, 143)
    }

    func testSmartScaleWeightEntryUsesScaleSourceAndHighConfidence() {
        let now = Date()
        let entry = WeightService().logSmartScaleWeight(kg: 82.0, date: now, bodyFatPct: 18.5)

        XCTAssertEqual(entry.source, .smartScale)
        XCTAssertEqual(entry.confidence, WeightService.smartScaleConfidence)
        XCTAssertEqual(entry.bodyFatPct, 18.5)
    }

    private func entry(
        daysAgo: Int,
        kg: Double,
        deficit: Int? = nil,
        calendar: Calendar,
        today: Date
    ) -> DailyLedgerEntry {
        let date = calendar.date(byAdding: .day, value: -daysAgo, to: today) ?? today
        return DailyLedgerEntry(
            date: date,
            weight: WeightEntry(date: date, weightKg: kg, source: .manual, confidence: 0.95),
            estimatedDeficit: deficit
        )
    }
}
