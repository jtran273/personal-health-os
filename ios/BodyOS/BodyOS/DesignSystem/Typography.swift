import SwiftUI

/// Typography tokens for BodyOS. Three families, each with a job:
///   - **Serif** (Instrument Serif) — headlines, screen titles, editorial numbers.
///   - **Sans** (Geist) — all body and UI text.
///   - **Mono** (JetBrains Mono) — ALL CAPS source labels, timestamps, kicker tags.
///
/// Use the semantic accessors below; size and family decisions live here, not in views.
public enum AppFont {

    // MARK: - Serif (Instrument Serif)

    /// 56 / 1.02 — one-line hero headlines (rare).
    public static let display = Font.custom(Tokens.FontFamily.serif, size: 56)
    /// 32 / 1.05 — screen titles.
    public static let title = Font.custom(Tokens.FontFamily.serif, size: 32)
    /// 22 / 1.15 — "The One Thing", section titles.
    public static let heading = Font.custom(Tokens.FontFamily.serif, size: 22)
    /// 30 / 0.92 — editorial metric numbers (tabular).
    public static let metricLarge = Font.custom(Tokens.FontFamily.serif, size: 30)

    // MARK: - Sans (Geist)

    /// 16 / 1.5 — lead body text.
    public static let bodyLarge = Font.custom(Tokens.FontFamily.sansRegular, size: 16)
    /// 14 / 1.5 — default UI text.
    public static let body = Font.custom(Tokens.FontFamily.sansRegular, size: 14)
    /// 12 / 1.45 — sub-lines, timestamps.
    public static let caption = Font.custom(Tokens.FontFamily.sansRegular, size: 12)
    /// 14 — emphasis weight for primary buttons and labels.
    public static let bodyMedium = Font.custom(Tokens.FontFamily.sansMedium, size: 14)

    // MARK: - Mono (JetBrains Mono)

    /// 10 ALL CAPS with 0.10em tracking — source labels, "TODAY", "YELLOW".
    public static let tag = Font.custom(Tokens.FontFamily.mono, size: 10)
}

// MARK: - View helpers

public extension View {
    /// Apply the editorial "metric number" treatment: serif, tabular numerals, tight tracking.
    func metricNumber(size: CGFloat = 30) -> some View {
        self
            .font(.custom(Tokens.FontFamily.serif, size: size))
            .monospacedDigit()
            .tracking(-size * 0.02)
    }

    /// Apply the small-caps "kicker" treatment: mono, uppercase, 0.10em tracking.
    func kickerStyle(color: Color = Theme.textSecondary) -> some View {
        self
            .font(AppFont.tag)
            .tracking(1.0)
            .textCase(.uppercase)
            .foregroundStyle(color)
    }
}
