import Foundation
import Observation

@Observable
final class MealsViewModel {
    var meals: [Meal] = []
    var todayEntry: DailyLedgerEntry?
    var isSaving = false
    var saveError: String?

    private let store: any LedgerStore
    private let mealLogService: MealLogService
    private let deficitEstimator: DeficitEstimator
    private let bodyModeEngine: BodyModeEngine
    private let calendar: Calendar

    init(
        store: any LedgerStore,
        mealLogService: MealLogService = MealLogService(),
        deficitEstimator: DeficitEstimator = DeficitEstimator(),
        bodyModeEngine: BodyModeEngine = BodyModeEngine(),
        calendar: Calendar = .current
    ) {
        self.store = store
        self.mealLogService = mealLogService
        self.deficitEstimator = deficitEstimator
        self.bodyModeEngine = bodyModeEngine
        self.calendar = calendar
    }

    static func parseManualMealDraft(_ draft: String) -> ParsedManualMealDraft? {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        let caloriePattern = #"(?i)\b(\d{2,5})\s*(?:kcal|calories|cals|cal)\b"#
        guard let calorieMatch = firstMatch(in: trimmed, pattern: caloriePattern),
              let calories = Int(calorieMatch) else {
            return nil
        }

        let proteinPattern = #"(?i)\b(\d{1,3})\s*(?:g|grams?)?\s*(?:protein|prot)\b|\bprotein\s*(\d{1,3})\s*(?:g|grams?)?\b|\b(\d{1,3})\s*g\b"#
        let protein = firstMatch(in: trimmed, pattern: proteinPattern).flatMap { Int($0) }

        var description = trimmed
        for range in ranges(in: description, pattern: caloriePattern + "|" + proteinPattern).reversed() {
            description.removeSubrange(range)
        }
        description = description
            .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(.punctuationCharacters))

        guard !description.isEmpty else { return nil }
        return ParsedManualMealDraft(description: description, calories: calories, proteinG: protein)
    }

    func load() async {
        let entry = await store.entry(for: Date())
        todayEntry = entry
        meals = entry?.meals.sorted { $0.loggedAt > $1.loggedAt } ?? []
    }

    @discardableResult
    func logManualMeal(description: String, calories: Int, proteinG: Int?) async -> DailyLedgerEntry? {
        let trimmed = description.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, calories > 0 else {
            saveError = "Add a description and calories."
            return nil
        }

        isSaving = true
        defer { isSaving = false }

        let now = Date()
        let day = calendar.startOfDay(for: now)
        let meal = await mealLogService.logManualMeal(
            description: trimmed,
            calories: calories,
            proteinG: proteinG,
            date: now
        )
        var entry = await store.entry(for: day) ?? DailyLedgerEntry(date: day)
        entry.date = day
        entry.meals.append(meal)
        entry.estimatedDeficit = deficitEstimator.estimateDeficit(
            entry: entry,
            bmrEstimate: UserDefaults.standard.integer(forKey: "profile.bmr").nonZero ?? 1700
        )
        entry.bodyMode = bodyModeEngine.computeMode(from: entry)
        entry.coverageScore = LedgerCoverage.score(for: entry)

        await store.upsert(entry)
        saveError = nil
        await load()
        return entry
    }

    var todayCaloriesLabel: String {
        guard let todayEntry, !todayEntry.meals.isEmpty else { return "-" }
        return todayEntry.totalCaloriesIn.formatted()
    }

    var todayProteinLabel: String {
        let protein = meals.reduce(0) { $0 + ($1.estimatedProteinG?.value ?? 0) }
        return protein > 0 ? "\(protein) g" : "-"
    }

    private static func firstMatch(in text: String, pattern: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
        guard let match = regex.firstMatch(in: text, range: nsRange) else { return nil }
        for index in 1..<match.numberOfRanges {
            let range = match.range(at: index)
            guard range.location != NSNotFound,
                  let swiftRange = Range(range, in: text) else {
                continue
            }
            return String(text[swiftRange])
        }
        return nil
    }

    private static func ranges(in text: String, pattern: String) -> [Range<String.Index>] {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
        return regex.matches(in: text, range: nsRange).compactMap { Range($0.range, in: text) }
    }
}

struct ParsedManualMealDraft: Equatable {
    let description: String
    let calories: Int
    let proteinG: Int?
}

private extension Int {
    var nonZero: Int? {
        self == 0 ? nil : self
    }
}
