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

    init(
        store: any LedgerStore,
        healthKitIngestor: (any RecentHealthIngesting)? = nil
    ) {
        self.store = store
        self.healthKitIngestor = healthKitIngestor
    }

    func load() async {
        if UserDefaults.standard.bool(forKey: "source.healthKit"), let healthKitIngestor {
            do {
                _ = try await healthKitIngestor.ingestRecent(days: 7)
                lastSyncedAt = Date()
                lastSyncError = nil
            } catch {
                lastSyncError = error.localizedDescription
            }
        }
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
            return "Waiting for Health data."
        }
        switch activeMode {
        case .green: return "Push it."
        case .yellow: return "Recover, don't push."
        case .red: return "Restore."
        }
    }

    var modeReason: String {
        guard let entry else {
            return "Connect Apple Health in Sources to start the ledger."
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
                    title: "Refresh Apple Health.",
                    reason: "Permission is set, but today's ledger has no readable Apple Watch or iPhone samples yet.",
                    window: "now",
                    systemImage: "arrow.clockwise"
                )
            }
            return TodayOneAction(
                title: "Connect Apple Health.",
                reason: "The Today screen needs Apple Watch sleep, recovery, and movement signals before it can choose a useful action.",
                window: "now",
                systemImage: "applewatch"
            )
        }
        return oneAction(for: entry)
    }

    var openLoops: [TodayOpenLoop] {
        guard let entry else {
            if UserDefaults.standard.bool(forKey: "source.healthKit") {
                return [TodayOpenLoop(id: "health-sync", label: "Apple Watch data not readable", since: "today", cta: "Refresh")]
            }
            return [TodayOpenLoop(id: "health", label: "Apple Health not connected", since: "needs permission", cta: "Connect")]
        }

        var loops: [TodayOpenLoop] = []
        if !UserDefaults.standard.bool(forKey: "source.healthKit") {
            loops.append(TodayOpenLoop(id: "health", label: "Apple Health not connected", since: "needs permission", cta: "Connect"))
        } else if entry.sleep == nil && entry.steps == nil && entry.activeCalories == nil {
            loops.append(TodayOpenLoop(id: "health-sync", label: "Apple Watch data not readable", since: "last sync", cta: "Refresh"))
        }
        if entry.weight == nil {
            loops.append(TodayOpenLoop(id: "weight", label: "Weight not logged", since: "today", cta: "Log now"))
        }
        if entry.meals.isEmpty {
            loops.append(TodayOpenLoop(id: "food", label: "Meals not logged", since: "today", cta: "Add meal"))
        }
        if entry.sleep != nil && entry.sleep?.hrv == nil {
            loops.append(TodayOpenLoop(id: "hrv", label: "HRV missing", since: "last Apple Health sync", cta: "Refresh"))
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
                    source: sleep.totalSleepMinutes?.source.displayName ?? sleep.hrv?.source.displayName ?? "Apple Watch",
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
                return "No live Apple Health samples in today's ledger yet. Pull to refresh after Apple Watch syncs."
            }
            return "Apple Health is not connected. No placeholder metrics are shown."
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
