import SwiftUI

/// Pill-shaped badge showing the current BodyMode, tinted by mode.
struct BodyModeBadge: View {
    let mode: BodyMode

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(mode.tint)
                .frame(width: 8, height: 8)
            Text(mode.displayName)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule().fill(mode.tint.opacity(0.15))
        )
        .overlay(
            Capsule().strokeBorder(mode.tint.opacity(0.4), lineWidth: 1)
        )
    }
}
