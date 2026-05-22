import SwiftUI

/// Primary ink-on-paper button. One per screen, max — per design handoff voice rules.
struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppFont.bodyMedium)
                .foregroundStyle(Theme.background)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                        .fill(Theme.textPrimary)
                )
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: title)
    }
}
