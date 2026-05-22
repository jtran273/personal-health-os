import Foundation
import Observation

@Observable
final class WeeklyReviewViewModel {
    var recentEntries: [DailyLedgerEntry] = []

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
            _ = try? await healthKitIngestor.ingestRecent(days: 7)
        }
        let entries = await store.recentEntries(days: 7)
        self.recentEntries = entries
    }

    var avgSleepHours: Double? {
        let mins = recentEntries.compactMap { $0.sleep?.totalSleepMinutes?.value }
        guard !mins.isEmpty else { return nil }
        let avg = Double(mins.reduce(0, +)) / Double(mins.count)
        return avg / 60.0
    }

    var totalActiveCalories: Int {
        recentEntries.compactMap { $0.activeCalories?.value }.reduce(0, +)
    }

    var avgDeficit: Int? {
        let defs = recentEntries.compactMap { $0.estimatedDeficit }
        guard !defs.isEmpty else { return nil }
        return defs.reduce(0, +) / defs.count
    }

    /// Returns (firstKg, lastKg) over the window if at least two weights exist.
    var weightTrend: (Double, Double)? {
        let sorted = recentEntries
            .compactMap { $0.weight }
            .sorted { $0.date < $1.date }
        guard let first = sorted.first, let last = sorted.last, first.id != last.id else {
            return nil
        }
        return (first.weightKg, last.weightKg)
    }

    var weekKicker: String {
        let week = calendar.component(.weekOfYear, from: weekDates.last ?? Date())
        return "Weekly review - Week \(week)"
    }

    var dateRangeTitle: String {
        guard let first = weekDates.first, let last = weekDates.last else { return "" }
        return "\(Self.monthDay(first)) - \(Self.monthDay(last))"
    }

    var headline: String {
        guard !recentEntries.isEmpty else {
            return "Weekly review is waiting on ledger data. Sync sources first; do not fill the week with guesses."
        }

        guard let weightDeltaLb else {
            return "Calibration is waiting on weight. Sleep and activity can describe the week, but the scale closes the loop."
        }

        let movement = Self.weightMovementText(weightDeltaLb)
        if let avgDeficit {
            return "Scale trend is \(movement). Deficit math averaged \(avgDeficit) kcal/day; keep trusting the trend."
        }
        return "Scale trend is \(movement). Deficit math needs meal data before it can be trusted."
    }

    var chartPoints: [WeeklyChartPoint] {
        weekDates.map { date in
            let entry = entry(on: date)
            return WeeklyChartPoint(
                date: date,
                dayLabel: Self.weekday(date),
                weightLb: entry?.weight.map { $0.weightKg * WeightService.poundsPerKilogram },
                deficit: entry?.estimatedDeficit
            )
        }
    }

    var weightDeltaLb: Double? {
        guard let trend = weightTrend else { return nil }
        return (trend.1 - trend.0) * WeightService.poundsPerKilogram
    }

    var calibrationValue: String {
        guard let weightDeltaLb else { return "--" }
        return String(format: "%+.1f", weightDeltaLb)
    }

    var calibrationUnit: String {
        weightDeltaLb == nil ? "needs 2 weigh-ins" : "lb this week"
    }

    var calibrationInsightTitle: String {
        canRecalibrate ? "I recalibrated" : "Calibration waiting"
    }

    var calibrationInsight: String {
        guard let weightDeltaLb, let avgDeficit else {
            return "I need at least two weigh-ins and enough logged meals to compare calorie math against the scale."
        }

        let days = max(1, weightObservationSpanDays)
        let observedDeficit = Int(((-weightDeltaLb * 3500.0) / Double(days)).rounded())
        let observedText = observedDeficit > 0 ? "\(observedDeficit) kcal/day" : "no clear deficit"
        let gap = abs(avgDeficit - observedDeficit)

        if gap >= 100 {
            return "Estimated deficit averaged \(avgDeficit) kcal/day. Weight trend implies \(observedText), so next week should trust the scale."
        }
        return "Estimated deficit and weight trend are close enough for this window. Keep the plan steady."
    }

    var heldItems: [String] {
        var items: [String] = []

        let sleepCount = weekEntries.filter { $0.sleep?.totalSleepMinutes != nil }.count
        if sleepCount > 0 {
            items.append("Sleep logged \(sleepCount)/7 nights")
        }

        let activityCount = weekEntries.filter { $0.activeCalories != nil || $0.steps != nil }.count
        if activityCount > 0 {
            items.append("Movement captured \(activityCount)/7 days")
        }

        let modeCount = weekEntries.filter { $0.bodyMode != nil }.count
        if modeCount > 0 {
            items.append("Body mode computed \(modeCount)/7 days")
        }

        if items.isEmpty {
            items.append("Ledger is ready; weekly signals have not landed yet")
        }
        return Array(items.prefix(3))
    }

    var slippedItems: [String] {
        var items: [String] = []

        let weightMissing = 7 - weekEntries.filter { $0.weight != nil }.count
        if weightMissing > 0 {
            items.append("Weight missing \(weightMissing)/7 days")
        }

        let mealMissing = 7 - weekEntries.filter { !$0.meals.isEmpty }.count
        if mealMissing > 0 {
            items.append("Meal photos missing \(mealMissing)/7 days")
        }

        let deficitMissing = 7 - weekEntries.filter { $0.estimatedDeficit != nil }.count
        if deficitMissing > 0 {
            items.append("Deficit unavailable \(deficitMissing)/7 days")
        }

        if let avgSleepHours, avgSleepHours < 7.0 {
            items.insert(String(format: "Sleep averaged %.1f h", avgSleepHours), at: 0)
        }

        if items.isEmpty {
            items.append("No major gaps visible in current data")
        }
        return Array(items.prefix(3))
    }

    var sleepTrend: [Double?] {
        chartEntries { entry in
            entry.sleep?.totalSleepMinutes.map { Double($0.value) / 60.0 }
        }
    }

    var proteinTrend: [Double?] {
        chartEntries { entry in
            let protein = entry.meals.reduce(0) { $0 + ($1.estimatedProteinG?.value ?? 0) }
            return protein > 0 ? Double(protein) : nil
        }
    }

    var sleepAverageLabel: String {
        guard let avgSleepHours else { return "avg --" }
        return String(format: "avg %.1f", avgSleepHours)
    }

    var proteinAverageLabel: String {
        let values = proteinTrend.compactMap { $0 }
        guard !values.isEmpty else { return "avg -- - goal 140" }
        let avg = Int((values.reduce(0, +) / Double(values.count)).rounded())
        return "avg \(avg) - goal 140"
    }

    var nextWeekPlan: [String] {
        var plan: [String] = []

        let weightCount = weekEntries.filter { $0.weight != nil }.count
        if weightCount < 4 {
            plan.append("Log weight on four mornings so calibration has a scale trend.")
        }

        if proteinTrend.compactMap({ $0 }).isEmpty {
            plan.append("Add meal photos at breakfast and dinner to establish the protein baseline.")
        } else if let avgProtein = proteinTrend.compactMap({ $0 }).average, avgProtein < 140 {
            plan.append("Put a protein anchor in breakfast before changing anything else.")
        }

        if let avgSleepHours, avgSleepHours < 7.0 {
            plan.append("Protect the first sleep block before adding workout load.")
        }

        if avgDeficit == nil {
            plan.append("Keep meal logging consistent enough to compute daily deficit.")
        }

        if plan.count < 3 {
            plan.append("Keep one easy walk on yellow days.")
        }
        if plan.count < 3 {
            plan.append("Review the next plan after the scale has two more readings.")
        }

        return Array(plan.prefix(3))
    }

    private var canRecalibrate: Bool {
        weightDeltaLb != nil && avgDeficit != nil
    }

    private var weekEntries: [DailyLedgerEntry] {
        weekDates.compactMap { entry(on: $0) }
    }

    private var weekDates: [Date] {
        let today = calendar.startOfDay(for: Date())
        return (0..<7).compactMap { offset in
            calendar.date(byAdding: .day, value: -(6 - offset), to: today)
        }
    }

    private var weightObservationSpanDays: Int {
        let weights = recentEntries
            .compactMap { $0.weight }
            .sorted { $0.date < $1.date }
        guard let first = weights.first, let last = weights.last else { return 1 }
        return max(1, calendar.dateComponents([.day], from: first.date, to: last.date).day ?? 1)
    }

    private func entry(on date: Date) -> DailyLedgerEntry? {
        let day = calendar.startOfDay(for: date)
        return recentEntries.first { calendar.isDate($0.date, inSameDayAs: day) }
    }

    private func chartEntries(_ value: (DailyLedgerEntry) -> Double?) -> [Double?] {
        weekDates.map { date in
            guard let entry = entry(on: date) else { return nil }
            return value(entry)
        }
    }

    private static func weightMovementText(_ delta: Double) -> String {
        if abs(delta) < 0.05 { return "flat" }
        let direction = delta < 0 ? "down" : "up"
        return "\(direction) \(String(format: "%.1f", abs(delta))) lb"
    }

    private static func monthDay(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    private static func weekday(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "E"
        return formatter.string(from: date)
    }
}

struct WeeklyChartPoint: Identifiable, Equatable {
    let date: Date
    let dayLabel: String
    let weightLb: Double?
    let deficit: Int?

    var id: Date { date }
}

private extension Array where Element == Double {
    var average: Double? {
        guard !isEmpty else { return nil }
        return reduce(0, +) / Double(count)
    }
}
