import Foundation

/// Decides the "best source" for each metric type given which sources are
/// currently available (paired, authorized, syncing).
///
/// Source hierarchy (PRD §6 — source-agnostic ledger):
///   - Sleep / HRV / Readiness   → Apple Watch → iPhone → Oura (disabled fallback)
///   - Steps                     → Apple Watch → iPhone
///   - Active calories           → Apple Watch → iPhone (estimated)
///   - Weight                    → Smart Scale → Manual
///   - Meals                     → Known Food → Meal Photo → Manual → Estimated
///
/// If none of the preferred sources are available, the router falls back
/// to `.estimated` so downstream code never has to handle "no source".
public final class HealthDataRouter {
    public let availableSources: Set<MetricSource>

    public init(availableSources: Set<MetricSource>) {
        self.availableSources = availableSources
    }

    public func bestSleepSource() -> MetricSource {
        firstAvailable([.appleWatch, .iphone, .oura]) ?? .estimated
    }

    public func bestStepSource() -> MetricSource {
        firstAvailable([.appleWatch, .iphone]) ?? .estimated
    }

    public func bestWeightSource() -> MetricSource {
        firstAvailable([.smartScale, .manual]) ?? .manual
    }

    public func bestActiveCalorieSource() -> MetricSource {
        firstAvailable([.appleWatch, .iphone]) ?? .estimated
    }

    private func firstAvailable(_ preference: [MetricSource]) -> MetricSource? {
        preference.first { availableSources.contains($0) }
    }
}
