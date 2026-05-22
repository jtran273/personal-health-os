import SwiftUI

/// Display data for a single `MetricTile`. Pre-formatted strings — the tile renders, it doesn't format.
public struct MetricTileData: Identifiable, Equatable {
    public let id: String
    public let label: String              // "Sleep", "HRV", "Resting HR"
    public let value: String              // "6h 12m", "38 ms", "—"
    public let delta: String?             // "−1h 04m", "+6", "so far", "est. ±220"
    public let trend: [Double?]           // last 7–14 values, nil = gap
    public let source: String             // "Oura", "iPhone", "photos"
    public let confidence: Confidence

    public init(
        id: String,
        label: String,
        value: String,
        delta: String? = nil,
        trend: [Double?] = [],
        source: String,
        confidence: Confidence
    ) {
        self.id = id
        self.label = label
        self.value = value
        self.delta = delta
        self.trend = trend
        self.source = source
        self.confidence = confidence
    }
}

/// The 2-column grid tile on Today, "so far". One metric → editorial number + delta + sparkline.
///
/// Anatomy (per `design-handoff/prototype/atoms.jsx` `MetricTile`):
///   - Top row: ALL-CAPS small label + SourceChip on the right.
///   - Middle: serif editorial number (30pt).
///   - Bottom: mono delta on the left + Sparkline on the right.
///   - 14pt padding, 14pt radius, surface bg, hair border, 96pt min height.
///   - Full tile is the hit target — wraps in a Button.
public struct MetricTile: View {
    public let data: MetricTileData
    public let action: (() -> Void)?

    public init(data: MetricTileData, action: (() -> Void)? = nil) {
        self.data = data
        self.action = action
    }

    public var body: some View {
        Button {
            action?()
        } label: {
            content
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
        .accessibilityElement(children: .combine)
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.sm) {
            HStack(alignment: .firstTextBaseline) {
                Text(data.label)
                    .kickerStyle()
                Spacer(minLength: Tokens.Space.sm)
                SourceChip(label: data.source, confidence: data.confidence)
            }

            Text(data.value)
                .metricNumber(size: 30)
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            HStack(alignment: .center) {
                if let delta = data.delta {
                    Text(delta)
                        .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                        .foregroundStyle(Theme.textSecondary)
                }
                Spacer(minLength: Tokens.Space.sm)
                Sparkline(data: data.trend, confidence: data.confidence)
                    .frame(width: 56, height: 16)
            }
        }
        .padding(EdgeInsets(top: 14, leading: 14, bottom: 12, trailing: 14))
        .frame(minHeight: 96, alignment: .topLeading)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
    }
}

#Preview("Grid") {
    let tiles: [MetricTileData] = [
        .init(id: "sleep", label: "Sleep", value: "6h 12m", delta: "−1h 04m",
              trend: [7.1, 7.4, 7.8, 6.6, 7.2, 5.8, 6.2], source: "Oura", confidence: .high),
        .init(id: "hrv", label: "HRV", value: "38 ms", delta: "−18%",
              trend: [54, 52, 48, 46, 50, 42, 38], source: "Oura", confidence: .high),
        .init(id: "rhr", label: "Resting HR", value: "64 bpm", delta: "+6",
              trend: [58, 57, 59, 60, 58, 62, 64], source: "Oura", confidence: .high),
        .init(id: "kcal", label: "Eaten", value: "1,820", delta: "est. ±220",
              trend: [2200, 2400, 1900, 2600, 2100, 2300, 1820], source: "photos", confidence: .med),
        .init(id: "protein", label: "Protein", value: "92 g", delta: "goal 140",
              trend: [110, 120, 95, 140, 100, 85, 92], source: "photos", confidence: .med),
        .init(id: "weight", label: "Weight", value: "—", delta: "last Sat 184.2",
              trend: [185.1, 184.8, 184.6, 184.4, 184.2, nil, nil], source: "manual", confidence: .low)
    ]

    return LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
        ForEach(tiles) { tile in
            MetricTile(data: tile, action: {})
        }
    }
    .padding(16)
    .background(Theme.background)
}
