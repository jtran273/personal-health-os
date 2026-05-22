import Foundation

/// Scores how complete a ledger day is for the current MVP signal set.
public enum LedgerCoverage {
    public static func score(for entry: DailyLedgerEntry) -> Double {
        let checks: [Bool] = [
            entry.sleep?.totalSleepMinutes != nil,
            entry.sleep?.hrv != nil,
            entry.sleep?.restingHR != nil,
            entry.steps != nil,
            entry.activeCalories != nil,
            entry.weight != nil,
            !entry.meals.isEmpty
        ]
        let filled = checks.filter { $0 }.count
        return Double(filled) / Double(checks.count)
    }
}
