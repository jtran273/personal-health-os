import Foundation

/// Persistent store for `DailyLedgerEntry` rows, keyed by start-of-day.
public protocol LedgerStore {
    func entry(for date: Date) async -> DailyLedgerEntry?
    func upsert(_ entry: DailyLedgerEntry) async
    func recentEntries(days: Int) async -> [DailyLedgerEntry]
}

/// In-memory implementation of `LedgerStore` for development and previews.
///
/// All dates are normalized to start-of-day in the current calendar so
/// upserts collapse correctly regardless of capture time.
public actor InMemoryLedgerStore: LedgerStore {
    private var entries: [Date: DailyLedgerEntry] = [:]
    private let calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    public func entry(for date: Date) async -> DailyLedgerEntry? {
        entries[startOfDay(date)]
    }

    public func upsert(_ entry: DailyLedgerEntry) async {
        let key = startOfDay(entry.date)
        var normalized = entry
        normalized.date = key
        entries[key] = normalized
    }

    public func recentEntries(days: Int) async -> [DailyLedgerEntry] {
        let today = startOfDay(Date())
        guard let earliest = calendar.date(byAdding: .day, value: -(days - 1), to: today) else {
            return []
        }
        return entries.values
            .filter { $0.date >= earliest && $0.date <= today }
            .sorted { $0.date > $1.date }
    }

    private func startOfDay(_ date: Date) -> Date {
        calendar.startOfDay(for: date)
    }
}
