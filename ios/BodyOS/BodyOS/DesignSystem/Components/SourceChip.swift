import SwiftUI

/// Small attribution pill: a confidence dot + an ALL-CAPS mono source name on a paper-deep capsule.
///
/// Anatomy (per `design-handoff/prototype/tokens.css` `.hc-src`):
///   - Background `Tokens.Color.paperDeep`.
///   - Mono font (JetBrains Mono), uppercase, ~10pt, 0.04em tracking.
///   - 5pt dot, color encodes confidence (green = high, yellow = med, red = low).
public struct SourceChip: View {
    public let label: String
    public let confidence: Confidence

    public init(label: String, confidence: Confidence) {
        self.label = label
        self.confidence = confidence
    }

    /// Convenience: derive both label and confidence from a `MetricSample`.
    public init<T>(sample: MetricSample<T>) {
        self.label = sample.source.displayName
        self.confidence = sample.confidenceBand
    }

    /// Convenience: just a source, with optional explicit confidence (default high).
    public init(source: MetricSource, confidence: Confidence = .high) {
        self.label = source.displayName
        self.confidence = confidence
    }

    public var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(confidence.dotColor)
                .frame(width: 5, height: 5)
            Text(label)
                .font(.custom(Tokens.FontFamily.mono, size: 9.5))
                .tracking(0.4) // ≈ 0.04em at 9.5pt
                .textCase(.uppercase)
                .foregroundStyle(Theme.textSecondary)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(
            Capsule().fill(Tokens.Color.paperDeep)
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Source \(label), \(confidence.rawValue) confidence")
    }
}

// MARK: - Previews

#Preview("Confidence variants") {
    VStack(alignment: .leading, spacing: 12) {
        SourceChip(label: "Oura", confidence: .high)
        SourceChip(label: "Apple Watch", confidence: .med)
        SourceChip(label: "Estimate", confidence: .low)
    }
    .padding(24)
    .background(Theme.background)
}

#Preview("From sample") {
    let sample = MetricSample(value: 412, source: .oura, confidence: 0.92, capturedAt: .now)
    SourceChip(sample: sample)
        .padding(24)
        .background(Theme.background)
}

#Preview("On row") {
    HStack {
        Text("Sleep")
            .foregroundStyle(Theme.textSecondary)
            .kickerStyle()
        Spacer()
        SourceChip(source: .oura, confidence: .high)
    }
    .padding(24)
    .background(Theme.surface)
}
