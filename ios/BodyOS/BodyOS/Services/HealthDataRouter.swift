import Foundation

/// Decides the "best source" for each metric type given which sources are
/// currently available (paired, authorized, syncing).
///
/// Source hierarchy (Apple Watch 14-day trial — source-agnostic ledger):
///   - Sleep / HRV / Recovery    → Apple Watch → iPhone → Oura only when fallback is explicitly enabled
///   - Steps                     → Apple Watch → iPhone
///   - Active calories           → Apple Watch → iPhone (estimated, recalibrated by weight trend)
///   - Weight                    → Smart Scale → Apple Health weight when present → Manual/OpenClaw prompt
///   - Meals                     → Known Food → Meal Photo → Manual → Estimated
///
/// Oura is dormant by default. A configured token should not make Oura an
/// automatic route; callers must opt into fallback mode before Oura can win.
/// Apple Health permission alone also does not make weight passive: the router
/// only chooses Health-sourced weight after a body-mass sample exists.
/// If none of the preferred passive sources are available, the router falls
/// back to `.estimated` so downstream code never has to handle "no source".
public final class HealthDataRouter {
    public let availableSources: Set<MetricSource>
    public let allowsDormantOuraFallback: Bool
    public let hasAppleHealthWeight: Bool

    public init(
        availableSources: Set<MetricSource>,
        allowsDormantOuraFallback: Bool = false,
        hasAppleHealthWeight: Bool = false
    ) {
        self.availableSources = availableSources
        self.allowsDormantOuraFallback = allowsDormantOuraFallback
        self.hasAppleHealthWeight = hasAppleHealthWeight
    }

    public func bestSleepSource() -> MetricSource {
        firstAvailable(recoveryPreference) ?? .estimated
    }

    public func bestRecoverySource() -> MetricSource {
        firstAvailable(recoveryPreference) ?? .estimated
    }

    public func bestStepSource() -> MetricSource {
        firstAvailable([.appleWatch, .iphone]) ?? .estimated
    }

    public func bestWeightSource() -> MetricSource {
        var preference: [MetricSource] = [.smartScale]
        if hasAppleHealthWeight { preference.append(.iphone) }
        preference.append(.manual)
        return firstAvailable(preference) ?? .manual
    }

    public func bestActiveCalorieSource() -> MetricSource {
        firstAvailable([.appleWatch, .iphone]) ?? .estimated
    }

    private var recoveryPreference: [MetricSource] {
        allowsDormantOuraFallback ? [.appleWatch, .iphone, .oura] : [.appleWatch, .iphone]
    }

    private func firstAvailable(_ preference: [MetricSource]) -> MetricSource? {
        preference.first { availableSources.contains($0) }
    }
}
