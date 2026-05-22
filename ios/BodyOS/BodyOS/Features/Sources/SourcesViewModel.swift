import Foundation
import Observation

protocol HealthKitAuthorizing {
    func requestAuthorization() async throws
}

protocol RecentHealthIngesting {
    func ingestRecent(days: Int) async throws -> DailyLedgerEntry?
}

extension HealthKitService: HealthKitAuthorizing {}
extension HealthKitIngestor: RecentHealthIngesting {}

@Observable
final class SourcesViewModel {
    var isOuraConfigured: Bool
    var healthKitStatus: SourceConnectionStatus
    var healthKitMessage: String?
    var recentEntries: [DailyLedgerEntry] = []

    private let healthKitService: any HealthKitAuthorizing
    private let healthKitIngestor: (any RecentHealthIngesting)?
    private let store: (any LedgerStore)?

    init(
        healthKitService: any HealthKitAuthorizing,
        healthKitIngestor: (any RecentHealthIngesting)? = nil,
        store: (any LedgerStore)? = nil
    ) {
        self.healthKitService = healthKitService
        self.healthKitIngestor = healthKitIngestor
        self.store = store
        self.isOuraConfigured = OuraTokenStore.shared.isConfigured
        self.healthKitStatus = UserDefaults.standard.bool(forKey: "source.healthKit") ? .connectedNoData : .available
    }

    var weeklyCoverage: Int {
        guard healthKitStatus == .connected, !recentEntries.isEmpty else { return 0 }
        let average = recentEntries.reduce(0.0) { $0 + $1.coverageScore } / Double(recentEntries.count)
        return Int((average * 100).rounded())
    }

    var coverageSentence: String {
        if healthKitStatus == .connectedNoData {
            return "Apple Health permission is set; waiting for readable Apple Watch samples."
        }
        if healthKitStatus != .connected {
            return "Apple Health would add Apple Watch sleep, HRV, movement, and weight if available."
        }
        return "Recent ledger rows are present. Check Today and Body for source, freshness, and confidence per metric."
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
            MetricRouteRow(metric: "Sleep + HRV", source: "Apple Watch", reason: "primary during 14-day Apple Health trial"),
            MetricRouteRow(metric: "Resting HR", source: "Apple Watch", reason: "primary recovery context through Apple Health"),
            MetricRouteRow(metric: "Respiratory rate", source: "Apple Watch", reason: "optional Apple Health signal when readable"),
            MetricRouteRow(metric: "Wrist temperature", source: "Apple Watch", reason: "optional overnight signal if HealthKit exposes it"),
            MetricRouteRow(metric: "Steps", source: "Apple Watch", reason: "watch first, iPhone fallback"),
            MetricRouteRow(metric: "Active calories", source: "Apple Watch", reason: "directional only; weight trend recalibrates"),
            MetricRouteRow(metric: "Workouts", source: "Apple Health", reason: "exercise context during the trial"),
            MetricRouteRow(metric: "Weight", source: "Scale/manual", reason: "Apple Health weight only when present"),
            MetricRouteRow(metric: "Food intake", source: "OpenClaw", reason: "meal photos + known foods")
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

        let appleWatchStatus: AppleHealthPilotRow.Status = healthKitStatus == .connected ? .live : .waiting

        return [
            AppleHealthPilotRow(
                title: "Health permissions",
                status: permissionStatus,
                detail: "Sleep, HRV, resting HR, respiratory rate, wrist temperature, steps, active energy, workouts, and weight. iOS hides exact read grants, so verify toggles in Health > Sharing > Apps > BodyOS."
            ),
            AppleHealthPilotRow(
                title: "Data freshness",
                status: freshnessStatus,
                detail: healthKitStatus == .connected ? "Recent Apple Health samples synced into the ledger." : "Connect, then refresh after a sleep/workout/day of watch wear."
            ),
            AppleHealthPilotRow(
                title: "Apple Watch source",
                status: appleWatchStatus,
                detail: "Live pilot data should come from Apple Watch / Apple Health, not placeholder rows."
            ),
            AppleHealthPilotRow(
                title: "Sample/dev data",
                status: .sample,
                detail: "Simulator and preview data are treated as demo-only; use James's iPhone for the 14-day trial."
            ),
            AppleHealthPilotRow(
                title: "Oura fallback",
                status: .dormant,
                detail: isOuraConfigured ? "Token is saved, but auto-sync stays off unless explicitly re-enabled." : "No Oura token required for the Apple Watch loop."
            )
        ]
    }

    func connectHealthKit() async {
        healthKitStatus = .pending
        healthKitMessage = "Requesting permission"
        do {
            try await healthKitService.requestAuthorization()
            UserDefaults.standard.set(true, forKey: "source.healthKit")
            healthKitMessage = "Syncing recent data"
            let entry = try await healthKitIngestor?.ingestRecent(days: 7)
            if entry == nil {
                healthKitStatus = .connectedNoData
                healthKitMessage = "Permission set; no recent Apple Health samples"
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

    func refresh() async {
        isOuraConfigured = OuraTokenStore.shared.isConfigured
        guard let store else { return }
        recentEntries = await store.recentEntries(days: 7)
        guard UserDefaults.standard.bool(forKey: "source.healthKit") else {
            healthKitStatus = .available
            return
        }
        healthKitStatus = recentEntries.isEmpty ? .connectedNoData : .connected
    }

    private var sourceCards: [BodySource] {
        return [
            BodySource(
                id: "healthkit",
                name: "Apple Watch",
                role: "sleep, hrv, resting hr, steps, active energy",
                status: healthKitStatus,
                coverage: Double(weeklyCoverage) / 100.0,
                subline: healthKitMessage ?? healthKitSubline,
                systemImage: "applewatch"
            ),
            BodySource(
                id: "oura",
                name: "Oura Ring",
                role: "disabled for now",
                status: .disabled,
                coverage: 0,
                subline: isOuraConfigured ? "Token saved, auto-sync off" : "Returned device; kept as fallback",
                systemImage: "circle.dashed"
            ),
            BodySource(
                id: "scale",
                name: "Smart Scale",
                role: "weight, trend, body comp",
                status: .pending,
                coverage: 0.0,
                subline: "Withings likely next",
                systemImage: "scalemass"
            ),
            BodySource(
                id: "meals",
                name: "Meal Photos",
                role: "food intake, protein, known foods",
                status: .pending,
                coverage: 0.0,
                subline: "Copilot UI built; estimation pending",
                systemImage: "photo"
            ),
        ]
    }

    private var healthKitSubline: String {
        switch healthKitStatus {
        case .connected:
            return "Apple Health read access configured"
        case .connectedNoData:
            return "Permission set; waiting for samples"
        case .pending:
            return "Requesting Apple Health access"
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
