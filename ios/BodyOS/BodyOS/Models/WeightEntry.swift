import Foundation

/// A single weight reading, source-tagged for ledger routing.
public struct WeightEntry: Codable, Identifiable, Equatable {
    public let id: UUID
    public var date: Date
    public var weightKg: Double
    public var source: MetricSource
    public var confidence: Double
    public var bodyFatPct: Double?

    public init(
        id: UUID = UUID(),
        date: Date,
        weightKg: Double,
        source: MetricSource,
        confidence: Double = 0.9,
        bodyFatPct: Double? = nil
    ) {
        self.id = id
        self.date = date
        self.weightKg = weightKg
        self.source = source
        self.confidence = max(0.0, min(1.0, confidence))
        self.bodyFatPct = bodyFatPct
    }
}
