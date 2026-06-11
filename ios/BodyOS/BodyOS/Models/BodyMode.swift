import Foundation

/// The daily recovery recommendation surfaced on the Tide home screen.
public enum BodyMode: String, Codable, CaseIterable, Equatable {
    case green
    case yellow
    case red

    public var displayName: String {
        switch self {
        case .green: return "Green"
        case .yellow: return "Yellow"
        case .red: return "Red"
        }
    }

    /// One-line guidance for the user.
    public var description: String {
        switch self {
        case .green: return "Push it"
        case .yellow: return "Maintain"
        case .red: return "Protect recovery"
        }
    }
}
