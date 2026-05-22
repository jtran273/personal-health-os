import Foundation
import Observation

@Observable
final class WeightViewModel {
    var todayEntry: DailyLedgerEntry?
    var recentWeights: [WeightEntry] = []
    var isSaving = false
    var saveError: String?

    private let store: any LedgerStore
    private let weightService: WeightService
    private let bodyModeEngine: BodyModeEngine
    private let calendar: Calendar

    init(
        store: any LedgerStore,
        weightService: WeightService = WeightService(),
        bodyModeEngine: BodyModeEngine = BodyModeEngine(),
        calendar: Calendar = .current
    ) {
        self.store = store
        self.weightService = weightService
        self.bodyModeEngine = bodyModeEngine
        self.calendar = calendar
    }

    func load() async {
        todayEntry = await store.entry(for: Date())
        recentWeights = await store.recentEntries(days: 7)
            .compactMap(\.weight)
            .sorted { $0.date > $1.date }
    }

    @discardableResult
    func logPounds(_ pounds: Double) async -> DailyLedgerEntry? {
        guard pounds > 0 else {
            saveError = "Enter a weight above 0 lb."
            return nil
        }

        isSaving = true
        defer { isSaving = false }

        let now = Date()
        let day = calendar.startOfDay(for: now)
        let weight = weightService.logManualWeight(pounds: pounds, date: now)
        var entry = await store.entry(for: day) ?? DailyLedgerEntry(date: day)
        entry.date = day
        entry.weight = weight
        entry.bodyMode = bodyModeEngine.computeMode(from: entry)
        entry.coverageScore = LedgerCoverage.score(for: entry)

        await store.upsert(entry)
        saveError = nil
        await load()
        return entry
    }

    static func formatPounds(fromKg kg: Double) -> String {
        String(format: "%.1f lb", kg * WeightService.poundsPerKilogram)
    }
}
