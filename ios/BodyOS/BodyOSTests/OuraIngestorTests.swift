import XCTest
@testable import BodyOS

final class OuraIngestorTests: XCTestCase {
    func testOuraWinsRecoveryMetricsOverAppleWatch() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 6, day: 11)))
        let appleSleep = SleepRecovery(
            date: day,
            totalSleepMinutes: MetricSample(value: 410, source: .appleWatch, confidence: 0.75),
            hrv: MetricSample(value: 38.0, source: .appleWatch, confidence: 0.7),
            restingHR: MetricSample(value: 58, source: .appleWatch, confidence: 0.75)
        )
        await store.upsert(DailyLedgerEntry(
            date: day,
            sleep: appleSleep,
            steps: MetricSample(value: 9_500, source: .appleWatch, confidence: 0.75),
            activeCalories: MetricSample(value: 520, source: .appleWatch, confidence: 0.45)
        ))

        let ouraSleep = SleepRecovery(
            date: day,
            totalSleepMinutes: MetricSample(value: 432, source: .oura, confidence: 0.85),
            hrv: MetricSample(value: 44.0, source: .oura, confidence: 0.9),
            restingHR: MetricSample(value: 52, source: .oura, confidence: 0.95),
            readinessScore: MetricSample(value: 81, source: .oura, confidence: 0.8)
        )
        let oura = MockOuraReader(sleep: ouraSleep, activity: (steps: 7_000, activeCalories: 300))

        let result = try await OuraIngestor(oura: oura, store: store).ingest(date: day)

        // Oura wins every sleep/recovery field.
        XCTAssertEqual(result?.sleep?.totalSleepMinutes?.value, 432)
        XCTAssertEqual(result?.sleep?.totalSleepMinutes?.source, .oura)
        XCTAssertEqual(result?.sleep?.hrv?.source, .oura)
        XCTAssertEqual(result?.sleep?.restingHR?.value, 52)
        XCTAssertEqual(result?.sleep?.restingHR?.source, .oura)
        XCTAssertEqual(result?.sleep?.readinessScore?.value, 81)
        // Apple Health wins movement: Oura steps/calories must not clobber it.
        XCTAssertEqual(result?.steps?.value, 9_500)
        XCTAssertEqual(result?.steps?.source, .appleWatch)
        XCTAssertEqual(result?.activeCalories?.value, 520)
        XCTAssertEqual(result?.activeCalories?.source, .appleWatch)

        let saved = await store.entry(for: day)
        XCTAssertEqual(saved, result)
    }

    func testIngestReturnsNilAndDoesNotCreateEntryWhenOuraHasNoDataYet() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 6, day: 11)))
        let oura = MockOuraReader()

        let result = try await OuraIngestor(oura: oura, store: store).ingest(date: day)

        XCTAssertNil(result)
        let saved = await store.entry(for: day)
        XCTAssertNil(saved)
    }

    func testIngestRecentWithEmptyRingReturnsNilForEveryDay() async throws {
        let store = InMemoryLedgerStore()
        let oura = MockOuraReader()

        let result = try await OuraIngestor(oura: oura, store: store).ingestRecent(days: 7)

        XCTAssertNil(result)
        let entries = await store.recentEntries(days: 7)
        XCTAssertTrue(entries.isEmpty)
    }

    func testOuraMovementOnlyFillsDaysWithNoHigherPrecedenceMovement() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 6, day: 11)))
        let oura = MockOuraReader(activity: (steps: 6_200, activeCalories: 280))

        let result = try await OuraIngestor(oura: oura, store: store).ingest(date: day)

        XCTAssertEqual(result?.steps?.value, 6_200)
        XCTAssertEqual(result?.steps?.source, .oura)
        XCTAssertEqual(result?.activeCalories?.value, 280)
        XCTAssertEqual(result?.activeCalories?.source, .oura)
    }

    func testOuraIngestDoesNotTouchWeightOrMeals() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 6, day: 11)))
        let manualWeight = WeightEntry(date: day, weightKg: 82.0, source: .manual, confidence: 0.9)
        let meal = Meal(
            loggedAt: day,
            description: "Chicken bowl",
            estimatedCalories: MetricSample(value: 650, source: .manual, confidence: 0.95)
        )
        await store.upsert(DailyLedgerEntry(date: day, weight: manualWeight, meals: [meal]))
        let ouraSleep = SleepRecovery(
            date: day,
            totalSleepMinutes: MetricSample(value: 420, source: .oura, confidence: 0.85)
        )
        let oura = MockOuraReader(sleep: ouraSleep)

        let result = try await OuraIngestor(oura: oura, store: store).ingest(date: day)

        XCTAssertEqual(result?.weight, manualWeight)
        XCTAssertEqual(result?.meals, [meal])
        XCTAssertEqual(result?.sleep?.totalSleepMinutes?.source, .oura)
    }
}

private struct MockOuraReader: OuraReading {
    var sleep: SleepRecovery?
    var activity: (steps: Int, activeCalories: Int)?

    func fetchSleep(for date: Date) async throws -> SleepRecovery? {
        sleep
    }

    func fetchActivity(for date: Date) async throws -> (steps: Int, activeCalories: Int)? {
        activity
    }
}
