import Foundation

/// Decides the "best source" for each metric type given which sources are
/// currently available (paired, authorized, syncing).
///
/// Source hierarchy (Oura-first with Apple Health bridge):
///   - Sleep / HRV / Recovery    → Oura → Apple Health → iPhone
///   - Steps                     → Apple Health → iPhone
///   - Active calories           → Apple Health → iPhone (estimated, recalibrated by weight trend)
///   - Weight                    → Smart Scale → Apple Health weight when present → Manual/OpenClaw prompt
///   - Meals                     → Known Food → Meal Photo → Manual → Estimated
///
/// Apple Health is a bridge, not a separate product destination. When Oura and
/// Apple Health overlap on recovery, Oura wins to avoid duplicate recovery facts.
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
        allowsDormantOuraFallback ? [.oura, .appleWatch, .iphone] : [.oura, .appleWatch, .iphone]
    }

    private func firstAvailable(_ preference: [MetricSource]) -> MetricSource? {
        preference.first { availableSources.contains($0) }
    }

    // MARK: - Recovery merge

    /// Rank of a source for sleep/recovery metrics; lower wins (Oura first, per PRD §6).
    public static func recoveryRank(_ source: MetricSource) -> Int {
        switch source {
        case .oura: return 0
        case .appleWatch: return 1
        case .iphone: return 2
        default: return 3
        }
    }

    /// Merges an incoming sleep/recovery snapshot into the existing one field by field.
    ///
    /// Each field keeps the sample from the higher-precedence source (Oura beats Apple Health),
    /// fills gaps from whichever source has the value, and prefers the incoming sample on ties
    /// so re-ingesting the same source refreshes data.
    public static func mergedRecovery(existing: SleepRecovery?, incoming: SleepRecovery) -> SleepRecovery {
        guard let existing else { return incoming }
        return SleepRecovery(
            date: existing.date,
            totalSleepMinutes: pick(existing: existing.totalSleepMinutes, incoming: incoming.totalSleepMinutes),
            hrv: pick(existing: existing.hrv, incoming: incoming.hrv),
            restingHR: pick(existing: existing.restingHR, incoming: incoming.restingHR),
            readinessScore: pick(existing: existing.readinessScore, incoming: incoming.readinessScore),
            skinTempDelta: pick(existing: existing.skinTempDelta, incoming: incoming.skinTempDelta)
        )
    }

    private static func pick<Value>(
        existing: MetricSample<Value>?,
        incoming: MetricSample<Value>?
    ) -> MetricSample<Value>? {
        guard let existing else { return incoming }
        guard let incoming else { return existing }
        return recoveryRank(incoming.source) <= recoveryRank(existing.source) ? incoming : existing
    }
}
