import SwiftUI

/// A small line chart for a metric trend.
///
/// Anatomy (per `design-handoff/prototype/atoms.jsx` `Spark`):
///   - `Canvas` path with `StrokeStyle`.
///   - Dash array changes with confidence: `high = solid`, `med = [3, 2]`, `low = [1, 2]`.
///   - `nil` values break the path (gaps).
///   - Optional fill: 10% opacity area under the curve, anchored to the bottom.
///   - End dot drawn on the last non-null point.
///   - Smooth mode: midpoint quadratic curves between samples.
public struct Sparkline: View {
    public let data: [Double?]
    public let confidence: Confidence
    public let color: Color
    public let fill: Bool
    public let smooth: Bool
    public let showEndDot: Bool

    public init(
        data: [Double?],
        confidence: Confidence = .high,
        color: Color = Tokens.Color.ink2,
        fill: Bool = false,
        smooth: Bool = true,
        showEndDot: Bool = true
    ) {
        self.data = data
        self.confidence = confidence
        self.color = color
        self.fill = fill
        self.smooth = smooth
        self.showEndDot = showEndDot
    }

    public var body: some View {
        GeometryReader { geo in
            Canvas { ctx, size in
                draw(in: ctx, size: size)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .accessibilityHidden(true)
    }

    private func draw(in ctx: GraphicsContext, size: CGSize) {
        let nonNil = data.compactMap { $0 }
        guard !nonNil.isEmpty, data.count > 1 else { return }
        let minV: Double = nonNil.min()!
        let maxV: Double = nonNil.max()!
        let range: Double = max(maxV - minV, .ulpOfOne)

        let width: Double = size.width
        let height: Double = size.height
        let count: Int = data.count

        // Inset by 2pt so the stroke and end dot don't clip.
        var xs: [Double] = []
        xs.reserveCapacity(count)
        for i in 0..<count {
            let t: Double = Double(i) / Double(count - 1)
            xs.append(t * (width - 4) + 2)
        }
        var ys: [Double?] = []
        ys.reserveCapacity(count)
        for v in data {
            if let v = v {
                let normalized: Double = (v - minV) / range
                let y: Double = (height - 4) - normalized * (height - 8) + 2
                ys.append(y)
            } else {
                ys.append(nil)
            }
        }

        // Build path that breaks on nils.
        var line = Path()
        var last: Int?
        for i in 0..<data.count {
            guard let y = ys[i] else { last = nil; continue }
            let point = CGPoint(x: xs[i], y: y)
            if last == nil {
                line.move(to: point)
            } else if smooth, let prev = last {
                let prevY = ys[prev]!
                let midX = (xs[prev] + xs[i]) / 2
                let midY = (prevY + y) / 2
                line.addQuadCurve(
                    to: CGPoint(x: midX, y: midY),
                    control: CGPoint(x: midX, y: prevY)
                )
                line.addQuadCurve(
                    to: point,
                    control: CGPoint(x: midX, y: y)
                )
            } else {
                line.addLine(to: point)
            }
            last = i
        }

        // Optional fill: close to baseline.
        if fill, let firstNonNil = ys.firstIndex(where: { $0 != nil }),
           let lastNonNil = ys.lastIndex(where: { $0 != nil }) {
            var area = line
            area.addLine(to: CGPoint(x: xs[lastNonNil], y: size.height))
            area.addLine(to: CGPoint(x: xs[firstNonNil], y: size.height))
            area.closeSubpath()
            ctx.fill(area, with: .color(color.opacity(0.10)))
        }

        let dash: [CGFloat]
        switch confidence {
        case .high: dash = []
        case .med:  dash = [3, 2]
        case .low:  dash = [1, 2]
        }
        ctx.stroke(
            line,
            with: .color(color),
            style: StrokeStyle(lineWidth: 1.2, lineCap: .round, lineJoin: .round, dash: dash)
        )

        if showEndDot, let endIdx = ys.lastIndex(where: { $0 != nil }), let endY = ys[endIdx] {
            let dot = Path(ellipseIn: CGRect(x: xs[endIdx] - 2, y: endY - 2, width: 4, height: 4))
            ctx.fill(dot, with: .color(color))
        }
    }
}

#Preview("Confidence variants") {
    VStack(alignment: .leading, spacing: 16) {
        Sparkline(data: [54, 52, 48, 46, 50, 42, 38], confidence: .high)
            .frame(width: 80, height: 24)
        Sparkline(data: [2200, 2400, 1900, 2600, 2100, 2300, 1820], confidence: .med)
            .frame(width: 80, height: 24)
        Sparkline(data: [185.1, 184.8, 184.6, 184.4, 184.2, nil, nil], confidence: .low)
            .frame(width: 80, height: 24)
    }
    .padding(24)
    .background(Theme.background)
}

#Preview("Filled") {
    Sparkline(data: [7.1, 7.4, 7.8, 6.6, 7.2, 5.8, 6.2], fill: true)
        .frame(width: 160, height: 48)
        .padding(24)
        .background(Theme.surface)
}
