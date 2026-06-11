import SwiftUI

/// Tide roundel: a basin circle plus one waterline.
///
/// The waterline height encodes `BodyMode` for in-app surfaces. The installed app
/// icon uses the same mark as a static ink treatment for recognisability.
public struct TideMark: View {
    public enum Style {
        case ink
        case mode
    }

    public let mode: BodyMode
    public let size: CGFloat
    public let style: Style
    public let showsFill: Bool
    public let animates: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(
        mode: BodyMode = .yellow,
        size: CGFloat = 44,
        style: Style = .ink,
        showsFill: Bool = true,
        animates: Bool = false
    ) {
        self.mode = mode
        self.size = size
        self.style = style
        self.showsFill = showsFill
        self.animates = animates
    }

    public var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !shouldAnimate)) { context in
            let level = waterLevel(at: context.date)
            ZStack {
                if showsFill {
                    TideWaterFill(level: level)
                        .fill(waterColor)
                        .clipShape(Circle().inset(by: size * 0.09))
                }

                TideWaterline(level: level)
                    .stroke(
                        lineColor,
                        style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round, lineJoin: .round)
                    )
                    .clipShape(Circle().inset(by: size * 0.09))

                Circle()
                    .stroke(lineColor, lineWidth: strokeWidth)
                    .padding(size * 0.09)
            }
            .frame(width: size, height: size)
        }
        .frame(width: size, height: size)
        .animation(.easeInOut(duration: Tokens.Motion.slide), value: mode)
        .accessibilityLabel("\(AppBrand.name) mark")
    }

    private var shouldAnimate: Bool {
        animates && !reduceMotion
    }

    private var strokeWidth: CGFloat {
        max(2, size * 0.04)
    }

    private var lineColor: Color {
        switch style {
        case .ink: return Theme.textPrimary
        case .mode: return mode.tint
        }
    }

    private var waterColor: Color {
        switch style {
        case .ink: return Theme.textPrimary.opacity(0.08)
        case .mode: return mode.softTint
        }
    }

    private func waterLevel(at date: Date) -> CGFloat {
        let base: CGFloat
        switch mode {
        case .green: base = 38
        case .yellow: base = 54
        case .red: base = 70
        }

        guard shouldAnimate else { return base }
        let seconds = date.timeIntervalSinceReferenceDate
        let cycle = seconds.truncatingRemainder(dividingBy: Tokens.Motion.orbBreathe) / Tokens.Motion.orbBreathe
        return base + CGFloat(sin(cycle * .pi * 2.0)) * 1.5
    }
}

/// Horizontal lockup for headers, settings, empty states, and future marketing surfaces.
public struct TideLockup: View {
    public enum Size {
        case small
        case regular

        var markSize: CGFloat {
            switch self {
            case .small: return 32
            case .regular: return 44
            }
        }

        var wordSize: CGFloat {
            switch self {
            case .small: return 22
            case .regular: return 34
            }
        }
    }

    public let size: Size
    public let mode: BodyMode
    public let animates: Bool

    public init(size: Size = .regular, mode: BodyMode = .yellow, animates: Bool = false) {
        self.size = size
        self.mode = mode
        self.animates = animates
    }

    public var body: some View {
        HStack(alignment: .center, spacing: size.markSize * 0.16) {
            TideMark(mode: mode, size: size.markSize, style: .ink, animates: animates)
            Text(AppBrand.name)
                .font(.custom(Tokens.FontFamily.serif, size: size.wordSize))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(AppBrand.name)
    }
}

/// Backward-compatible app mark wrapper used by existing screens.
public struct AppLogoMark: View {
    public enum Size {
        case small
        case regular
        case large

        var side: CGFloat {
            switch self {
            case .small: return 34
            case .regular: return 44
            case .large: return 72
            }
        }
    }

    private let size: Size
    private let mode: BodyMode
    private let animates: Bool

    public init(size: Size = .regular, mode: BodyMode = .yellow, animates: Bool = false) {
        self.size = size
        self.mode = mode
        self.animates = animates
    }

    public var body: some View {
        TideMark(mode: mode, size: size.side, style: .ink, animates: animates)
    }
}

private struct TideWaterline: Shape {
    var level: CGFloat

    var animatableData: CGFloat {
        get { level }
        set { level = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 100.0
        let sy = rect.height / 100.0

        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy)
        }

        var path = Path()
        path.move(to: p(9, level))
        path.addCurve(
            to: p(50, level),
            control1: p(23, level - 7),
            control2: p(36, level + 7)
        )
        path.addCurve(
            to: p(91, level),
            control1: p(64, level - 7),
            control2: p(77, level + 7)
        )
        return path
    }
}

private struct TideWaterFill: Shape {
    var level: CGFloat

    var animatableData: CGFloat {
        get { level }
        set { level = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var path = TideWaterline(level: level).path(in: rect)
        path.addLine(to: CGPoint(x: rect.maxX * 0.91 + rect.minX * 0.09, y: rect.maxY * 0.97 + rect.minY * 0.03))
        path.addLine(to: CGPoint(x: rect.maxX * 0.09 + rect.minX * 0.91, y: rect.maxY * 0.97 + rect.minY * 0.03))
        path.closeSubpath()
        return path
    }
}

#Preview("Tide mark") {
    HStack(spacing: 20) {
        TideMark(mode: .green, size: 72, style: .mode, animates: true)
        TideMark(mode: .yellow, size: 72, style: .mode, animates: true)
        TideMark(mode: .red, size: 72, style: .mode, animates: true)
    }
    .padding()
    .background(Theme.background)
}

#Preview("Tide lockup") {
    VStack(alignment: .leading, spacing: 20) {
        TideLockup(size: .regular)
        TideLockup(size: .small, mode: .green, animates: true)
    }
    .padding()
    .background(Theme.background)
}
