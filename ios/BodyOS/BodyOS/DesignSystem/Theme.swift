import SwiftUI

/// Semantic theme aliases. Views should prefer `Theme.*` over raw `Tokens.Color.*`
/// so we can later route values through a dynamic theme or dark-mode variant.
public enum Theme {
    // Surfaces
    public static let background = Tokens.Color.paper
    public static let backgroundDeep = Tokens.Color.paperDeep
    public static let surface = Tokens.Color.surface
    public static let surfaceNested = Tokens.Color.surface2

    // Dividers
    public static let hairline = Tokens.Color.hair
    public static let hairlineStrong = Tokens.Color.hairStrong

    // Text
    public static let textPrimary = Tokens.Color.ink
    public static let textBody = Tokens.Color.ink2
    public static let textSecondary = Tokens.Color.muted
    public static let textFaint = Tokens.Color.faint

    // Accent
    public static let accent = Tokens.Color.clay
    public static let accentSoft = Tokens.Color.claySoft

    // Mode primaries (for borders, dots, text on soft fills)
    public static let green = Tokens.Color.green
    public static let yellow = Tokens.Color.yellow
    public static let red = Tokens.Color.red

    // Mode soft fills
    public static let greenSoft = Tokens.Color.greenSoft
    public static let yellowSoft = Tokens.Color.yellowSoft
    public static let redSoft = Tokens.Color.redSoft
}

// MARK: - BodyMode → theme

public extension BodyMode {
    /// Solid line / dot color for this mode.
    var tint: Color {
        switch self {
        case .green: return Tokens.Color.green
        case .yellow: return Tokens.Color.yellow
        case .red: return Tokens.Color.red
        }
    }

    /// Soft tint for chip / card / orb backgrounds.
    var softTint: Color {
        switch self {
        case .green: return Tokens.Color.greenSoft
        case .yellow: return Tokens.Color.yellowSoft
        case .red: return Tokens.Color.redSoft
        }
    }

    /// Stroke color used by the Body Mode Orb.
    var orbStroke: Color {
        switch self {
        case .green: return Tokens.Color.greenStroke
        case .yellow: return Tokens.Color.yellowStroke
        case .red: return Tokens.Color.redStroke
        }
    }

    /// Inner radial-gradient color used by the Body Mode Orb.
    var orbInner: Color {
        switch self {
        case .green: return Tokens.Color.greenInner
        case .yellow: return Tokens.Color.yellowInner
        case .red: return Tokens.Color.redInner
        }
    }

    /// Outer radial-gradient color used by the Body Mode Orb.
    var orbFill: Color {
        switch self {
        case .green: return Tokens.Color.greenSoft
        case .yellow: return Tokens.Color.yellowSoft
        case .red: return Tokens.Color.redSoft
        }
    }
}

// MARK: - Confidence → theme

public extension Confidence {
    /// Dot color used inside a `SourceChip` capsule.
    var dotColor: Color {
        switch self {
        case .high: return Tokens.Color.green
        case .med: return Tokens.Color.yellow
        case .low: return Tokens.Color.red
        }
    }
}
