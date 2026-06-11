import XCTest
@testable import BodyOS

final class TodayViewModelTests: XCTestCase {
    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "source.healthKit")
        super.tearDown()
    }

    func testLoadDoesNotShowOlderLedgerEntryAsTodayWhenCurrentHealthKitHasNoData() async throws {
        let store = InMemoryLedgerStore()
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let yesterday = try XCTUnwrap(calendar.date(byAdding: .day, value: -1, to: today))
        await store.upsert(DailyLedgerEntry(
            date: yesterday,
            steps: MetricSample(value: 12_345, source: .appleWatch, confidence: 0.75, capturedAt: yesterday),
            coverageScore: 0.25
        ))

        UserDefaults.standard.set(true, forKey: "source.healthKit")

        let viewModel = TodayViewModel(store: store, healthKitIngestor: MockRecentHealthIngestor(entry: nil))
        await viewModel.load()

        XCTAssertNil(viewModel.entry)
        XCTAssertEqual(viewModel.recentEntries.first?.steps?.value, 12_345)
        XCTAssertEqual(viewModel.modeHeadline, "Set up sources.")
        XCTAssertEqual(viewModel.oneAction.title, "Refresh sources.")
        XCTAssertEqual(viewModel.footerText, "No fresh source data yet. Pull to refresh.")
    }

    func testLoadShowsTodayEntryAfterHealthKitIngestWritesCurrentSteps() async throws {
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        let currentEntry = DailyLedgerEntry(
            date: today,
            steps: MetricSample(value: 4_321, source: .appleWatch, confidence: 0.75, capturedAt: Date()),
            coverageScore: 0.25
        )

        UserDefaults.standard.set(true, forKey: "source.healthKit")

        let viewModel = TodayViewModel(store: store, healthKitIngestor: MockRecentHealthIngestor(entry: currentEntry, store: store))
        await viewModel.load()

        XCTAssertEqual(viewModel.entry?.steps?.value, 4_321)
        XCTAssertEqual(viewModel.entry?.steps?.source, .appleWatch)
    }

    func testLoadIngestsOuraWhenTokenIsConfigured() async throws {
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        let ouraEntry = DailyLedgerEntry(
            date: today,
            sleep: SleepRecovery(
                date: today,
                totalSleepMinutes: MetricSample(value: 432, source: .oura, confidence: 0.85),
                readinessScore: MetricSample(value: 81, source: .oura, confidence: 0.8)
            ),
            coverageScore: 0.2
        )
        let ouraIngestor = MockRecentOuraIngestor(entry: ouraEntry, store: store)

        let viewModel = TodayViewModel(
            store: store,
            ouraIngestor: ouraIngestor,
            isOuraTokenConfigured: { true }
        )
        await viewModel.load()

        XCTAssertEqual(ouraIngestor.requestedDays, 7)
        XCTAssertEqual(viewModel.entry?.sleep?.totalSleepMinutes?.source, .oura)
        XCTAssertEqual(viewModel.entry?.sleep?.readinessScore?.value, 81)
        XCTAssertNil(viewModel.lastSyncError)
    }

    func testLoadSkipsOuraWithoutToken() async {
        let store = InMemoryLedgerStore()
        let ouraIngestor = MockRecentOuraIngestor(entry: nil, store: nil)

        let viewModel = TodayViewModel(
            store: store,
            ouraIngestor: ouraIngestor,
            isOuraTokenConfigured: { false }
        )
        await viewModel.load()

        XCTAssertNil(ouraIngestor.requestedDays)
        XCTAssertNil(viewModel.entry)
        XCTAssertNil(viewModel.lastSyncError)
    }

    func testLoadWithTokenButEmptyRingShowsSetupNotError() async {
        let store = InMemoryLedgerStore()
        let ouraIngestor = MockRecentOuraIngestor(entry: nil, store: nil)

        let viewModel = TodayViewModel(
            store: store,
            ouraIngestor: ouraIngestor,
            isOuraTokenConfigured: { true }
        )
        await viewModel.load()

        XCTAssertEqual(ouraIngestor.requestedDays, 7)
        XCTAssertNil(viewModel.entry)
        XCTAssertNil(viewModel.lastSyncError)
        XCTAssertEqual(viewModel.modeHeadline, "Set up sources.")
    }
}

private final class MockRecentOuraIngestor: RecentOuraIngesting {
    private let entry: DailyLedgerEntry?
    private let store: (any LedgerStore)?
    private(set) var requestedDays: Int?

    init(entry: DailyLedgerEntry?, store: (any LedgerStore)?) {
        self.entry = entry
        self.store = store
    }

    func ingestRecent(days: Int) async throws -> DailyLedgerEntry? {
        requestedDays = days
        if let entry, let store {
            await store.upsert(entry)
        }
        return entry
    }
}

private struct MockRecentHealthIngestor: RecentHealthIngesting {
    var entry: DailyLedgerEntry?
    var store: (any LedgerStore)?

    func ingestRecent(days: Int) async throws -> DailyLedgerEntry? {
        if let entry, let store {
            await store.upsert(entry)
        }
        return entry
    }
}
