import SwiftUI

/// Display data for a single row in the Body Ledger.
public struct LedgerRowData: Identifiable, Equatable {
    public let id: String
    public let iconName: String              // SF Symbol
    public let label: String                 // "Sleep"
    public let value: String                 // "6h 12m"
    public let unit: String?                 // optional unit appended in mono
    public let subLine: String?              // "22:48 → 05:00 · efficiency 89%"
    public let source: String                // "Oura"
    public let confidence: Confidence
    public let story: String?                // "Short by 1h 04m vs. your 14-day baseline."

    public init(
        id: String,
        iconName: String,
        label: String,
        value: String,
        unit: String? = nil,
        subLine: String? = nil,
        source: String,
        confidence: Confidence,
        story: String? = nil
    ) {
        self.id = id
        self.iconName = iconName
        self.label = label
        self.value = value
        self.unit = unit
        self.subLine = subLine
        self.source = source
        self.confidence = confidence
        self.story = story
    }
}

/// A row in the Body Ledger — the "day exploded" surface.
///
/// Anatomy (per `design-handoff/prototype/screen-ledger.jsx` `LedgerRow`):
///   - 32pt icon well on the left (paper-deep, 8pt radius).
///   - Label row: label (body) + editorial number + optional mono unit.
///   - Optional sub-line in muted caption.
///   - SourceChip + confidence label in mono.
///   - Optional "story" block: paper bg, 8pt radius, left clay/hairline border, muted prose.
///   - Hairline divider at the bottom.
public struct LedgerRow: View {
    public let data: LedgerRowData

    public init(data: LedgerRowData) { self.data = data }

    public var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 14) {
                iconWell

                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(data.label)
                            .font(AppFont.body)
                            .foregroundStyle(Theme.textPrimary)

                        Spacer(minLength: Tokens.Space.sm)

                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(data.value)
                                .metricNumber(size: 24)
                                .foregroundStyle(Theme.textPrimary)
                            if let unit = data.unit {
                                Text(unit)
                                    .font(.custom(Tokens.FontFamily.mono, size: 12))
                                    .foregroundStyle(Theme.textSecondary)
                            }
                        }
                    }

                    if let sub = data.subLine {
                        Text(sub)
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.textSecondary)
                            .padding(.top, 2)
                    }

                    HStack(spacing: Tokens.Space.sm) {
                        SourceChip(label: data.source, confidence: data.confidence)
                        Text(confidenceLabel)
                            .font(.custom(Tokens.FontFamily.mono, size: 10))
                            .tracking(0.4)
                            .foregroundStyle(Theme.textFaint)
                    }
                    .padding(.top, Tokens.Space.sm)

                    if let story = data.story {
                        Text(story)
                            .font(.custom(Tokens.FontFamily.sansRegular, size: 12.5))
                            .lineSpacing(12.5 * 0.5) // approx line-height 1.5
                            .foregroundStyle(Theme.textSecondary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(Theme.background)
                            )
                            .overlay(alignment: .leading) {
                                Rectangle()
                                    .fill(Theme.hairlineStrong)
                                    .frame(width: 2)
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .padding(.top, Tokens.Space.sm)
                    }
                }
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 4)

            Divider().background(Theme.hairline)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
    }

    private var iconWell: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Tokens.Color.paperDeep)
            Image(systemName: data.iconName)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Theme.textBody)
        }
        .frame(width: 32, height: 32)
    }

    private var confidenceLabel: String {
        switch data.confidence {
        case .high: return "high confidence"
        case .med:  return "medium"
        case .low:  return "low confidence"
        }
    }

    private var accessibilityDescription: String {
        var parts: [String] = ["\(data.label), \(data.value)\(data.unit.map { " \($0)" } ?? "")"]
        if let sub = data.subLine { parts.append(sub) }
        parts.append("\(confidenceLabel) from \(data.source)")
        if let story = data.story { parts.append(story) }
        return parts.joined(separator: ". ")
    }
}

#Preview("Sleep + recovery") {
    ScrollView {
        VStack(spacing: 0) {
            LedgerRow(data: .init(
                id: "sleep",
                iconName: "moon.stars",
                label: "Sleep",
                value: "6h 12m",
                subLine: "22:48 → 05:00 · efficiency 89%",
                source: "Apple Watch",
                confidence: .high,
                story: "Short by 1h 04m vs. your 14-day baseline. Two wake-ups around 2 am."
            ))
            LedgerRow(data: .init(
                id: "hrv",
                iconName: "waveform.path.ecg",
                label: "HRV",
                value: "38",
                unit: "ms",
                subLine: "14-day baseline 46 ms",
                source: "Apple Watch",
                confidence: .high,
                story: "Down 18%. Together with the short sleep, this is what flipped today to yellow."
            ))
            LedgerRow(data: .init(
                id: "weight",
                iconName: "scalemass",
                label: "Weight",
                value: "—",
                subLine: "last logged Sat · 184.2 lb",
                source: "manual",
                confidence: .low,
                story: "Two missed weigh-ins. Trend-confidence drops fast without daily data. A smart scale fixes this."
            ))
        }
        .padding(20)
    }
    .background(Theme.background)
}
