import SwiftUI

/// Trust surface for source routing, coverage, and connected devices.
struct SourcesView: View {
    @State private var viewModel: SourcesViewModel
    @State private var showOuraSheet = false

    init(viewModel: SourcesViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                coverageHero
                appleHealthPilot
                routingTable
                sourceGroup("Connected", sources: viewModel.connectedSources)
                sourceGroup("Pending", sources: viewModel.pendingSources)
                sourceGroup("Available", sources: viewModel.availableSources)
                sourceGroup("Disabled", sources: viewModel.disabledSources)
                knownFoods
                footer
            }
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Theme.background)
        .task { await viewModel.refresh() }
        .sheet(isPresented: $showOuraSheet, onDismiss: { Task { await viewModel.refresh() } }) {
            NavigationStack {
                OuraConnectionView()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Body OS")
                .kickerStyle()
            Text("What's flowing in.")
                .font(.custom(Tokens.FontFamily.serif, size: 30))
                .foregroundStyle(Theme.textPrimary)
            Text("Each metric is routed to the source that's best at it. Add more devices and coverage rises automatically.")
                .font(.custom(Tokens.FontFamily.sansRegular, size: 13.5))
                .lineSpacing(3)
                .foregroundStyle(Theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 330, alignment: .leading)
        }
        .padding(.top, 54)
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    private var coverageHero: some View {
        HStack(spacing: 16) {
            SourceCoverageRing(percent: viewModel.weeklyCoverage)
                .frame(width: 76, height: 76)

            VStack(alignment: .leading, spacing: 4) {
                Text("Coverage this week")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Theme.textPrimary)
                Text(viewModel.coverageSentence)
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 12.5))
                    .lineSpacing(3)
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
        .padding(.top, 20)
        .padding(.horizontal, 16)
    }

    private var appleHealthPilot: some View {
        VStack(alignment: .leading, spacing: 12) {
            SourcesSectionHead(label: "Apple Watch pilot", right: "14-day trial")
            VStack(alignment: .leading, spacing: 0) {
                ForEach(viewModel.appleHealthPilotRows) { row in
                    PilotChecklistRow(row: row)
                    if row.id != viewModel.appleHealthPilotRows.last?.id {
                        Divider().background(Theme.hairline)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
        }
        .padding(.top, 24)
        .padding(.horizontal, 16)
    }

    private var routingTable: some View {
        VStack(alignment: .leading, spacing: 12) {
            SourcesSectionHead(label: "Metric routing", right: "best per metric")
            VStack(spacing: 0) {
                ForEach(viewModel.routingRows) { row in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.metric)
                                .font(AppFont.caption)
                                .foregroundStyle(Theme.textPrimary)
                            Text(row.reason)
                                .font(.custom(Tokens.FontFamily.sansRegular, size: 11))
                                .foregroundStyle(Theme.textSecondary)
                        }
                        Spacer()
                        SourceChip(label: row.source, confidence: .high)
                    }
                    .padding(.vertical, 10)

                    if row.id != viewModel.routingRows.last?.id {
                        Divider().background(Theme.hairline)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
        }
        .padding(.top, 24)
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func sourceGroup(_ title: String, sources: [BodySource]) -> some View {
        if !sources.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SourcesSectionHead(label: title, right: "\(sources.count)")
                VStack(spacing: 10) {
                    ForEach(sources) { source in
                        SourceCard(source: source) {
                            if source.status == .disabled {
                                return
                            } else if source.id == "oura" {
                                showOuraSheet = true
                            } else if source.id == "healthkit" {
                                Task { await viewModel.connectHealthKit() }
                            }
                        }
                    }
                }
            }
            .padding(.top, 24)
            .padding(.horizontal, 16)
        }
    }

    private var knownFoods: some View {
        VStack(alignment: .leading, spacing: 12) {
            SourcesSectionHead(label: "Known foods", right: "learned from chat")
            VStack(alignment: .leading, spacing: 6) {
                Text("No known foods learned yet")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textPrimary)
                Text("This stays empty until meals are actually logged. BodyOS should not ship sample foods or calories as live data.")
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 11.5))
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
        }
        .padding(.top, 24)
        .padding(.horizontal, 16)
    }

    private var footer: some View {
        Text("Use each device for what it's good at. Never trust a single wearable as the full truth.")
            .font(.custom(Tokens.FontFamily.serif, size: 14))
            .italic()
            .foregroundStyle(Theme.textSecondary)
            .multilineTextAlignment(.center)
            .lineSpacing(4)
            .frame(maxWidth: .infinity)
            .padding(.top, 24)
            .padding(.horizontal, 28)
            .padding(.bottom, 8)
    }
}

private struct SourceCard: View {
    let source: BodySource
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: source.systemImage)
                    .font(.system(size: 20, weight: .regular))
                    .foregroundStyle(Theme.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Theme.backgroundDeep)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(source.name)
                            .font(AppFont.bodyMedium)
                            .foregroundStyle(Theme.textPrimary)
                        Circle()
                            .fill(statusColor)
                            .frame(width: 6, height: 6)
                        Text(statusText)
                            .font(.custom(Tokens.FontFamily.mono, size: 9.5))
                            .tracking(0.6)
                            .textCase(.uppercase)
                            .foregroundStyle(Theme.textSecondary)
                    }
                    Text(source.role)
                        .font(.custom(Tokens.FontFamily.sansRegular, size: 11.5))
                        .foregroundStyle(Theme.textSecondary)
                }
                Spacer()
            }

            HStack(spacing: 10) {
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Theme.backgroundDeep)
                        Capsule()
                            .fill(source.status == .available ? Theme.hairlineStrong : Theme.textPrimary)
                            .frame(width: proxy.size.width * source.coverage)
                    }
                }
                .frame(height: 4)

                Text(source.status == .available ? "-" : "\(Int((source.coverage * 100).rounded()))%")
                    .font(AppFont.tag)
                    .foregroundStyle(Theme.textSecondary)
                    .frame(width: 36, alignment: .trailing)
            }

            HStack {
                Text(source.subline)
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 11.5))
                    .foregroundStyle(Theme.textSecondary)
                Spacer()
                if source.status != .disabled {
                    Button(action: action) {
                        Text(actionText)
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.accent)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
    }

    private var statusColor: Color {
        switch source.status {
        case .connected: return Theme.green
        case .connectedNoData, .pending: return Theme.yellow
        case .available, .disabled: return Theme.textFaint
        }
    }

    private var statusText: String {
        switch source.status {
        case .connected: return "connected"
        case .connectedNoData: return "no data"
        case .pending: return "pending"
        case .available: return "available"
        case .disabled: return "disabled"
        }
    }

    private var actionText: String {
        switch source.status {
        case .connected, .connectedNoData: return "refresh"
        case .pending: return "finish setup"
        case .available: return "connect"
        case .disabled: return ""
        }
    }
}

private struct PilotChecklistRow: View {
    let row: AppleHealthPilotRow

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: iconName)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(statusColor)
                .frame(width: 20, height: 20)
                .padding(.top, 10)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(row.title)
                        .font(AppFont.caption)
                        .foregroundStyle(Theme.textPrimary)
                    Text(row.status.rawValue)
                        .font(.custom(Tokens.FontFamily.mono, size: 9))
                        .tracking(0.7)
                        .textCase(.uppercase)
                        .foregroundStyle(statusColor)
                }
                Text(row.detail)
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 11.5))
                    .lineSpacing(3)
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.vertical, 10)
        }
    }

    private var iconName: String {
        switch row.status {
        case .granted, .live: return "checkmark.circle.fill"
        case .requested, .checking, .waiting: return "clock.fill"
        case .sample: return "testtube.2"
        case .dormant: return "pause.circle.fill"
        case .missing: return "exclamationmark.circle.fill"
        }
    }

    private var statusColor: Color {
        switch row.status {
        case .granted, .live: return Theme.green
        case .requested, .checking, .waiting: return Theme.yellow
        case .sample, .dormant: return Theme.textSecondary
        case .missing: return Theme.red
        }
    }
}

private struct SourceCoverageRing: View {
    let percent: Int

    var body: some View {
        ZStack {
            Circle()
                .stroke(Theme.hairline, lineWidth: 5)
            Circle()
                .trim(from: 0, to: CGFloat(percent) / 100)
                .stroke(Theme.textPrimary, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 1) {
                Text("\(percent)")
                    .font(.custom(Tokens.FontFamily.serif, size: 22))
                    .foregroundStyle(Theme.textPrimary)
                Text("%")
                    .font(.custom(Tokens.FontFamily.mono, size: 8.5))
                    .foregroundStyle(Theme.textSecondary)
            }
        }
    }
}

private struct SourcesSectionHead: View {
    let label: String
    let right: String

    var body: some View {
        HStack(spacing: 10) {
            Text(label)
                .kickerStyle(color: Theme.textBody)
            Rectangle()
                .fill(Theme.hairline)
                .frame(height: 1)
            Text(right)
                .font(AppFont.tag)
                .tracking(1.0)
                .textCase(.uppercase)
                .foregroundStyle(Theme.textBody)
        }
        .padding(.horizontal, 4)
    }
}
