import Foundation

/// The origin device or method that produced a health metric sample.
///
/// BodyOS treats every metric as source-tagged so the ledger can route
/// to the "best source" per metric type (see HealthDataRouter / PRD §6).
public enum MetricSource: String, Codable, CaseIterable, Hashable {
    case oura
    case appleWatch
    case iphone
    case smartScale
    case manual
    case mealPhoto
    case knownFood
    case estimated

    /// Human-readable label for UI surfaces.
    public var displayName: String {
        switch self {
        case .oura: return "Oura Ring"
        case .appleWatch: return "Apple Watch"
        case .iphone: return "iPhone"
        case .smartScale: return "Smart Scale"
        case .manual: return "Manual Entry"
        case .mealPhoto: return "Meal Photo"
        case .knownFood: return "Known Food"
        case .estimated: return "Estimated"
        }
    }
}
