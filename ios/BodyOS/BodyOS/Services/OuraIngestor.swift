import Foundation

/// Domain-level Oura reader seam so ingestion can be tested without real API calls.
public protocol OuraReading {
    func fetchSleep(for date: Date) async throws -> SleepRecovery?
    func fetchActivity(for date: Date) async throws -> (steps: Int, activeCalories: Int)?
}

extension OuraService: OuraReading {}

/// Orchestrates pulling Oura data and writing it into the `LedgerStore`.
///
/// Keeps the source-agnostic invariant: the ingestor is the only place that knows
/// how Oura responses become `DailyLedgerEntry` fields. Routing rules (PRD §6):
/// Oura wins sleep/recovery; Apple Health wins movement, so Oura steps/calories
/// only fill days that have no higher-precedence movement samples.
public final class OuraIngestor {
    private let oura: any OuraReading
    private let store: any LedgerStore
    private let bodyModeEngine: BodyModeEngine
    private let deficitEstimator: DeficitEstimator

    public init(
        oura: any OuraReading,
        store: any LedgerStore,
        bodyModeEngine: BodyModeEngine = BodyModeEngine(),
        deficitEstimator: DeficitEstimator = DeficitEstimator()
    ) {
        self.oura = oura
        self.store = store
        self.bodyModeEngine = bodyModeEngine
        self.deficitEstimator = deficitEstimator
    }

    /// Pull today's sleep + activity from Oura and merge into the ledger.
    /// Returns the updated entry, or nil if no Oura data was available yet.
    @discardableResult
    public func ingestToday() async throws -> DailyLedgerEntry? {
        try await ingest(date: Date())
    }

    /// Pull the last `days` days from Oura and merge each into the ledger.
    /// Useful at app launch: today may not have synced yet, but yesterday usually has.
    /// Returns the most-recent populated entry, or nil if none had data.
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

    /// Pull data for an arbitrary date and merge into the ledger.
    /// A brand-new ring with no synced nights returns nil — no entry is invented.
    @discardableResult
    public func ingest(date: Date) async throws -> DailyLedgerEntry? {
        let sleep = try await oura.fetchSleep(for: date)
        let activity = try await oura.fetchActivity(for: date)

        if sleep == nil && activity == nil { return nil }

        var entry = await store.entry(for: date) ?? DailyLedgerEntry(date: date)

        if let sleep {
            entry.sleep = HealthDataRouter.mergedRecovery(existing: entry.sleep, incoming: sleep)
        }

        if let activity {
            let now = Date()
            if shouldReplaceMovement(existing: entry.steps) {
                entry.steps = MetricSample(value: activity.steps, source: .oura, confidence: 0.5, capturedAt: now)
            }
            if shouldReplaceMovement(existing: entry.activeCalories) {
                entry.activeCalories = MetricSample(
                    value: activity.activeCalories, source: .oura, confidence: 0.4, capturedAt: now)
            }
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

    /// Apple Health wins movement; Oura only fills gaps or refreshes its own samples.
    private func shouldReplaceMovement(existing: MetricSample<Int>?) -> Bool {
        guard let existing else { return true }
        return existing.source == .oura || existing.source == .estimated
    }
}
