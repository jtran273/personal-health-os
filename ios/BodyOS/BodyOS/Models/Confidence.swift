import Foundation

/// Discrete confidence band used by UI components (chip dot color, sparkline dash style).
///
/// The ledger stores confidence as a continuous `Double` on `MetricSample`; this enum is the
/// presentation-layer projection. Mapping per the design handoff:
/// `high ≥ 0.75`, `med ≥ 0.45`, `low` otherwise.
public enum Confidence: String, CaseIterable, Codable, Sendable {
    case high
    case med
    case low

    public init(score: Double) {
        switch score {
        case 0.75...: self = .high
        case 0.45...: self = .med
        default: self = .low
        }
    }
}

public extension MetricSample {
    /// Banded confidence for UI components.
    var confidenceBand: Confidence { Confidence(score: confidence) }
}

public extension WeightEntry {
    /// Banded confidence for UI components.
    var confidenceBand: Confidence { Confidence(score: confidence) }
}
