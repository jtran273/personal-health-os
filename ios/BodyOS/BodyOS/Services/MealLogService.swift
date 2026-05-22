import Foundation

/// Captures meals and resolves them to calorie / protein estimates.
///
/// Resolution order: known-food match → photo + description LLM estimate → manual.
public final class MealLogService {
    private var knownFoods: [KnownFood] = []

    public init(knownFoods: [KnownFood] = []) {
        self.knownFoods = knownFoods
    }

    /// Persist a raw meal log entry. Macro estimation happens separately.
    public func logMeal(description: String, photoData: Data?) async -> Meal {
        return Meal(description: description, photoData: photoData)
    }

    /// Build a user-entered meal with explicit manual macro values.
    public func logManualMeal(
        description: String,
        calories: Int,
        proteinG: Int?,
        date: Date = Date()
    ) async -> Meal {
        Meal(
            loggedAt: date,
            description: description,
            estimatedCalories: MetricSample(value: calories, source: .manual, confidence: 0.8, capturedAt: date),
            estimatedProteinG: proteinG.map {
                MetricSample(value: $0, source: .manual, confidence: 0.8, capturedAt: date)
            }
        )
    }

    /// Naive name-match against the in-memory known-food library.
    public func matchKnownFood(description: String) async -> KnownFood? {
        // TODO: Fuzzy match (e.g. embedding similarity) rather than substring.
        let needle = description.lowercased()
        return knownFoods.first { needle.contains($0.name.lowercased()) }
    }

    /// Estimate calories + protein for a meal using Claude vision + text.
    public func estimateMacros(for meal: Meal) async -> Meal {
        // TODO: Call Claude API with `meal.description` and `meal.photoData`.
        // TODO: Parse structured macro estimates and attach as MetricSamples
        //       tagged with .mealPhoto or .estimated, with appropriate confidence.
        return meal
    }
}
