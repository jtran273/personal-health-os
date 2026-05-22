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
        XCTAssertEqual(viewModel.modeHeadline, "Waiting for Health data.")
        XCTAssertEqual(viewModel.oneAction.title, "Refresh Apple Health.")
        XCTAssertEqual(viewModel.footerText, "No live Apple Health samples in today's ledger yet. Pull to refresh after Apple Watch syncs.")
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
