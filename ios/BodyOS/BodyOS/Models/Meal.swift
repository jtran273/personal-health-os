import Foundation

/// A logged meal — manual, photo-based, or matched to a known food.
public struct Meal: Codable, Identifiable, Equatable {
    public let id: UUID
    public var loggedAt: Date
    public var description: String
    public var photoData: Data?
    public var estimatedCalories: MetricSample<Int>?
    public var estimatedProteinG: MetricSample<Int>?
    public var knownFoodID: UUID?
    public var userCorrections: String?

    public init(
        id: UUID = UUID(),
        loggedAt: Date = Date(),
        description: String,
        photoData: Data? = nil,
        estimatedCalories: MetricSample<Int>? = nil,
        estimatedProteinG: MetricSample<Int>? = nil,
        knownFoodID: UUID? = nil,
        userCorrections: String? = nil
    ) {
        self.id = id
        self.loggedAt = loggedAt
        self.description = description
        self.photoData = photoData
        self.estimatedCalories = estimatedCalories
        self.estimatedProteinG = estimatedProteinG
        self.knownFoodID = knownFoodID
        self.userCorrections = userCorrections
    }
}
