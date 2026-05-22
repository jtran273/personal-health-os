import Foundation

/// The per-day row in the BodyOS ledger — one of these per calendar day.
///
/// The `coverageScore` reflects the fraction of expected daily metrics
/// (sleep, weight, steps, active calories, meals) that were actually captured.
public struct DailyLedgerEntry: Codable, Identifiable, Equatable {
    /// Start-of-day for the entry. Doubles as the stable id.
    public var date: Date
    public var sleep: SleepRecovery?
    public var weight: WeightEntry?
    public var steps: MetricSample<Int>?
    public var activeCalories: MetricSample<Int>?
    public var meals: [Meal]
    public var bodyMode: BodyMode?
    public var estimatedDeficit: Int?
    /// 0.0–1.0 fraction of expected metrics captured for the day.
    public var coverageScore: Double

    public var id: Date { date }

    public init(
        date: Date,
        sleep: SleepRecovery? = nil,
        weight: WeightEntry? = nil,
        steps: MetricSample<Int>? = nil,
        activeCalories: MetricSample<Int>? = nil,
        meals: [Meal] = [],
        bodyMode: BodyMode? = nil,
        estimatedDeficit: Int? = nil,
        coverageScore: Double = 0.0
    ) {
        self.date = date
        self.sleep = sleep
        self.weight = weight
        self.steps = steps
        self.activeCalories = activeCalories
        self.meals = meals
        self.bodyMode = bodyMode
        self.estimatedDeficit = estimatedDeficit
        self.coverageScore = max(0.0, min(1.0, coverageScore))
    }

    /// Sum of calorie estimates across all logged meals (zero if missing).
    public var totalCaloriesIn: Int {
        meals.reduce(0) { $0 + ($1.estimatedCalories?.value ?? 0) }
    }
}
