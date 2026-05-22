import Foundation

/// A single observed value along with where it came from and how much we trust it.
///
/// The ledger never stores a bare scalar; it stores a `MetricSample` so
/// downstream consumers can reason about source quality and confidence.
public struct MetricSample<Value>: Identifiable {
    public let id: UUID
    public var value: Value
    public var source: MetricSource
    /// Confidence in the range 0.0 (none) to 1.0 (certain).
    public var confidence: Double
    public var capturedAt: Date

    public init(
        id: UUID = UUID(),
        value: Value,
        source: MetricSource,
        confidence: Double,
        capturedAt: Date = Date()
    ) {
        self.id = id
        self.value = value
        self.source = source
        self.confidence = max(0.0, min(1.0, confidence))
        self.capturedAt = capturedAt
    }
}

extension MetricSample: Codable where Value: Codable {}
extension MetricSample: Equatable where Value: Equatable {}
extension MetricSample: Hashable where Value: Hashable {}
