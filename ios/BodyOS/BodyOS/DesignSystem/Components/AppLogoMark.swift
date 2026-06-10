import SwiftUI

/// BodyOS brand mark: a calibrated body ring with a small ledger notch.
/// Keep it token-driven so app chrome, empty states, and future icons share one shape.
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

        var glyphSize: CGFloat {
            switch self {
            case .small: return 16
            case .regular: return 21
            case .large: return 34
            }
        }
    }

    private let size: Size

    public init(size: Size = .regular) {
        self.size = size
    }

    public var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size.side * 0.28, style: .continuous)
                .fill(Theme.surface)

            RoundedRectangle(cornerRadius: size.side * 0.28, style: .continuous)
                .strokeBorder(Theme.hairlineStrong, lineWidth: 1)

            Circle()
                .stroke(Theme.accent, lineWidth: max(2, size.side * 0.07))
                .padding(size.side * 0.22)

            Circle()
                .trim(from: 0.07, to: 0.28)
                .stroke(Theme.green, style: StrokeStyle(lineWidth: max(2, size.side * 0.07), lineCap: .round))
                .rotationEffect(.degrees(-28))
                .padding(size.side * 0.22)

            Text("B")
                .font(.custom(Tokens.FontFamily.serif, size: size.glyphSize))
                .foregroundStyle(Theme.textPrimary)
                .offset(y: -1)

            RoundedRectangle(cornerRadius: size.side * 0.04, style: .continuous)
                .fill(Theme.yellow)
                .frame(width: size.side * 0.16, height: size.side * 0.05)
                .offset(x: size.side * 0.22, y: size.side * 0.22)
        }
        .frame(width: size.side, height: size.side)
        .accessibilityLabel("BodyOS")
    }
}

#Preview {
    HStack(spacing: 16) {
        AppLogoMark(size: .small)
        AppLogoMark()
        AppLogoMark(size: .large)
    }
    .padding()
    .background(Theme.background)
}
