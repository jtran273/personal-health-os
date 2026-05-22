import SwiftUI

/// Authoritative design tokens for BodyOS. Mirror of `design-handoff/prototype/tokens.css`.
///
/// Warm, editorial, paper-like. The only saturated colors are the three mode chromas.
/// Use `Theme` (semantic) and `AppFont` (typography) in code — these raw tokens are the
/// source of truth they read from.
public enum Tokens {

    // MARK: - Color

    public enum Color {
        // Paper
        public static let paper       = SwiftUI.Color(hex: 0xF6F1E8)
        public static let paperDeep   = SwiftUI.Color(hex: 0xEDE6D8)
        public static let surface     = SwiftUI.Color(hex: 0xFBF7F0)
        public static let surface2    = SwiftUI.Color(hex: 0xFDFAF3)
        public static let hair        = SwiftUI.Color(red: 30/255, green: 27/255, blue: 22/255, opacity: 0.08)
        public static let hairStrong  = SwiftUI.Color(red: 30/255, green: 27/255, blue: 22/255, opacity: 0.16)

        // Ink
        public static let ink         = SwiftUI.Color(hex: 0x1E1B16)
        public static let ink2        = SwiftUI.Color(hex: 0x3A342C)
        public static let muted       = SwiftUI.Color(hex: 0x6B6358)
        public static let faint       = SwiftUI.Color(hex: 0xA39A8C)

        // Mode chromas — sRGB approximations of the handoff OKLCH values.
        // OKLCH values are listed in comments; if precision matters later we can swap to
        // ColorSyncFramework-based conversion.

        /// `oklch(0.58 0.08 152)`
        public static let green       = SwiftUI.Color(hex: 0x4C8A65)
        /// `oklch(0.92 0.04 152)`
        public static let greenSoft   = SwiftUI.Color(hex: 0xDDEDDF)
        public static let greenStroke = SwiftUI.Color(hex: 0x3E7556) // oklch(0.52 0.10 152)
        public static let greenInner  = SwiftUI.Color(hex: 0xA9D2B5) // oklch(0.78 0.10 152)

        /// `oklch(0.74 0.10 78)`
        public static let yellow      = SwiftUI.Color(hex: 0xC7A24A)
        /// `oklch(0.93 0.05 78)`
        public static let yellowSoft  = SwiftUI.Color(hex: 0xEFE3C2)
        public static let yellowStroke = SwiftUI.Color(hex: 0x8E743B) // oklch(0.55 0.10 65)
        public static let yellowInner = SwiftUI.Color(hex: 0xD9BC73) // oklch(0.80 0.10 78)

        /// `oklch(0.55 0.14 28)`
        public static let red         = SwiftUI.Color(hex: 0xB05A48)
        /// `oklch(0.93 0.05 28)`
        public static let redSoft     = SwiftUI.Color(hex: 0xF1DCD4)
        public static let redStroke   = SwiftUI.Color(hex: 0x8A4032) // oklch(0.48 0.14 28)
        public static let redInner    = SwiftUI.Color(hex: 0xC78B7D) // oklch(0.74 0.13 28)

        /// `oklch(0.60 0.11 40)` — accent / open-loop / weight-trend
        public static let clay        = SwiftUI.Color(hex: 0xB47453)
        public static let claySoft    = SwiftUI.Color(hex: 0xF0E0D2)
    }

    // MARK: - Spacing (4-pt scale)

    public enum Space {
        public static let xs: CGFloat = 4
        public static let sm: CGFloat = 8
        public static let md: CGFloat = 12
        public static let lg: CGFloat = 16
        public static let xl: CGFloat = 24
        public static let xxl: CGFloat = 32
    }

    // MARK: - Radii

    public enum Radius {
        public static let tile: CGFloat = 12
        public static let card: CGFloat = 18
        public static let hero: CGFloat = 26
        public static let pill: CGFloat = 999
        /// Inner-nested cards: `card − 4`.
        public static let cardInner: CGFloat = 14
    }

    // MARK: - Motion

    public enum Motion {
        /// Body Mode Orb breathing loop (seconds).
        public static let orbBreathe: Double = 9
        /// Fade reveal/dismiss (seconds).
        public static let fade: Double = 0.2
        /// Sheet / tab slide (seconds).
        public static let slide: Double = 0.32
        /// Calibration chart redraw (seconds).
        public static let calibration: Double = 0.8
    }

    // MARK: - Font family names
    //
    // Names must match the PostScript names embedded in the .ttf/.otf files registered via
    // `UIAppFonts` in Info.plist. See `design-handoff/README.md` and `Resources/Info.plist.template`.

    public enum FontFamily {
        public static let serif = "InstrumentSerif-Regular"
        public static let sansRegular = "Geist-Regular"
        public static let sansMedium = "Geist-Medium"
        public static let mono = "JetBrainsMono-Regular"
    }
}

// MARK: - Color hex init

public extension Color {
    /// Convenience: `Color(hex: 0x1E1B16)`.
    init(hex: UInt32, opacity: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}
