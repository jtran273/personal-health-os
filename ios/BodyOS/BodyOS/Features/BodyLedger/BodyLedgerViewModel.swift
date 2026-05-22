import Foundation
import Observation

@Observable
final class BodyLedgerViewModel {
    var entries: [DailyLedgerEntry] = []
    var selectedDate: Date?
    var lastSyncError: String?

    private let store: any LedgerStore
    private let healthKitIngestor: HealthKitIngestor?
    private let calendar: Calendar

    init(
        store: any LedgerStore,
        healthKitIngestor: HealthKitIngestor? = nil,
        calendar: Calendar = .current
    ) {
        self.store = store
        self.healthKitIngestor = healthKitIngestor
        self.calendar = calendar
    }

    func load() async {
        if UserDefaults.standard.bool(forKey: "source.healthKit"), let healthKitIngestor {
            do {
                _ = try await healthKitIngestor.ingestRecent(days: 7)
                lastSyncError = nil
            } catch {
                lastSyncError = error.localizedDescription
            }
        }

        await refreshFromStore()
    }

    func refreshFromStore(selectingToday: Bool = false) async {
        entries = await store.recentEntries(days: 7)
        if selectingToday {
            selectedDate = calendar.startOfDay(for: Date())
        } else if selectedDate == nil {
            selectedDate = entries.first?.date ?? calendar.startOfDay(for: Date())
        }
    }

    var selectedEntry: DailyLedgerEntry? {
        guard let selectedDate else { return nil }
        let selectedDay = calendar.startOfDay(for: selectedDate)
        return entries.first { calendar.isDate($0.date, inSameDayAs: selectedDay) }
    }

    var dayPills: [LedgerDayPill] {
        let today = calendar.startOfDay(for: Date())
        return (0..<7).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: -(6 - offset), to: today) else { return nil }
            let hasData = entries.contains { calendar.isDate($0.date, inSameDayAs: date) }
            return LedgerDayPill(date: date, hasData: hasData)
        }
    }

    func select(_ date: Date) {
        selectedDate = calendar.startOfDay(for: date)
    }

    var coveragePercent: Int {
        Int(((selectedEntry?.coverageScore ?? 0) * 100).rounded())
    }

    var coverageSentence: String {
        guard let entry = selectedEntry else {
            return "Connect Apple Health to start filling the ledger."
        }

        var missing: [String] = []
        if entry.sleep?.totalSleepMinutes == nil { missing.append("sleep") }
        if entry.sleep?.hrv == nil { missing.append("HRV") }
        if entry.sleep?.restingHR == nil { missing.append("resting HR") }
        if entry.steps == nil { missing.append("steps") }
        if entry.activeCalories == nil { missing.append("active calories") }
        if entry.weight == nil { missing.append("weight") }
        if entry.meals.isEmpty { missing.append("meals") }

        if missing.isEmpty {
            return "Core signals are present for this day."
        }
        return "Missing \(Self.joinMissing(missing))."
    }

    var sections: [LedgerSection] {
        guard let entry = selectedEntry else {
            return [
                LedgerSection(
                    title: "Ledger",
                    right: "empty",
                    rows: [
                        LedgerRowData(
                            id: "empty",
                            iconName: "circle.dashed",
                            label: "No row yet",
                            value: "-",
                            subLine: "No source has written data for this day.",
                            source: "missing",
                            confidence: .low,
                            story: "Once Apple Health syncs, this screen will show each metric with its source and confidence."
                        )
                    ]
                )
            ]
        }

        return [
            sleepSection(entry),
            activitySection(entry),
            dietSection(entry),
            bodySection(entry)
        ]
    }

    private func sleepSection(_ entry: DailyLedgerEntry) -> LedgerSection {
        let sleep = entry.sleep
        return LedgerSection(
            title: "Sleep + recovery",
            right: "overnight",
            rows: [
                LedgerRowData(
                    id: "sleep",
                    iconName: "moon.stars",
                    label: "Sleep",
                    value: sleep?.totalSleepMinutes.map { Self.formatDuration(minutes: $0.value) } ?? "-",
                    subLine: sleep?.totalSleepMinutes.map { "captured \(Self.timeString($0.capturedAt))" },
                    source: shortSource(sleep?.totalSleepMinutes?.source.displayName) ?? "missing",
                    confidence: sleep?.totalSleepMinutes?.confidenceBand ?? .low,
                    story: sleep?.totalSleepMinutes == nil ? "No sleep duration has landed for this day." : "Apple Watch sleep duration is the primary overnight signal for body mode."
                ),
                LedgerRowData(
                    id: "hrv",
                    iconName: "waveform.path.ecg",
                    label: "HRV",
                    value: sleep?.hrv.map { "\(Int($0.value.rounded()))" } ?? "-",
                    unit: "ms",
                    subLine: sleep?.hrv.map { _ in "overnight average" },
                    source: shortSource(sleep?.hrv?.source.displayName) ?? "missing",
                    confidence: sleep?.hrv?.confidenceBand ?? .low,
                    story: sleep?.hrv == nil ? "No HRV reading is available for this day." : "HRV is treated as directional, not a precise readiness guarantee."
                ),
                LedgerRowData(
                    id: "rhr",
                    iconName: "heart",
                    label: "Resting HR",
                    value: sleep?.restingHR.map { "\($0.value)" } ?? "-",
                    unit: "bpm",
                    subLine: sleep?.restingHR.map { _ in "lowest overnight heart rate" },
                    source: shortSource(sleep?.restingHR?.source.displayName) ?? "missing",
                    confidence: sleep?.restingHR?.confidenceBand ?? .low,
                    story: sleep?.restingHR == nil ? nil : "Resting HR helps catch recovery stress that sleep duration can miss."
                ),
                LedgerRowData(
                    id: "readiness",
                    iconName: "gauge",
                    label: "Readiness",
                    value: sleep?.readinessScore.map { "\($0.value)" } ?? "-",
                    subLine: sleep?.readinessScore.map { _ in "recovery score" },
                    source: shortSource(sleep?.readinessScore?.source.displayName) ?? "missing",
                    confidence: sleep?.readinessScore?.confidenceBand ?? .low,
                    story: readinessStory(entry)
                )
            ]
        )
    }

    private func activitySection(_ entry: DailyLedgerEntry) -> LedgerSection {
        LedgerSection(
            title: "Activity",
            right: "movement",
            rows: [
                LedgerRowData(
                    id: "steps",
                    iconName: "figure.walk",
                    label: "Steps",
                    value: entry.steps.map { $0.value.formatted() } ?? "-",
                    subLine: entry.steps.map { "captured \(Self.timeString($0.capturedAt))" },
                    source: shortSource(entry.steps?.source.displayName) ?? "missing",
                    confidence: entry.steps?.confidenceBand ?? .low,
                    story: entry.steps == nil ? "No step source has written to this day yet." : nil
                ),
                LedgerRowData(
                    id: "active",
                    iconName: "flame",
                    label: "Active calories",
                    value: entry.activeCalories.map { "\($0.value)" } ?? "-",
                    unit: "kcal",
                    subLine: "estimate",
                    source: shortSource(entry.activeCalories?.source.displayName) ?? "missing",
                    confidence: entry.activeCalories?.confidenceBand ?? .low,
                    story: "Wearable calorie burn is weak evidence. Weight trend will override this when the two disagree."
                )
            ]
        )
    }

    private func dietSection(_ entry: DailyLedgerEntry) -> LedgerSection {
        let protein = entry.meals.reduce(0) { $0 + ($1.estimatedProteinG?.value ?? 0) }
        return LedgerSection(
            title: "Diet",
            right: "from chat",
            rows: [
                LedgerRowData(
                    id: "eaten",
                    iconName: "photo",
                    label: "Eaten",
                    value: entry.meals.isEmpty ? "-" : entry.totalCaloriesIn.formatted(),
                    unit: entry.meals.isEmpty ? nil : "kcal",
                    subLine: entry.meals.isEmpty ? "no meals logged" : "\(entry.meals.count) meal\(entry.meals.count == 1 ? "" : "s") logged",
                    source: entry.meals.isEmpty ? "missing" : "photos",
                    confidence: entry.meals.isEmpty ? .low : .med,
                    story: entry.meals.isEmpty ? "Meal photo estimation is not wired yet. Empty beats a fake calorie total." : "Food estimates stay directional until known foods and corrections improve them."
                ),
                LedgerRowData(
                    id: "protein",
                    iconName: "leaf",
                    label: "Protein",
                    value: protein > 0 ? "\(protein)" : "-",
                    unit: protein > 0 ? "g" : nil,
                    subLine: "goal 140 g",
                    source: protein > 0 ? "photos" : "missing",
                    confidence: protein > 0 ? .med : .low,
                    story: protein > 0 ? nil : "Protein will fill from meal photos and known foods."
                )
            ]
        )
    }

    private func bodySection(_ entry: DailyLedgerEntry) -> LedgerSection {
        LedgerSection(
            title: "Body",
            right: "weight",
            rows: [
                LedgerRowData(
                    id: "weight",
                    iconName: "scalemass",
                    label: "Weight",
                    value: entry.weight.map { Self.formatPounds(fromKg: $0.weightKg) } ?? "-",
                    subLine: entry.weight.map { "logged \(Self.dateString($0.date))" } ?? "not logged today",
                    source: shortSource(entry.weight?.source.displayName) ?? "manual",
                    confidence: entry.weight?.confidenceBand ?? .low,
                    story: entry.weight == nil ? "Daily weight is the missing signal that makes calorie calibration work." : "Weight trend is the calibration layer for calorie math."
                ),
                LedgerRowData(
                    id: "mode",
                    iconName: "circle.lefthalf.filled",
                    label: "Body mode",
                    value: entry.bodyMode?.displayName ?? "-",
                    subLine: "computed from available recovery signals",
                    source: "BodyOS",
                    confidence: entry.bodyMode == nil ? .low : .med,
                    story: entry.bodyMode == nil ? "No mode was computed for this row." : "Mode summarizes the day; it is not a diagnosis."
                )
            ]
        )
    }

    private func readinessStory(_ entry: DailyLedgerEntry) -> String? {
        guard let mode = entry.bodyMode else { return "Readiness is missing, so the mode falls back to sleep when possible." }
        return "This helped set today to \(mode.displayName.lowercased())."
    }

    private func shortSource(_ source: String?) -> String? {
        guard let source else { return nil }
        switch source {
        case "Oura Ring": return "Oura"
        case "Meal Photo": return "photos"
        case "Manual Entry": return "manual"
        default: return source
        }
    }

    static func formatDuration(minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        return "\(h)h \(m)m"
    }

    static func formatPounds(fromKg kg: Double) -> String {
        String(format: "%.1f", kg * WeightService.poundsPerKilogram)
    }

    static func dateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    static func timeString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date).lowercased()
    }

    private static func joinMissing(_ items: [String]) -> String {
        switch items.count {
        case 0: return ""
        case 1: return items[0]
        case 2: return "\(items[0]) + \(items[1])"
        default: return items.dropLast().joined(separator: ", ") + " + \(items.last ?? "")"
        }
    }
}

struct LedgerDayPill: Identifiable, Equatable {
    let date: Date
    let hasData: Bool

    var id: Date { date }
}

struct LedgerSection: Identifiable, Equatable {
    let title: String
    let right: String
    let rows: [LedgerRowData]

    var id: String { title }
}
