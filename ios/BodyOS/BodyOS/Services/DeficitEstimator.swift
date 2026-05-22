import Foundation

/// Rough daily caloric-deficit estimator.
///
/// Note: this is a first-order estimate. Per PRD §6, the BMR input should
/// be recalibrated against the user's actual weight trend over rolling
/// 2–4 week windows rather than trusted as a static number.
public final class DeficitEstimator {
    public init() {}

    /// Returns `bmrEstimate + activeCalories - totalCaloriesIn`, or nil if
    /// active calories or meal data are missing for the day.
    public func estimateDeficit(entry: DailyLedgerEntry, bmrEstimate: Int) -> Int? {
        guard let active = entry.activeCalories?.value else { return nil }
        guard !entry.meals.isEmpty else { return nil }
        return bmrEstimate + active - entry.totalCaloriesIn
    }
}
