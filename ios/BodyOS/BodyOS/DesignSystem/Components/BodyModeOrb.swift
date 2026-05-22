import SwiftUI

/// The Body Mode Orb — a breathing organic blob whose color encodes the day's mode.
///
/// Anatomy (per `design-handoff/README.md`):
///   - 240pt default. Centered behind the day's headline on the Today screen.
///   - Radial gradient (inner highlight → mode soft fill) plus a mode-stroke outline.
///   - Inner white highlight ring at ~96% scale.
///   - Breathing animation: 9s loop, morphs between 3 stable SVG paths with spline easing `0.4 0 0.2 1`.
///   - Reduce-motion: freezes at the first keyframe (no morph).
public struct BodyModeOrb: View {
    public let mode: BodyMode
    public let size: CGFloat
    public let breathe: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(mode: BodyMode, size: CGFloat = 240, breathe: Bool = true) {
        self.mode = mode
        self.size = size
        self.breathe = breathe
    }

    public var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !shouldAnimate)) { context in
            let progress = orbProgress(at: context.date)
            ZStack {
                // Fill + stroke
                BlobShape(progress: progress)
                    .fill(
                        RadialGradient(
                            colors: [mode.orbInner, mode.orbFill],
                            center: UnitPoint(x: 0.4, y: 0.38),
                            startRadius: 0,
                            endRadius: size * 0.65
                        )
                    )
                    .overlay(
                        BlobShape(progress: progress)
                            .stroke(mode.orbStroke, lineWidth: max(1, size * 0.006))
                    )
                    .blur(radius: max(0.5, size * 0.004)) // matches feGaussianBlur stdDeviation="0.4"

                // Inner highlight ring at ~96% scale
                BlobShape(progress: progress)
                    .stroke(Color.white.opacity(0.5), lineWidth: max(0.5, size * 0.003))
                    .scaleEffect(0.96)
                    .offset(x: -size * 0.015, y: -size * 0.015)
            }
            .frame(width: size, height: size)
        }
        .frame(width: size, height: size)
        .accessibilityElement()
        .accessibilityLabel("Body mode: \(mode.displayName)")
    }

    private var shouldAnimate: Bool { breathe && !reduceMotion }

    /// Returns a continuous progress in `[0, 3)` driving the three-segment morph (p1→p2→p3→p1).
    private func orbProgress(at date: Date) -> Double {
        guard shouldAnimate else { return 0 }
        let seconds = date.timeIntervalSinceReferenceDate
        let cycle = seconds.truncatingRemainder(dividingBy: Tokens.Motion.orbBreathe) / Tokens.Motion.orbBreathe
        return cycle * 3.0
    }
}

// MARK: - Blob path

/// A morphing organic blob. `progress` is in `[0, 3)`, mapping three segments:
/// `[0, 1)` p1→p2, `[1, 2)` p2→p3, `[2, 3)` p3→p1.
///
/// Each keyframe is a closed bezier with 4 cubic curves, defined in a 100×100 viewBox.
private struct BlobShape: Shape {
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let points = interpolatedKeyframe(progress: progress)
        let scaleX = rect.width / 100.0
        let scaleY = rect.height / 100.0
        func p(_ pt: CGPoint) -> CGPoint {
            CGPoint(x: rect.minX + pt.x * scaleX, y: rect.minY + pt.y * scaleY)
        }

        var path = Path()
        path.move(to: p(points.start))
        for curve in points.curves {
            path.addCurve(to: p(curve.end), control1: p(curve.cp1), control2: p(curve.cp2))
        }
        path.closeSubpath()
        return path
    }

    // MARK: Keyframes (from atoms.jsx ModeOrb p1/p2/p3)

    private static let p1 = Keyframe(
        start: CGPoint(x: 50, y: 12),
        curves: [
            Curve(cp1: CGPoint(x: 72, y: 10), cp2: CGPoint(x: 92, y: 28), end: CGPoint(x: 92, y: 52)),
            Curve(cp1: CGPoint(x: 92, y: 74), cp2: CGPoint(x: 76, y: 90), end: CGPoint(x: 54, y: 92)),
            Curve(cp1: CGPoint(x: 32, y: 94), cp2: CGPoint(x: 12, y: 78), end: CGPoint(x: 10, y: 54)),
            Curve(cp1: CGPoint(x: 8, y: 32), cp2: CGPoint(x: 28, y: 14), end: CGPoint(x: 50, y: 12))
        ]
    )

    private static let p2 = Keyframe(
        start: CGPoint(x: 52, y: 10),
        curves: [
            Curve(cp1: CGPoint(x: 76, y: 14), cp2: CGPoint(x: 94, y: 30), end: CGPoint(x: 90, y: 56)),
            Curve(cp1: CGPoint(x: 86, y: 80), cp2: CGPoint(x: 68, y: 92), end: CGPoint(x: 46, y: 90)),
            Curve(cp1: CGPoint(x: 24, y: 88), cp2: CGPoint(x: 6, y: 72), end: CGPoint(x: 12, y: 48)),
            Curve(cp1: CGPoint(x: 18, y: 26), cp2: CGPoint(x: 30, y: 8), end: CGPoint(x: 52, y: 10))
        ]
    )

    private static let p3 = Keyframe(
        start: CGPoint(x: 48, y: 14),
        curves: [
            Curve(cp1: CGPoint(x: 68, y: 8), cp2: CGPoint(x: 90, y: 24), end: CGPoint(x: 92, y: 50)),
            Curve(cp1: CGPoint(x: 94, y: 78), cp2: CGPoint(x: 74, y: 92), end: CGPoint(x: 50, y: 90)),
            Curve(cp1: CGPoint(x: 28, y: 88), cp2: CGPoint(x: 10, y: 72), end: CGPoint(x: 12, y: 52)),
            Curve(cp1: CGPoint(x: 14, y: 30), cp2: CGPoint(x: 30, y: 18), end: CGPoint(x: 48, y: 14))
        ]
    )

    private func interpolatedKeyframe(progress: Double) -> Keyframe {
        let p = max(0, min(progress, 3.0 - .ulpOfOne))
        let segment = Int(p)
        let local = p - Double(segment)
        let eased = Self.splineEase(local)

        let (a, b): (Keyframe, Keyframe)
        switch segment {
        case 0: (a, b) = (Self.p1, Self.p2)
        case 1: (a, b) = (Self.p2, Self.p3)
        default: (a, b) = (Self.p3, Self.p1)
        }
        return Keyframe.lerp(a, b, t: eased)
    }

    /// Cubic spline approximating `cubic-bezier(0.4, 0, 0.2, 1)` (Material/handoff easing).
    private static func splineEase(_ t: Double) -> Double {
        // Hermite-style smoothstep gives a close visual match without solving a cubic.
        // For higher fidelity later, swap in a Newton-iterated cubic-bezier solver.
        let clamped = max(0, min(1, t))
        return clamped * clamped * (3 - 2 * clamped)
    }
}

private struct Keyframe {
    let start: CGPoint
    let curves: [Curve]

    static func lerp(_ a: Keyframe, _ b: Keyframe, t: Double) -> Keyframe {
        let s = lerpPoint(a.start, b.start, t: t)
        let cs = zip(a.curves, b.curves).map { Curve.lerp($0, $1, t: t) }
        return Keyframe(start: s, curves: cs)
    }
}

private struct Curve {
    let cp1: CGPoint
    let cp2: CGPoint
    let end: CGPoint

    static func lerp(_ a: Curve, _ b: Curve, t: Double) -> Curve {
        Curve(
            cp1: lerpPoint(a.cp1, b.cp1, t: t),
            cp2: lerpPoint(a.cp2, b.cp2, t: t),
            end: lerpPoint(a.end, b.end, t: t)
        )
    }
}

private func lerpPoint(_ a: CGPoint, _ b: CGPoint, t: Double) -> CGPoint {
    CGPoint(x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t)
}

// MARK: - Previews

#Preview("Yellow · 240") {
    BodyModeOrb(mode: .yellow)
        .padding(40)
        .background(Theme.background)
}

#Preview("Green · 180") {
    BodyModeOrb(mode: .green, size: 180)
        .padding(40)
        .background(Theme.background)
}

#Preview("Red · static") {
    BodyModeOrb(mode: .red, size: 200, breathe: false)
        .padding(40)
        .background(Theme.background)
}

#Preview("All three") {
    HStack(spacing: 32) {
        BodyModeOrb(mode: .green, size: 120)
        BodyModeOrb(mode: .yellow, size: 120)
        BodyModeOrb(mode: .red, size: 120)
    }
    .padding(24)
    .background(Theme.background)
}
