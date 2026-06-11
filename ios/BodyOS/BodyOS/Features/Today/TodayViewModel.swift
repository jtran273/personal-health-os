import Foundation
import Observation

@Observable
final class TodayViewModel {
    var entry: DailyLedgerEntry?
    var recentEntries: [DailyLedgerEntry] = []
    var recommendedAction: String?
    var lastSyncError: String?
    var lastSyncedAt: Date?

    private let store: any LedgerStore
    private let healthKitIngestor: (any RecentHealthIngesting)?
    private let ouraIngestor: (any RecentOuraIngesting)?
    private let isOuraTokenConfigured: () -> Bool

    init(
        store: any LedgerStore,
        healthKitIngestor: (any RecentHealthIngesting)? = nil,
        ouraIngestor: (any RecentOuraIngesting)? = nil,
        isOuraTokenConfigured: @escaping () -> Bool = { OuraTokenStore.shared.isConfigured }
    ) {
        self.store = store
        self.healthKitIngestor = healthKitIngestor
        self.ouraIngestor = ouraIngestor
        self.isOuraTokenConfigured = isOuraTokenConfigured
    }

    func load() async {
        var syncError: String?
        if UserDefaults.standard.bool(forKey: "source.healthKit"), let healthKitIngestor {
            do {
                _ = try await healthKitIngestor.ingestRecent(days: 7)
                lastSyncedAt = Date()
            } catch {
                syncError = error.localizedDescription
            }
        }
        // Oura wins sleep/recovery; the ingestor merges per-field so Apple Health movement is kept.
        // No token: skip silently. Token but no ring data yet: ingest returns nil, no error, no fake values.
        if isOuraTokenConfigured(), let ouraIngestor {
            do {
                _ = try await ouraIngestor.ingestRecent(days: 7)
                lastSyncedAt = Date()
            } catch {
                syncError = syncError ?? error.localizedDescription
            }
        }
        lastSyncError = syncError
        // P0 data integrity: Today must represent today's Apple Health ledger only.
        // Older populated days remain available for trends, but they should never masquerade
        // as current steps/recovery when today's HealthKit sync has not produced samples yet.
        self.entry = await store.entry(for: Date())
        self.recentEntries = await store.recentEntries(days: 7)
        if let entry = self.entry {
            self.recommendedAction = oneAction(for: entry).title
        } else {
            self.recommendedAction = nil
        }
    }

    var activeMode: BodyMode {
        entry?.bodyMode ?? .yellow
    }

    var modeHeadline: String {
        guard entry != nil else {
            return "Set up sources."
        }
        switch activeMode {
        case .green: return "Push it."
        case .yellow: return "Recover, don't push."
        case .red: return "Restore."
        }
    }

    var modeReason: String {
        guard let entry else {
            return "Connect Oura, Apple Health, or scale in Settings."
        }

        if let readiness = entry.sleep?.readinessScore?.value {
            switch activeMode {
            case .green:
                return "Readiness \(readiness). Sleep and recovery are ready enough for load."
            case .yellow:
                return "Readiness \(readiness). Keep load controlled today."
            case .red:
                return "Readiness \(readiness). Keep the day light."
            }
        }

        if let sleepMinutes = entry.sleep?.totalSleepMinutes?.value {
            return "\(Self.formatDuration(minutes: sleepMinutes)) sleep. Use sleep as the signal today."
        }

        return "Partial data today. Stay conservative until more signals land."
    }

    var oneAction: TodayOneAction {
        guard let entry else {
            if UserDefaults.standard.bool(forKey: "source.healthKit") {
                return TodayOneAction(
                    title: "Refresh sources.",
                    reason: "Apple Health is connected, but no fresh samples are in today's ledger.",
                    window: "now",
                    systemImage: "arrow.clockwise"
                )
            }
            return TodayOneAction(
                title: "Connect sources.",
                reason: "Oura handles recovery. Apple Health fills gaps. Scale anchors weight.",
                window: "now",
                systemImage: "point.3.connected.trianglepath.dotted"
            )
        }
        return oneAction(for: entry)
    }

    var openLoops: [TodayOpenLoop] {
        guard let entry else {
            if UserDefaults.standard.bool(forKey: "source.healthKit") {
                return [TodayOpenLoop(id: "health-sync", label: "Source data not fresh", since: "today", cta: "Refresh")]
            }
            return [TodayOpenLoop(id: "health", label: "Sources not connected", since: "setup", cta: "Open")]
        }

        var loops: [TodayOpenLoop] = []
        if !UserDefaults.standard.bool(forKey: "source.healthKit") {
            loops.append(TodayOpenLoop(id: "health", label: "Apple Health bridge off", since: "optional", cta: "Open"))
        } else if entry.sleep == nil && entry.steps == nil && entry.activeCalories == nil {
            loops.append(TodayOpenLoop(id: "health-sync", label: "Apple Health not fresh", since: "last sync", cta: "Refresh"))
        }
        if entry.weight == nil {
            loops.append(TodayOpenLoop(id: "weight", label: "Weight not logged", since: "today", cta: "Log now"))
        }
        if entry.meals.isEmpty {
            loops.append(TodayOpenLoop(id: "food", label: "Meals not logged", since: "today", cta: "Add meal"))
        }
        if entry.sleep != nil && entry.sleep?.hrv == nil {
            loops.append(TodayOpenLoop(id: "hrv", label: "HRV missing", since: "last source sync", cta: "Refresh"))
        }
        return Array(loops.prefix(3))
    }

    var timelineEvents: [TodayTimelineEvent] {
        guard let entry else { return [] }

        var events: [TodayTimelineEvent] = []
        if let sleep = entry.sleep {
            let sleepText = sleepTimelineText(sleep)
            if !sleepText.isEmpty {
                events.append(TodayTimelineEvent(
                    id: "sleep",
                    timeLabel: Self.timeString(sleep.totalSleepMinutes?.capturedAt ?? sleep.hrv?.capturedAt ?? entry.date),
                    text: sleepText,
                    source: sleep.totalSleepMinutes?.source.displayName ?? sleep.hrv?.source.displayName ?? "Recovery",
                    confidence: sleep.totalSleepMinutes?.confidenceBand ?? sleep.hrv?.confidenceBand ?? .high
                ))
            }
        }
        if let steps = entry.steps {
            events.append(TodayTimelineEvent(
                id: "steps",
                timeLabel: Self.timeString(steps.capturedAt),
                text: "\(steps.value.formatted()) steps recorded.",
                source: steps.source.displayName,
                confidence: steps.confidenceBand
            ))
        }
        if let active = entry.activeCalories {
            events.append(TodayTimelineEvent(
                id: "active",
                timeLabel: Self.timeString(active.capturedAt),
                text: "\(active.value) active kcal recorded.",
                source: active.source.displayName,
                confidence: active.confidenceBand
            ))
        }
        for meal in entry.meals.sorted(by: { $0.loggedAt < $1.loggedAt }) {
            events.append(TodayTimelineEvent(
                id: meal.id.uuidString,
                timeLabel: Self.timeString(meal.loggedAt),
                text: meal.description,
                source: meal.estimatedCalories?.source.displayName ?? "Meal",
                confidence: meal.estimatedCalories?.confidenceBand ?? .med
            ))
        }
        if let weight = entry.weight {
            events.append(TodayTimelineEvent(
                id: "weight",
                timeLabel: Self.timeString(weight.date),
                text: "\(Self.formatPounds(fromKg: weight.weightKg)) logged.",
                source: weight.source.displayName,
                confidence: weight.confidenceBand
            ))
        }
        return events
    }

    var footerText: String {
        let coverage = Int(((entry?.coverageScore ?? 0) * 100).rounded())
        if let lastSyncError {
            return "Sync failed. Coverage today \(coverage)%. \(lastSyncError)"
        }
        if entry == nil {
            if UserDefaults.standard.bool(forKey: "source.healthKit") {
                return "No fresh source data yet. Pull to refresh."
            }
            return "Connect sources in Settings. No placeholder metrics are shown."
        }
        guard let lastSyncedAt else {
            return "Sync pending. Coverage today \(coverage)%."
        }
        let minutes = max(0, Int(Date().timeIntervalSince(lastSyncedAt) / 60))
        return "Synced \(minutes) min ago. Coverage today \(coverage)%."
    }

    private func oneAction(for entry: DailyLedgerEntry) -> TodayOneAction {
        switch entry.bodyMode {
        case .green:
            return TodayOneAction(
                title: "Lift or walk 30 min today.",
                reason: "Recovery is green. Keep the action simple and finish the loop.",
                window: "today",
                systemImage: "figure.strengthtraining.traditional"
            )
        case .yellow:
            return TodayOneAction(
                title: "Walk 25 min after lunch.",
                reason: "Recovery is not red, but it is not a day to tax it.",
                window: "lunch",
                systemImage: "figure.walk"
            )
        case .red:
            return TodayOneAction(
                title: "Keep it light. Sleep tonight.",
                reason: "Recovery is low. The useful move is reducing load, not adding more.",
                window: "today",
                systemImage: "bed.double"
            )
        case .none:
            return TodayOneAction(
                title: "Log sleep and weight.",
                reason: "The ledger is missing the signals needed to choose a safer action.",
                window: "now",
                systemImage: "square.and.pencil"
            )
        }
    }

    private func sleepTimelineText(_ sleep: SleepRecovery) -> String {
        var parts: [String] = []
        if let minutes = sleep.totalSleepMinutes?.value {
            parts.append("Slept \(Self.formatDuration(minutes: minutes)).")
        }
        if let readiness = sleep.readinessScore?.value {
            parts.append("Readiness \(readiness).")
        }
        if let hrv = sleep.hrv?.value {
            parts.append("HRV \(Int(hrv.rounded())) ms.")
        }
        return parts.joined(separator: " ")
    }

    static func formatDuration(minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        return "\(h)h \(m)m"
    }

    static func formatPounds(fromKg kg: Double) -> String {
        String(format: "%.1f lb", kg * WeightService.poundsPerKilogram)
    }

    static func timeString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date).lowercased()
    }
}

struct TodayOneAction: Equatable {
    let title: String
    let reason: String
    let window: String
    let systemImage: String
}

struct TodayOpenLoop: Identifiable, Equatable {
    let id: String
    let label: String
    let since: String
    let cta: String
}

struct TodayTimelineEvent: Identifiable, Equatable {
    let id: String
    let timeLabel: String
    let text: String
    let source: String
    let confidence: Confidence
}
