import Foundation
import SwiftData

@Model
final class PersistedLedgerEntry {
    @Attribute(.unique) var dayKey: Date
    @Attribute(.externalStorage)
    var payload: Data
    var updatedAt: Date

    init(dayKey: Date, payload: Data, updatedAt: Date = Date()) {
        self.dayKey = dayKey
        self.payload = payload
        self.updatedAt = updatedAt
    }
}

final class SwiftDataLedgerStore: LedgerStore {
    private let container: ModelContainer
    private let calendar: Calendar

    init(container: ModelContainer, calendar: Calendar = .current) {
        self.container = container
        self.calendar = calendar
    }

    static func makeDefault(calendar: Calendar = .current) throws -> SwiftDataLedgerStore {
        let schema = Schema([PersistedLedgerEntry.self])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        return SwiftDataLedgerStore(container: container, calendar: calendar)
    }

    func entry(for date: Date) async -> DailyLedgerEntry? {
        let context = ModelContext(container)
        let key = startOfDay(date)
        let descriptor = FetchDescriptor<PersistedLedgerEntry>(
            predicate: #Predicate { $0.dayKey == key },
            sortBy: [SortDescriptor(\.dayKey, order: .reverse)]
        )
        guard let row = try? context.fetch(descriptor).first else {
            return nil
        }
        return decode(row.payload)
    }

    func upsert(_ entry: DailyLedgerEntry) async {
        let context = ModelContext(container)
        var normalized = entry
        normalized.date = startOfDay(entry.date)

        guard let payload = try? JSONEncoder().encode(normalized) else {
            return
        }

        let key = normalized.date
        let descriptor = FetchDescriptor<PersistedLedgerEntry>(
            predicate: #Predicate { $0.dayKey == key }
        )

        if let existing = try? context.fetch(descriptor).first {
            existing.payload = payload
            existing.updatedAt = Date()
        } else {
            context.insert(PersistedLedgerEntry(dayKey: key, payload: payload))
        }

        try? context.save()
    }

    func recentEntries(days: Int) async -> [DailyLedgerEntry] {
        let context = ModelContext(container)
        let today = startOfDay(Date())
        guard days > 0,
              let earliest = calendar.date(byAdding: .day, value: -(days - 1), to: today) else {
            return []
        }

        let descriptor = FetchDescriptor<PersistedLedgerEntry>(
            predicate: #Predicate { row in
                row.dayKey >= earliest && row.dayKey <= today
            },
            sortBy: [SortDescriptor(\.dayKey, order: .reverse)]
        )

        guard let rows = try? context.fetch(descriptor) else {
            return []
        }

        return rows.compactMap { decode($0.payload) }
    }

    private func decode(_ payload: Data) -> DailyLedgerEntry? {
        try? JSONDecoder().decode(DailyLedgerEntry.self, from: payload)
    }

    private func startOfDay(_ date: Date) -> Date {
        calendar.startOfDay(for: date)
    }
}
