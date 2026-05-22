import Foundation

/// Thin helper for manual weight entry. Smart-scale ingestion lives in
/// HealthKitService (or a vendor-specific service) and bypasses this.
public final class WeightService {
    public static let poundsPerKilogram = 2.2046226218
    public static let manualConfidence = 0.95
    public static let smartScaleConfidence = 0.98

    public init() {}

    public func logManualWeight(pounds: Double, date: Date) -> WeightEntry {
        logManualWeight(kg: pounds / Self.poundsPerKilogram, date: date)
    }

    public func logManualWeight(kg: Double, date: Date) -> WeightEntry {
        WeightEntry(date: date, weightKg: kg, source: .manual, confidence: Self.manualConfidence)
    }

    public func logSmartScaleWeight(kg: Double, date: Date, bodyFatPct: Double? = nil) -> WeightEntry {
        WeightEntry(
            date: date,
            weightKg: kg,
            source: .smartScale,
            confidence: Self.smartScaleConfidence,
            bodyFatPct: bodyFatPct
        )
    }
}
