import XCTest
@testable import BodyOS

final class HealthKitIngestorTests: XCTestCase {
    func testIngestMergesAppleHealthMetricsAndRecomputesDerivedFields() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 21)))
        let existingMeal = Meal(
            loggedAt: day,
            description: "Chicken bowl",
            estimatedCalories: MetricSample(value: 650, source: .manual, confidence: 0.95)
        )
        await store.upsert(DailyLedgerEntry(date: day, meals: [existingMeal]))

        let sleep = SleepRecovery(
            date: day,
            totalSleepMinutes: MetricSample(value: 430, source: .appleWatch, confidence: 0.75),
            hrv: MetricSample(value: 42.5, source: .appleWatch, confidence: 0.7),
            restingHR: MetricSample(value: 54, source: .appleWatch, confidence: 0.75)
        )
        let weight = WeightEntry(date: day, weightKg: 81.2, source: .iphone, confidence: 0.8)
        let healthKit = MockHealthKitReader(
            sleep: sleep,
            steps: 9_876,
            activeEnergy: 540,
            weight: weight
        )

        let result = try await HealthKitIngestor(healthKit: healthKit, store: store).ingest(date: day)

        XCTAssertEqual(result?.sleep, sleep)
        XCTAssertEqual(result?.steps?.value, 9_876)
        XCTAssertEqual(result?.steps?.source, .appleWatch)
        XCTAssertEqual(result?.activeCalories?.value, 540)
        XCTAssertEqual(result?.activeCalories?.source, .appleWatch)
        XCTAssertEqual(result?.weight, weight)
        XCTAssertEqual(result?.meals, [existingMeal])
        XCTAssertEqual(result?.estimatedDeficit, 1_590)
        XCTAssertEqual(result?.bodyMode, .green)
        XCTAssertEqual(result?.coverageScore, 1.0)

        let saved = await store.entry(for: day)
        XCTAssertEqual(saved, result)
    }

    func testIngestReturnsNilAndDoesNotCreateEntryWhenHealthKitHasNoData() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 21)))
        let healthKit = MockHealthKitReader()

        let result = try await HealthKitIngestor(healthKit: healthKit, store: store).ingest(date: day)

        XCTAssertNil(result)
        let saved = await store.entry(for: day)
        XCTAssertNil(saved)
    }

    func testHealthKitWeightDoesNotOverwriteManualWeight() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 21)))
        let manualWeight = WeightEntry(date: day, weightKg: 82.0, source: .manual, confidence: 0.9)
        await store.upsert(DailyLedgerEntry(date: day, weight: manualWeight))
        let healthWeight = WeightEntry(date: day, weightKg: 81.5, source: .iphone, confidence: 0.8)
        let healthKit = MockHealthKitReader(weight: healthWeight)

        let result = try await HealthKitIngestor(healthKit: healthKit, store: store).ingest(date: day)

        XCTAssertEqual(result?.weight, manualWeight)
    }
}

private struct MockHealthKitReader: HealthKitReading {
    var sleep: SleepRecovery?
    var steps: Int?
    var activeEnergy: Int?
    var weight: WeightEntry?

    func fetchSleepRecovery(for date: Date) async throws -> SleepRecovery? {
        sleep
    }

    func fetchSteps(for date: Date) async throws -> Int? {
        steps
    }

    func fetchActiveEnergy(for date: Date) async throws -> Int? {
        activeEnergy
    }

    func fetchWeight(for date: Date) async throws -> WeightEntry? {
        weight
    }
}
