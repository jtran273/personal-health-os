import Foundation
import Observation

protocol HealthKitAuthorizing {
    func requestAuthorization() async throws
}

protocol RecentHealthIngesting {
    func ingestRecent(days: Int) async throws -> DailyLedgerEntry?
}

/// Oura-specific recent-ingest seam so view models can sync Oura without the concrete service.
protocol RecentOuraIngesting {
    func ingestRecent(days: Int) async throws -> DailyLedgerEntry?
}

extension HealthKitService: HealthKitAuthorizing {}
extension HealthKitIngestor: RecentHealthIngesting {}
extension OuraIngestor: RecentOuraIngesting {}

@Observable
final class SourcesViewModel {
    var isOuraConfigured: Bool
    var ouraStatus: SourceConnectionStatus
    var ouraMessage: String?
    var healthKitStatus: SourceConnectionStatus
    var healthKitMessage: String?
    var recentEntries: [DailyLedgerEntry] = []

    private var sawAppleWatchMetricThisSession = false
    private let healthKitService: any HealthKitAuthorizing
    private let healthKitIngestor: (any RecentHealthIngesting)?
    private let ouraIngestor: (any RecentOuraIngesting)?
    private let store: (any LedgerStore)?
    private let isOuraTokenConfigured: () -> Bool

    init(
        healthKitService: any HealthKitAuthorizing,
        healthKitIngestor: (any RecentHealthIngesting)? = nil,
        ouraIngestor: (any RecentOuraIngesting)? = nil,
        store: (any LedgerStore)? = nil,
        isOuraTokenConfigured: @escaping () -> Bool = { OuraTokenStore.shared.isConfigured }
    ) {
        self.healthKitService = healthKitService
        self.healthKitIngestor = healthKitIngestor
        self.ouraIngestor = ouraIngestor
        self.store = store
        self.isOuraTokenConfigured = isOuraTokenConfigured
        self.isOuraConfigured = isOuraTokenConfigured()
        self.ouraStatus = isOuraTokenConfigured() ? .connectedNoData : .available
        self.healthKitStatus = UserDefaults.standard.bool(forKey: "source.healthKit") ? .connectedNoData : .available
    }

    var weeklyCoverage: Int {
        let healthKitEntries = recentHealthKitEntries
        guard healthKitStatus == .connected, !healthKitEntries.isEmpty else { return 0 }
        let average = healthKitEntries.reduce(0.0) { $0 + $1.coverageScore } / Double(healthKitEntries.count)
        return Int((average * 100).rounded())
    }

    var coverageSentence: String {
        if healthKitStatus == .connectedNoData {
            return "Apple Health is connected. Waiting for fresh bridge data."
        }
        if healthKitStatus != .connected {
            return "Oura recovery, scale weight, meals, and Apple Health gaps."
        }
        return "Recent source rows are in the ledger."
    }

    var connectedSources: [BodySource] {
        sourceCards.filter { $0.status == .connected }
    }

    var pendingSources: [BodySource] {
        sourceCards.filter { $0.status == .pending || $0.status == .connectedNoData }
    }

    var availableSources: [BodySource] {
        sourceCards.filter { $0.status == .available }
    }

    var disabledSources: [BodySource] {
        sourceCards.filter { $0.status == .disabled }
    }

    var routingRows: [MetricRouteRow] {
        [
            MetricRouteRow(metric: "Sleep + recovery", source: "Oura", reason: "primary recovery source"),
            MetricRouteRow(metric: "Movement", source: "Apple Health", reason: "steps, workouts, active energy"),
            MetricRouteRow(metric: "Weight", source: "Scale", reason: "trend anchor for calorie math"),
            MetricRouteRow(metric: "Food", source: "Meals", reason: "calories and protein")
        ]
    }

    var appleHealthPilotRows: [AppleHealthPilotRow] {
        let permissionStatus: AppleHealthPilotRow.Status = switch healthKitStatus {
        case .available, .pending:
            .missing
        case .connectedNoData:
            .requested
        case .connected:
            .granted
        case .disabled:
            .dormant
        }

        let freshnessStatus: AppleHealthPilotRow.Status = switch healthKitStatus {
        case .connected:
            .live
        case .connectedNoData:
            .waiting
        case .pending:
            .checking
        case .available:
            .missing
        case .disabled:
            .dormant
        }

        let appleWatchStatus: AppleHealthPilotRow.Status = hasRecentAppleWatchData ? .live : .waiting

        return [
            AppleHealthPilotRow(
                title: "Apple Health bridge",
                status: permissionStatus,
                detail: "Optional movement and Health app data."
            ),
            AppleHealthPilotRow(
                title: "Data freshness",
                status: freshnessStatus,
                detail: healthKitStatus == .connected ? "Fresh bridge data is in the ledger." : "Connect, then refresh after activity or Health sync."
            ),
            AppleHealthPilotRow(
                title: "Dedupe",
                status: appleWatchStatus,
                detail: "Oura wins recovery. Apple Health fills movement and gaps."
            ),
            AppleHealthPilotRow(
                title: "Sample/dev data",
                status: .sample,
                detail: "Simulator data is demo-only."
            ),
            AppleHealthPilotRow(
                title: "Oura",
                status: ouraPilotStatus,
                detail: ouraPilotDetail
            )
        ]
    }

    private var ouraPilotStatus: AppleHealthPilotRow.Status {
        switch ouraStatus {
        case .connected: return .live
        case .connectedNoData: return .waiting
        case .pending: return .checking
        case .available: return .missing
        case .disabled: return .dormant
        }
    }

    private var ouraPilotDetail: String {
        switch ouraStatus {
        case .connected: return "Primary recovery source connected."
        case .connectedNoData: return "Token works. Waiting for first night of ring data."
        case .pending: return "Syncing Oura."
        case .available: return "Connect Oura for recovery."
        case .disabled: return "Oura is off."
        }
    }

    func connectHealthKit() async {
        healthKitStatus = .pending
        healthKitMessage = "Requesting permission"
        do {
            try await healthKitService.requestAuthorization()
            UserDefaults.standard.set(true, forKey: "source.healthKit")
            healthKitMessage = "Syncing recent data"
            let entry = try await healthKitIngestor?.ingestRecent(days: 7)
            if let entry {
                recentEntries = [entry]
                sawAppleWatchMetricThisSession = entry.hasAppleWatchMetric
            }
            if entry?.hasHealthKitBackedMetric != true {
                healthKitStatus = .connectedNoData
                healthKitMessage = "Connected; waiting for data"
            } else {
                healthKitStatus = .connected
                healthKitMessage = "Synced just now"
            }
            await refresh()
        } catch {
            UserDefaults.standard.set(false, forKey: "source.healthKit")
            healthKitStatus = .available
            healthKitMessage = error.localizedDescription
        }
    }

    /// Re-run the Oura ingest on demand ("Sync now" affordance on the Oura card).
    func syncOura() async {
        await ingestOuraIfConfigured()
        await refreshLedgerSnapshot()
        updateOuraStatusFromLedger()
    }

    func refresh() async {
        await ingestOuraIfConfigured()
        await refreshLedgerSnapshot()
        updateOuraStatusFromLedger()
        guard store != nil else { return }
        guard UserDefaults.standard.bool(forKey: "source.healthKit") else {
            healthKitStatus = .available
            return
        }
        healthKitStatus = hasRecentHealthKitData ? .connected : .connectedNoData
        if healthKitStatus == .connectedNoData {
            healthKitMessage = "Connected; waiting for data"
        } else if healthKitMessage == "Connected; waiting for data" || healthKitMessage == "Syncing recent data" {
            healthKitMessage = "Synced just now"
        }
    }

    /// Ingest recent Oura days when a token exists. No token is a silent no-op (short-circuit),
    /// and a configured token with zero data is "waiting", never an error or a fake value.
    private func ingestOuraIfConfigured() async {
        isOuraConfigured = isOuraTokenConfigured()
        guard isOuraConfigured, let ouraIngestor else { return }
        do {
            _ = try await ouraIngestor.ingestRecent(days: 7)
            ouraMessage = nil
        } catch {
            ouraMessage = "Sync failed. \(error.localizedDescription)"
        }
    }

    private func refreshLedgerSnapshot() async {
        guard let store else { return }
        recentEntries = await store.recentEntries(days: 7)
    }

    private func updateOuraStatusFromLedger() {
        guard isOuraConfigured else {
            ouraStatus = .available
            ouraMessage = nil
            return
        }
        ouraStatus = hasRecentOuraData ? .connected : .connectedNoData
    }

    private var hasRecentOuraData: Bool {
        recentEntries.contains { $0.hasOuraMetric }
    }

    private var ouraWeeklyCoverage: Double {
        guard ouraStatus == .connected else { return 0 }
        let daysWithOura = recentEntries.filter { $0.hasOuraMetric }.count
        return Double(daysWithOura) / 7.0
    }

    private var recentHealthKitEntries: [DailyLedgerEntry] {
        recentEntries.filter { $0.hasHealthKitBackedMetric }
    }

    private var hasRecentHealthKitData: Bool {
        recentEntries.contains { $0.hasHealthKitBackedMetric }
    }

    private var hasRecentAppleWatchData: Bool {
        sawAppleWatchMetricThisSession || recentEntries.contains { $0.hasAppleWatchMetric }
    }

    private var sourceCards: [BodySource] {
        return [
            BodySource(
                id: "oura",
                name: "Oura Ring",
                role: "sleep, recovery, HRV",
                status: ouraStatus,
                coverage: ouraWeeklyCoverage,
                subline: ouraMessage ?? ouraSubline,
                systemImage: "circle.dashed"
            ),
            BodySource(
                id: "healthkit",
                name: "Apple Health",
                role: "movement, workouts, health gaps",
                status: healthKitStatus,
                coverage: Double(weeklyCoverage) / 100.0,
                subline: healthKitMessage ?? healthKitSubline,
                systemImage: "heart.text.square"
            ),
            BodySource(
                id: "scale",
                name: "Smart Scale",
                role: "weight, trend, body comp",
                status: .pending,
                coverage: 0.0,
                subline: "Connect after first weigh-in",
                systemImage: "scalemass"
            ),
            BodySource(
                id: "meals",
                name: "Meals",
                role: "calories, protein, macros",
                status: .pending,
                coverage: 0.0,
                subline: "Manual now; photos later",
                systemImage: "fork.knife"
            ),
        ]
    }

    private var ouraSubline: String {
        switch ouraStatus {
        case .connected:
            return "Primary recovery source"
        case .connectedNoData:
            return "Connected; waiting for first night of data"
        case .pending:
            return "Syncing"
        case .available:
            return "Connect Oura"
        case .disabled:
            return "Unavailable"
        }
    }

    private var healthKitSubline: String {
        switch healthKitStatus {
        case .connected:
            return "Bridge connected"
        case .connectedNoData:
            return "Waiting for data"
        case .pending:
            return "Requesting access"
        case .available:
            return "Connect Apple Health"
        case .disabled:
            return "Unavailable"
        }
    }
}

struct BodySource: Identifiable, Equatable {
    let id: String
    let name: String
    let role: String
    let status: SourceConnectionStatus
    let coverage: Double
    let subline: String
    let systemImage: String
}

struct MetricRouteRow: Identifiable, Equatable {
    let metric: String
    let source: String
    let reason: String

    var id: String { metric }
}

struct AppleHealthPilotRow: Identifiable, Equatable {
    enum Status: String, Equatable {
        case missing
        case requested
        case granted
        case checking
        case waiting
        case live
        case sample
        case dormant
    }

    let title: String
    let status: Status
    let detail: String

    var id: String { title }
}

enum SourceConnectionStatus: String, Equatable {
    case connected
    case connectedNoData
    case pending
    case available
    case disabled
}

private extension DailyLedgerEntry {
    var hasOuraMetric: Bool {
        sleep?.totalSleepMinutes?.source == .oura ||
        sleep?.hrv?.source == .oura ||
        sleep?.restingHR?.source == .oura ||
        sleep?.readinessScore?.source == .oura ||
        sleep?.skinTempDelta?.source == .oura ||
        steps?.source == .oura ||
        activeCalories?.source == .oura
    }

    var hasHealthKitBackedMetric: Bool {
        hasAppleWatchMetric ||
        steps?.source == .iphone ||
        activeCalories?.source == .iphone ||
        weight?.source == .iphone ||
        weight?.source == .smartScale
    }

    var hasAppleWatchMetric: Bool {
        sleep?.totalSleepMinutes?.source == .appleWatch ||
        sleep?.hrv?.source == .appleWatch ||
        sleep?.restingHR?.source == .appleWatch ||
        sleep?.readinessScore?.source == .appleWatch ||
        sleep?.skinTempDelta?.source == .appleWatch ||
        steps?.source == .appleWatch ||
        activeCalories?.source == .appleWatch
    }
}
