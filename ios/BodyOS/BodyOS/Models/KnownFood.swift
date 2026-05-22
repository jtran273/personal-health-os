import Foundation

/// A frequently-eaten food that BodyOS remembers so estimates get faster
/// and more accurate over time (e.g. "Sweetgreen harvest bowl").
public struct KnownFood: Codable, Identifiable, Equatable {
    public let id: UUID
    public var name: String
    public var typicalCalories: Int
    public var typicalProteinG: Int
    public var notes: String?
    public var usageCount: Int

    public init(
        id: UUID = UUID(),
        name: String,
        typicalCalories: Int,
        typicalProteinG: Int,
        notes: String? = nil,
        usageCount: Int = 0
    ) {
        self.id = id
        self.name = name
        self.typicalCalories = typicalCalories
        self.typicalProteinG = typicalProteinG
        self.notes = notes
        self.usageCount = usageCount
    }
}
