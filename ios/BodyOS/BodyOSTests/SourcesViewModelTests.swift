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
            steps: MetricSample(value: 8_000, source: .appleWatch, confidence: 0.75),
            coverageScore: 0.2
        )
        let store = InMemoryLedgerStore()
        await store.upsert(syncedEntry)
        let authorizer = MockHealthKitAuthorizer()
        let ingestor = MockRecentHealthIngestor(result: syncedEntry)
        let viewModel = SourcesViewModel(healthKitService: authorizer, healthKitIngestor: ingestor, store: store)

        await viewModel.connectHealthKit()

        XCTAssertTrue(authorizer.didRequestAuthorization)
        XCTAssertEqual(ingestor.requestedDays, 7)
        XCTAssertEqual(viewModel.healthKitStatus, .connected)
        XCTAssertEqual(viewModel.healthKitMessage, "Synced just now")
        XCTAssertTrue(UserDefaults.standard.bool(forKey: "source.healthKit"))
        XCTAssertEqual(viewModel.weeklyCoverage, 20)
        XCTAssertEqual(viewModel.coverageSentence, "Recent ledger rows are present. Check Today and Body for source, freshness, and confidence per metric.")
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
        XCTAssertEqual(viewModel.weeklyCoverage, 0)
        XCTAssertEqual(viewModel.coverageSentence, "Apple Health permission is set; waiting for readable Apple Watch samples.")
    }

    func testAppleHealthPilotChecklistDistinguishesMissingLiveSampleAndOuraFallback() async throws {
        let day = try XCTUnwrap(Calendar.current.date(from: DateComponents(year: 2026, month: 5, day: 21)))
        let syncedEntry = DailyLedgerEntry(
            date: day,
            steps: MetricSample(value: 8_000, source: .appleWatch, confidence: 0.75)
        )
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: syncedEntry)
        )

        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Health permissions" })?.status, .missing)

        await viewModel.connectHealthKit()

        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Health permissions" })?.status, .granted)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Data freshness" })?.status, .live)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Apple Watch source" })?.status, .live)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Sample/dev data" })?.status, .sample)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Oura fallback" })?.status, .dormant)
    }

    func testRefreshWithPermissionButEmptyLedgerShowsConnectedNoData() async {
        UserDefaults.standard.set(true, forKey: "source.healthKit")
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            store: InMemoryLedgerStore()
        )

        await viewModel.refresh()

        XCTAssertEqual(viewModel.healthKitStatus, .connectedNoData)
        XCTAssertEqual(viewModel.weeklyCoverage, 0)
        XCTAssertEqual(viewModel.coverageSentence, "Apple Health permission is set; waiting for readable Apple Watch samples.")
    }

    func testRefreshWithOnlyManualLedgerRowsDoesNotClaimAppleHealthIsLive() async throws {
        UserDefaults.standard.set(true, forKey: "source.healthKit")
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        await store.upsert(DailyLedgerEntry(
            date: today,
            weight: WeightEntry(date: today, weightKg: 82.0, source: .manual),
            meals: [
                Meal(
                    loggedAt: today,
                    description: "Manual dinner",
                    estimatedCalories: MetricSample(value: 700, source: .manual, confidence: 0.9)
                )
            ],
            coverageScore: 0.28
        ))
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            store: store
        )

        await viewModel.refresh()

        XCTAssertEqual(viewModel.healthKitStatus, .connectedNoData)
        XCTAssertEqual(viewModel.weeklyCoverage, 0)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Data freshness" })?.status, .waiting)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Apple Watch source" })?.status, .waiting)
    }

    func testConnectHealthKitWithNoSamplesKeepsNoDataEvenWhenManualRowsExist() async throws {
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        await store.upsert(DailyLedgerEntry(
            date: today,
            weight: WeightEntry(date: today, weightKg: 82.0, source: .manual),
            coverageScore: 0.14
        ))
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            store: store
        )

        await viewModel.connectHealthKit()

        XCTAssertEqual(viewModel.healthKitStatus, .connectedNoData)
        XCTAssertEqual(viewModel.healthKitMessage, "Permission set; no recent Apple Health samples")
        XCTAssertEqual(viewModel.weeklyCoverage, 0)
    }

    func testAppleWatchChecklistDoesNotGoLiveForIPhoneOnlyHealthKitRows() async throws {
        UserDefaults.standard.set(true, forKey: "source.healthKit")
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        await store.upsert(DailyLedgerEntry(
            date: today,
            steps: MetricSample(value: 2_000, source: .iphone, confidence: 0.55),
            coverageScore: 0.14
        ))
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            store: store
        )

        await viewModel.refresh()

        XCTAssertEqual(viewModel.healthKitStatus, .connected)
        XCTAssertEqual(viewModel.weeklyCoverage, 14)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Data freshness" })?.status, .live)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Apple Watch source" })?.status, .waiting)
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
