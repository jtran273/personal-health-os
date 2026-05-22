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

    private let healthKitService: any HealthKitAuthorizing
    private let healthKitIngestor: (any RecentHealthIngesting)?

    init(
        healthKitService: any HealthKitAuthorizing,
        healthKitIngestor: (any RecentHealthIngesting)? = nil
    ) {
        self.healthKitService = healthKitService
        self.healthKitIngestor = healthKitIngestor
        self.isOuraConfigured = OuraTokenStore.shared.isConfigured
        self.healthKitStatus = UserDefaults.standard.bool(forKey: "source.healthKit") ? .connected : .available
    }

    var weeklyCoverage: Int {
        var score = 0
        if healthKitStatus == .connected { score += 70 }
        score += 6
        return min(score, 100)
    }

    var coverageSentence: String {
        if healthKitStatus == .connectedNoData {
            return "Apple Health permission is set; waiting for readable Apple Watch samples."
        }
        if healthKitStatus != .connected {
            return "Apple Health would add Apple Watch sleep, HRV, movement, and weight if available."
        }
        return "Sleep, recovery, movement, and weight routes are ready when data exists."
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
            MetricRouteRow(metric: "Sleep + HRV", source: "Apple Watch", reason: "overnight signal through Apple Health"),
            MetricRouteRow(metric: "Resting HR", source: "Apple Watch", reason: "overnight recovery context"),
            MetricRouteRow(metric: "Steps", source: "Apple Watch", reason: "phone/watch movement source"),
            MetricRouteRow(metric: "Active calories", source: "Apple Watch", reason: "directional only; scale trend wins"),
            MetricRouteRow(metric: "Weight", source: healthKitStatus == .connected ? "Apple Health" : "manual", reason: "smart scale later"),
            MetricRouteRow(metric: "Food intake", source: "OpenClaw", reason: "meal photos + known foods")
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
        } catch {
            UserDefaults.standard.set(false, forKey: "source.healthKit")
            healthKitStatus = .available
            healthKitMessage = error.localizedDescription
        }
    }

    func refresh() {
        isOuraConfigured = OuraTokenStore.shared.isConfigured
    }

    private var sourceCards: [BodySource] {
        return [
            BodySource(
                id: "healthkit",
                name: "Apple Watch",
                role: "sleep, hrv, resting hr, steps, active energy",
                status: healthKitStatus,
                coverage: healthKitStatus == .connected ? 0.82 : 0,
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

enum SourceConnectionStatus: String, Equatable {
    case connected
    case connectedNoData
    case pending
    case available
    case disabled
}
