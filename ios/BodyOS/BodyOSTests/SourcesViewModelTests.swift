import XCTest
@testable import BodyOS

final class SourcesViewModelTests: XCTestCase {
    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "source.healthKit")
        super.tearDown()
    }

    func testConnectHealthKitAuthorizesButWaitsForReadableBridgeData() async throws {
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
        XCTAssertEqual(viewModel.healthKitStatus, .connectedNoData)
        XCTAssertEqual(viewModel.healthKitMessage, "Connected; waiting for data")
        XCTAssertTrue(UserDefaults.standard.bool(forKey: "source.healthKit"))
        XCTAssertEqual(viewModel.weeklyCoverage, 0)
        XCTAssertEqual(viewModel.coverageSentence, "Apple Health is connected. Waiting for fresh bridge data.")
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
        XCTAssertEqual(viewModel.healthKitMessage, "Connected; waiting for data")
        XCTAssertTrue(UserDefaults.standard.bool(forKey: "source.healthKit"))
        XCTAssertEqual(viewModel.weeklyCoverage, 0)
        XCTAssertEqual(viewModel.coverageSentence, "Apple Health is connected. Waiting for fresh bridge data.")
    }

    func testSourceChecklistDistinguishesBridgeFreshnessAndOuraPrimary() async throws {
        let day = try XCTUnwrap(Calendar.current.date(from: DateComponents(year: 2026, month: 5, day: 21)))
        let syncedEntry = DailyLedgerEntry(
            date: day,
            steps: MetricSample(value: 8_000, source: .appleWatch, confidence: 0.75)
        )
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: syncedEntry),
            isOuraTokenConfigured: { false }
        )

        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Apple Health bridge" })?.status, .missing)

        await viewModel.connectHealthKit()

        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Apple Health bridge" })?.status, .granted)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Data freshness" })?.status, .live)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Dedupe" })?.status, .live)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Sample/dev data" })?.status, .sample)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Oura" })?.status, .missing)
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
        XCTAssertEqual(viewModel.coverageSentence, "Apple Health is connected. Waiting for fresh bridge data.")
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
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Dedupe" })?.status, .waiting)
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
        XCTAssertEqual(viewModel.healthKitMessage, "Connected; waiting for data")
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
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Dedupe" })?.status, .waiting)
    }

    func testRefreshSkipsOuraIngestWhenNoTokenIsConfigured() async {
        let ouraIngestor = MockRecentOuraIngestor(result: nil)
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            ouraIngestor: ouraIngestor,
            store: InMemoryLedgerStore(),
            isOuraTokenConfigured: { false }
        )

        await viewModel.refresh()

        XCTAssertNil(ouraIngestor.requestedDays)
        XCTAssertEqual(viewModel.ouraStatus, .available)
        XCTAssertEqual(viewModel.availableSources.first(where: { $0.id == "oura" })?.subline, "Connect Oura")
    }

    func testRefreshWithTokenButNoRingDataYetShowsConnectedWaitingNotError() async {
        let ouraIngestor = MockRecentOuraIngestor(result: nil)
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            ouraIngestor: ouraIngestor,
            store: InMemoryLedgerStore(),
            isOuraTokenConfigured: { true }
        )

        await viewModel.refresh()

        XCTAssertEqual(ouraIngestor.requestedDays, 7)
        XCTAssertEqual(viewModel.ouraStatus, .connectedNoData)
        XCTAssertNil(viewModel.ouraMessage)
        let ouraCard = viewModel.pendingSources.first(where: { $0.id == "oura" })
        XCTAssertEqual(ouraCard?.subline, "Connected; waiting for first night of data")
        XCTAssertEqual(ouraCard?.coverage, 0)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Oura" })?.status, .waiting)
    }

    func testRefreshWithOuraLedgerDataShowsConnected() async throws {
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        let ouraEntry = DailyLedgerEntry(
            date: today,
            sleep: SleepRecovery(
                date: today,
                totalSleepMinutes: MetricSample(value: 432, source: .oura, confidence: 0.85)
            ),
            coverageScore: 0.2
        )
        await store.upsert(ouraEntry)
        let ouraIngestor = MockRecentOuraIngestor(result: ouraEntry)
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            ouraIngestor: ouraIngestor,
            store: store,
            isOuraTokenConfigured: { true }
        )

        await viewModel.refresh()

        XCTAssertEqual(viewModel.ouraStatus, .connected)
        let ouraCard = viewModel.connectedSources.first(where: { $0.id == "oura" })
        XCTAssertEqual(ouraCard?.subline, "Primary recovery source")
        XCTAssertEqual(try XCTUnwrap(ouraCard?.coverage), 1.0 / 7.0, accuracy: 0.001)
        XCTAssertEqual(viewModel.appleHealthPilotRows.first(where: { $0.title == "Oura" })?.status, .live)
    }

    func testSyncOuraFailureSurfacesErrorWithoutFakingConnection() async {
        let ouraIngestor = MockRecentOuraIngestor(error: StubOuraError.unreachable)
        let viewModel = SourcesViewModel(
            healthKitService: MockHealthKitAuthorizer(),
            healthKitIngestor: MockRecentHealthIngestor(result: nil),
            ouraIngestor: ouraIngestor,
            store: InMemoryLedgerStore(),
            isOuraTokenConfigured: { true }
        )

        await viewModel.syncOura()

        XCTAssertEqual(viewModel.ouraStatus, .connectedNoData)
        XCTAssertEqual(viewModel.ouraMessage, "Sync failed. Oura unreachable")
        XCTAssertEqual(viewModel.pendingSources.first(where: { $0.id == "oura" })?.subline, "Sync failed. Oura unreachable")
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

private final class MockRecentOuraIngestor: RecentOuraIngesting {
    private let result: DailyLedgerEntry?
    private let error: Error?
    private(set) var requestedDays: Int?

    init(result: DailyLedgerEntry? = nil, error: Error? = nil) {
        self.result = result
        self.error = error
    }

    func ingestRecent(days: Int) async throws -> DailyLedgerEntry? {
        requestedDays = days
        if let error {
            throw error
        }
        return result
    }
}

private enum StubHealthKitError: LocalizedError {
    case denied

    var errorDescription: String? {
        "Health permission denied"
    }
}

private enum StubOuraError: LocalizedError {
    case unreachable

    var errorDescription: String? {
        "Oura unreachable"
    }
}
