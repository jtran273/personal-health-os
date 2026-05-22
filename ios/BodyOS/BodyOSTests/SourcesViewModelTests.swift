import XCTest
@testable import BodyOS

final class SourcesViewModelTests: XCTestCase {
    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "source.healthKit")
        super.tearDown()
    }

    func testConnectHealthKitAuthorizesSyncsAndMarksConnected() async throws {
        let day = try XCTUnwrap(Calendar.current.date(from: DateComponents(year: 2026, month: 5, day: 21)))
        let syncedEntry = DailyLedgerEntry(
            date: day,
            steps: MetricSample(value: 8_000, source: .appleWatch, confidence: 0.75)
        )
        let authorizer = MockHealthKitAuthorizer()
        let ingestor = MockRecentHealthIngestor(result: syncedEntry)
        let viewModel = SourcesViewModel(healthKitService: authorizer, healthKitIngestor: ingestor)

        await viewModel.connectHealthKit()

        XCTAssertTrue(authorizer.didRequestAuthorization)
        XCTAssertEqual(ingestor.requestedDays, 7)
        XCTAssertEqual(viewModel.healthKitStatus, .connected)
        XCTAssertEqual(viewModel.healthKitMessage, "Synced just now")
        XCTAssertTrue(UserDefaults.standard.bool(forKey: "source.healthKit"))
        XCTAssertEqual(viewModel.weeklyCoverage, 76)
        XCTAssertEqual(viewModel.coverageSentence, "Sleep, recovery, movement, and weight routes are ready when data exists.")
    }

    func testConnectHealthKitFailureKeepsSourceAvailable() async {
        let authorizer = MockHealthKitAuthorizer(error: StubHealthKitError.denied)
        let ingestor = MockRecentHealthIngestor(result: nil)
        let viewModel = SourcesViewModel(healthKitService: authorizer, healthKitIngestor: ingestor)

        await viewModel.connectHealthKit()

        XCTAssertTrue(authorizer.didRequestAuthorization)
        XCTAssertNil(ingestor.requestedDays)
        XCTAssertEqual(viewModel.healthKitStatus, .available)
        XCTAssertEqual(viewModel.healthKitMessage, StubHealthKitError.denied.localizedDescription)
        XCTAssertFalse(UserDefaults.standard.bool(forKey: "source.healthKit"))
    }

    func testConnectHealthKitWithNoSamplesDoesNotReportFullCoverage() async {
        let authorizer = MockHealthKitAuthorizer()
        let ingestor = MockRecentHealthIngestor(result: nil)
        let viewModel = SourcesViewModel(healthKitService: authorizer, healthKitIngestor: ingestor)

        await viewModel.connectHealthKit()

        XCTAssertEqual(viewModel.healthKitStatus, .connectedNoData)
        XCTAssertEqual(viewModel.healthKitMessage, "Permission set; no recent Apple Health samples")
        XCTAssertTrue(UserDefaults.standard.bool(forKey: "source.healthKit"))
        XCTAssertEqual(viewModel.weeklyCoverage, 6)
        XCTAssertEqual(viewModel.coverageSentence, "Apple Health permission is set; waiting for readable Apple Watch samples.")
    }
}

private final class MockHealthKitAuthorizer: HealthKitAuthorizing {
    private let error: Error?
    private(set) var didRequestAuthorization = false

    init(error: Error? = nil) {
        self.error = error
    }

    func requestAuthorization() async throws {
        didRequestAuthorization = true
        if let error {
            throw error
        }
    }
}

private final class MockRecentHealthIngestor: RecentHealthIngesting {
    private let result: DailyLedgerEntry?
    private(set) var requestedDays: Int?

    init(result: DailyLedgerEntry?) {
        self.result = result
    }

    func ingestRecent(days: Int) async throws -> DailyLedgerEntry? {
        requestedDays = days
        return result
    }
}

private enum StubHealthKitError: LocalizedError {
    case denied

    var errorDescription: String? {
        "Health permission denied"
    }
}
