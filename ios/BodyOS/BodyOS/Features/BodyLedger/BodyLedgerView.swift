import SwiftUI

/// Source-attributed daily ledger surface: one selected day exploded into metric rows.
struct BodyLedgerView: View {
    @State private var viewModel: BodyLedgerViewModel
    @State private var weightViewModel: WeightViewModel
    @State private var showWeightSheet = false

    init(viewModel: BodyLedgerViewModel, weightViewModel: WeightViewModel) {
        _viewModel = State(initialValue: viewModel)
        _weightViewModel = State(initialValue: weightViewModel)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                coverageBanner
                ledgerSections
                footnote
            }
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Theme.background)
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
        .sheet(isPresented: $showWeightSheet) {
            ManualWeightEntrySheet(viewModel: weightViewModel) {
                await viewModel.refreshFromStore(selectingToday: true)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Body Ledger")
                    .kickerStyle()
                Text("\(Self.titleDate(viewModel.selectedDate ?? Date())) - one row in your body's book.")
                    .font(.custom(Tokens.FontFamily.serif, size: 28))
                    .foregroundStyle(Theme.textPrimary)
                    .lineSpacing(1)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 6) {
                ForEach(viewModel.dayPills) { pill in
                    DayPill(
                        pill: pill,
                        isActive: Calendar.current.isDate(pill.date, inSameDayAs: viewModel.selectedDate ?? Date())
                    ) {
                        viewModel.select(pill.date)
                    }
                }
            }
            .frame(maxWidth: .infinity)

            Button {
                showWeightSheet = true
            } label: {
                Label("Log weight", systemImage: "scalemass")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.accent)
                    .frame(maxWidth: .infinity, minHeight: 42)
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                            .strokeBorder(Theme.hairlineStrong, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 28)
        .padding(.horizontal, 20)
        .padding(.bottom, 18)
    }

    private var coverageBanner: some View {
        HStack(spacing: 12) {
            CoverageRing(percent: viewModel.coveragePercent)
                .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text("Coverage today")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textPrimary)
                Text(viewModel.coverageSentence)
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 11.5))
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }

    private var ledgerSections: some View {
        VStack(alignment: .leading, spacing: 24) {
            ForEach(viewModel.sections) { section in
                VStack(alignment: .leading, spacing: 8) {
                    LedgerSectionHead(label: section.title, right: section.right)
                    VStack(spacing: 0) {
                        ForEach(section.rows) { row in
                            LedgerRow(data: row)
                        }
                    }
                }
            }
        }
        .padding(.top, 8)
        .padding(.horizontal, 20)
    }

    private var footnote: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("How the ledger works")
                .kickerStyle()
            Text("Each metric stores a normalized value, source, and confidence. When sources disagree, BodyOS picks the source best suited to that metric. Low confidence stays visible so weak data does not look certain.")
                .font(.custom(Tokens.FontFamily.sansRegular, size: 12.5))
                .lineSpacing(6)
                .foregroundStyle(Theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.top, 24)
        .padding(.horizontal, 4)
        .padding(.bottom, 16)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Theme.hairline)
                .frame(height: 1)
        }
        .padding(.horizontal, 20)
    }

    private static func titleDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "E, MMM d"
        return formatter.string(from: date)
    }
}

private struct DayPill: View {
    let pill: LedgerDayPill
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(Self.weekday(pill.date))
                    .font(.custom(Tokens.FontFamily.mono, size: 9))
                    .tracking(0.4)
                    .textCase(.uppercase)
                Text(Self.day(pill.date))
                    .font(.custom(Tokens.FontFamily.serif, size: 15))
                Circle()
                    .fill(pill.hasData ? (isActive ? Theme.background : Theme.accent) : Color.clear)
                    .frame(width: 4, height: 4)
            }
            .foregroundStyle(isActive ? Theme.background : Theme.textSecondary)
            .frame(minWidth: 36)
            .padding(.horizontal, 6)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(isActive ? Theme.textPrimary : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }

    private static func weekday(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "E"
        return formatter.string(from: date)
    }

    private static func day(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }
}

private struct CoverageRing: View {
    let percent: Int

    var body: some View {
        ZStack {
            Circle()
                .stroke(Theme.hairlineStrong, lineWidth: 3)
            Circle()
                .trim(from: 0, to: CGFloat(max(0, min(100, percent))) / 100)
                .stroke(Theme.green, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(percent)")
                .font(AppFont.tag)
                .foregroundStyle(Theme.textPrimary)
        }
    }
}

private struct LedgerSectionHead: View {
    let label: String
    let right: String

    var body: some View {
        HStack {
            Text(label)
                .kickerStyle(color: Theme.textBody)
            Spacer()
            Text(right)
                .font(AppFont.tag)
                .tracking(1.0)
                .foregroundStyle(Theme.textSecondary)
                .textCase(.uppercase)
        }
    }
}
