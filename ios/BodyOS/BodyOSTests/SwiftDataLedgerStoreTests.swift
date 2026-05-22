import SwiftData
import XCTest
@testable import BodyOS

final class SwiftDataLedgerStoreTests: XCTestCase {
    func testUpsertAndReadEntry() async throws {
        let store = try makeStore()
        let date = Date(timeIntervalSince1970: 1_779_000_000)
        let weight = WeightEntry(date: date, weightKg: 82.1, source: .manual)
        let entry = DailyLedgerEntry(date: date, weight: weight, bodyMode: .yellow, coverageScore: 0.25)

        await store.upsert(entry)

        let saved = await store.entry(for: date)
        XCTAssertEqual(saved?.date, Calendar.current.startOfDay(for: date))
        XCTAssertEqual(saved?.weight?.weightKg, 82.1)
        XCTAssertEqual(saved?.weight?.source, .manual)
        XCTAssertEqual(saved?.bodyMode, .yellow)
        XCTAssertEqual(saved?.coverageScore, 0.25)
    }

    func testUpsertReplacesExistingDay() async throws {
        let store = try makeStore()
        let date = Date(timeIntervalSince1970: 1_779_000_000)

        await store.upsert(DailyLedgerEntry(date: date, coverageScore: 0.125))
        await store.upsert(DailyLedgerEntry(date: date, coverageScore: 0.5))

        let saved = await store.entry(for: date)
        XCTAssertEqual(saved?.coverageScore, 0.5)
    }

    func testRecentEntriesReturnsCurrentWindowDescending() async throws {
        let store = try makeStore()
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let yesterday = try XCTUnwrap(calendar.date(byAdding: .day, value: -1, to: today))
        let outsideWindow = try XCTUnwrap(calendar.date(byAdding: .day, value: -8, to: today))

        await store.upsert(DailyLedgerEntry(date: outsideWindow, coverageScore: 0.125))
        await store.upsert(DailyLedgerEntry(date: yesterday, coverageScore: 0.25))
        await store.upsert(DailyLedgerEntry(date: today, coverageScore: 0.5))

        let entries = await store.recentEntries(days: 7)
        XCTAssertEqual(entries.map(\.date), [today, yesterday])
    }

    private func makeStore() throws -> SwiftDataLedgerStore {
        let schema = Schema([PersistedLedgerEntry.self])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        return SwiftDataLedgerStore(container: container)
    }
}
