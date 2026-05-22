import Foundation

/// Orchestrates pulling Apple Health data and writing it into the source-agnostic ledger.
public final class HealthKitIngestor {
    private let healthKit: any HealthKitReading
    private let store: any LedgerStore
    private let bodyModeEngine: BodyModeEngine
    private let deficitEstimator: DeficitEstimator

    public init(
        healthKit: any HealthKitReading,
        store: any LedgerStore,
        bodyModeEngine: BodyModeEngine = BodyModeEngine(),
        deficitEstimator: DeficitEstimator = DeficitEstimator()
    ) {
        self.healthKit = healthKit
        self.store = store
        self.bodyModeEngine = bodyModeEngine
        self.deficitEstimator = deficitEstimator
    }

    /// Pull the last `days` days from HealthKit and merge each into the ledger.
    @discardableResult
    public func ingestRecent(days: Int = 7) async throws -> DailyLedgerEntry? {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        var mostRecent: DailyLedgerEntry?

        for offset in 0..<days {
            guard let day = calendar.date(byAdding: .day, value: -offset, to: today) else { continue }
            if let entry = try await ingest(date: day), mostRecent == nil {
                mostRecent = entry
            }
        }

        return mostRecent
    }

    /// Pull Apple Health recovery, movement, and weight for one day and merge into the ledger.
    @discardableResult
    public func ingest(date: Date) async throws -> DailyLedgerEntry? {
        async let sleepRecovery = healthKit.fetchSleepRecovery(for: date)
        async let steps = healthKit.fetchSteps(for: date)
        async let activeEnergy = healthKit.fetchActiveEnergy(for: date)
        async let weight = healthKit.fetchWeight(for: date)

        let (sleep, stepSample, activeCalorieSample, weightEntry) = try await (sleepRecovery, steps, activeEnergy, weight)

        if sleep == nil && stepSample == nil && activeCalorieSample == nil && weightEntry == nil {
            return nil
        }

        var entry = await store.entry(for: date) ?? DailyLedgerEntry(date: date)

        if let sleep {
            entry.sleep = sleep
        }
        if let stepSample {
            entry.steps = stepSample
        }
        if let activeCalorieSample {
            entry.activeCalories = activeCalorieSample
        }
        if let weightEntry, shouldReplaceWeight(existing: entry.weight, candidate: weightEntry) {
            entry.weight = weightEntry
        }

        entry.bodyMode = bodyModeEngine.computeMode(from: entry)
        let savedBMR = UserDefaults.standard.integer(forKey: "profile.bmr")
        entry.estimatedDeficit = deficitEstimator.estimateDeficit(
            entry: entry,
            bmrEstimate: savedBMR > 0 ? savedBMR : 1700
        )
        entry.coverageScore = LedgerCoverage.score(for: entry)

        await store.upsert(entry)
        return entry
    }

    private func shouldReplaceWeight(existing: WeightEntry?, candidate: WeightEntry) -> Bool {
        guard let existing else { return true }
        if existing.source == .manual && candidate.source != .manual {
            return false
        }
        return candidate.confidence >= existing.confidence
    }
}
