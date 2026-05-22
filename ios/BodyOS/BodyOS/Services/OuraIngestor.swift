import Foundation

/// Orchestrates pulling Oura data and writing it into the `LedgerStore`.
///
/// Keeps the source-agnostic invariant: the ingestor is the only place that knows
/// how Oura responses become `DailyLedgerEntry` fields.
public final class OuraIngestor {
    private let oura: OuraService
    private let store: any LedgerStore
    private let bodyModeEngine: BodyModeEngine

    public init(oura: OuraService, store: any LedgerStore, bodyModeEngine: BodyModeEngine = BodyModeEngine()) {
        self.oura = oura
        self.store = store
        self.bodyModeEngine = bodyModeEngine
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
    public func ingestRecent(days: Int = 3) async throws -> DailyLedgerEntry? {
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
    @discardableResult
    public func ingest(date: Date) async throws -> DailyLedgerEntry? {
        let sleep = try await oura.fetchSleep(for: date)
        let activity = try await oura.fetchActivity(for: date)

        if sleep == nil && activity == nil { return nil }

        var entry = await store.entry(for: date) ?? DailyLedgerEntry(date: date)

        if let sleep { entry.sleep = sleep }

        if let activity {
            let now = Date()
            entry.steps = MetricSample(value: activity.steps, source: .oura, confidence: 0.5, capturedAt: now)
            entry.activeCalories = MetricSample(
                value: activity.activeCalories, source: .oura, confidence: 0.4, capturedAt: now)
        }

        entry.bodyMode = bodyModeEngine.computeMode(from: entry)
        entry.coverageScore = LedgerCoverage.score(for: entry)

        await store.upsert(entry)
        return entry
    }
}
