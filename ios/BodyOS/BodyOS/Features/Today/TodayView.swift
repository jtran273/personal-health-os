import SwiftUI

/// Single daily briefing: body mode, one action, open loops, metrics, timeline, and coverage.
struct TodayView: View {
    @State private var viewModel: TodayViewModel
    @State private var mealsViewModel: MealsViewModel
    @State private var weightViewModel: WeightViewModel
    @State private var showMealSheet = false
    @State private var showWeightSheet = false

    init(
        viewModel: TodayViewModel,
        mealsViewModel: MealsViewModel,
        weightViewModel: WeightViewModel
    ) {
        _viewModel = State(initialValue: viewModel)
        _mealsViewModel = State(initialValue: mealsViewModel)
        _weightViewModel = State(initialValue: weightViewModel)
    }

    private let columns: [GridItem] = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                statusHeader
                modeHero
                waitingState
                oneThingCard
                openLoopsSection
                metricsSection
                timelineSection
                footer
            }
            .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        .background(Theme.background)
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
        .sheet(isPresented: $showMealSheet) {
            ManualMealEntrySheet(viewModel: mealsViewModel) {
                await viewModel.load()
            }
        }
        .sheet(isPresented: $showWeightSheet) {
            ManualWeightEntrySheet(viewModel: weightViewModel) {
                await viewModel.load()
            }
        }
    }

    private var statusHeader: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Today")
                    .kickerStyle()
                Text(Self.dateString(viewModel.entry?.date ?? Date()))
                    .font(.custom(Tokens.FontFamily.serif, size: 26))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }

            Spacer(minLength: 16)

            ModePill(mode: viewModel.activeMode)
        }
        .padding(.top, 28)
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    private var modeHero: some View {
        VStack(spacing: 6) {
            ZStack {
                BodyModeOrb(mode: viewModel.activeMode, size: 240)
                Text(viewModel.modeHeadline)
                    .font(AppFont.title)
                    .foregroundStyle(Theme.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(0)
                    .frame(maxWidth: 280)
                    .padding(.horizontal, 12)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 240)

            Text(viewModel.modeReason)
                .font(AppFont.caption)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 24)
        }
        .padding(.top, 20)
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    private var oneThingCard: some View {
        let action = viewModel.oneAction
        let mode = viewModel.activeMode

        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text("The one thing")
                    .kickerStyle(color: Theme.textBody)
                Rectangle()
                    .fill(Theme.hairline)
                    .frame(height: 1)
                Text(action.window)
                    .font(AppFont.tag)
                    .tracking(1.0)
                    .foregroundStyle(Theme.textSecondary)
                    .textCase(.uppercase)
            }
            .padding(.bottom, 12)

            HStack(alignment: .top, spacing: 14) {
                Image(systemName: action.systemImage)
                    .font(.system(size: 23, weight: .regular))
                    .foregroundStyle(mode.tint)
                    .frame(width: 46, height: 46)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(mode.softTint)
                    )

                VStack(alignment: .leading, spacing: 6) {
                    Text(action.title)
                        .font(AppFont.heading)
                        .foregroundStyle(Theme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(action.reason)
                        .font(AppFont.caption)
                        .foregroundStyle(Theme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            HStack(spacing: 8) {
                PrimaryButton(title: "Plan it") {}
                Button {} label: {
                    Text("Why this?")
                        .font(AppFont.bodyMedium)
                        .foregroundStyle(Theme.textBody)
                        .frame(minHeight: 44)
                        .padding(.horizontal, 16)
                        .background(
                            RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                                .strokeBorder(Theme.hairlineStrong, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 14)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .fill(Theme.surface)
                Circle()
                    .fill(mode.softTint)
                    .frame(width: 120, height: 120)
                    .blur(radius: 20)
                    .opacity(0.7)
                    .offset(x: 30, y: -30)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
        .padding(.top, 20)
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private var waitingState: some View {
        if viewModel.entry == nil {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "applewatch")
                        .font(.system(size: 14, weight: .semibold))
                    Text("No live ledger row for today")
                        .font(AppFont.caption)
                }
                .foregroundStyle(Theme.textPrimary)

                Text("Today stays empty until Apple Health permission is granted and readable Apple Watch or iPhone samples land. Older rows are kept for trends only; they are not shown as today's metrics.")
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 12.5))
                    .lineSpacing(3)
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .padding(.top, 16)
            .padding(.horizontal, 16)
        }
    }

    @ViewBuilder
    private var openLoopsSection: some View {
        let loops = viewModel.openLoops
        if !loops.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionHead(label: "Open loops", right: "\(loops.count)")
                VStack(spacing: 8) {
                    ForEach(loops) { loop in
                        OpenLoopRow(loop: loop) {
                            handleOpenLoop(loop)
                        }
                    }
                }
            }
            .padding(.top, 20)
            .padding(.horizontal, 20)
        }
    }

    private var metricsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHead(label: "Today, so far", right: "7 days")
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(metricTiles) { tile in
                    MetricTile(data: tile)
                }
            }
        }
        .padding(.top, 24)
        .padding(.horizontal, 20)
    }

    @ViewBuilder
    private var timelineSection: some View {
        let events = viewModel.timelineEvents
        if !events.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                SectionHead(label: "Day, in order")
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(events) { event in
                        TimelineRow(event: event)
                    }
                }
                .padding(.leading, 18)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Theme.hairline)
                        .frame(width: 1)
                        .padding(.leading, 5)
                        .padding(.vertical, 6)
                }
            }
            .padding(.top, 24)
            .padding(.horizontal, 20)
        }
    }

    private var footer: some View {
        Text(viewModel.footerText)
            .font(AppFont.caption)
            .italic()
            .foregroundStyle(Theme.textFaint)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.top, 18)
            .padding(.horizontal, 28)
            .padding(.bottom, 8)
    }

    private var metricTiles: [MetricTileData] {
        let sleep = viewModel.entry?.sleep
        let steps = viewModel.entry?.steps
        let active = viewModel.entry?.activeCalories
        let weight = viewModel.entry?.weight

        return [
            MetricTileData(
                id: "sleep",
                label: "Sleep",
                value: sleepValue,
                delta: sleepDelta,
                trend: trend { entry in entry.sleep?.totalSleepMinutes.map { Double($0.value) / 60.0 } },
                source: shortSource(sleep?.totalSleepMinutes?.source.displayName),
                confidence: sleep?.totalSleepMinutes?.confidenceBand ?? .low
            ),
            MetricTileData(
                id: "hrv",
                label: "HRV",
                value: hrvValue,
                delta: hrvDelta,
                trend: trend { entry in entry.sleep?.hrv?.value },
                source: shortSource(sleep?.hrv?.source.displayName),
                confidence: sleep?.hrv?.confidenceBand ?? .low
            ),
            MetricTileData(
                id: "rhr",
                label: "Resting HR",
                value: restingHRValue,
                delta: restingHRDelta,
                trend: trend { entry in entry.sleep?.restingHR.map { Double($0.value) } },
                source: shortSource(sleep?.restingHR?.source.displayName),
                confidence: sleep?.restingHR?.confidenceBand ?? .low
            ),
            MetricTileData(
                id: "steps",
                label: "Steps",
                value: stepsValue,
                delta: steps.map { "captured \(TodayViewModel.timeString($0.capturedAt))" } ?? "missing",
                trend: trend { entry in entry.steps.map { Double($0.value) } },
                source: shortSource(steps?.source.displayName),
                confidence: steps?.confidenceBand ?? .low
            ),
            MetricTileData(
                id: "active",
                label: "Active cal",
                value: activeCalValue,
                delta: active.map { "captured \(TodayViewModel.timeString($0.capturedAt))" } ?? "missing",
                trend: trend { entry in entry.activeCalories.map { Double($0.value) } },
                source: shortSource(active?.source.displayName),
                confidence: active?.confidenceBand ?? .low
            ),
            MetricTileData(
                id: "eaten",
                label: "Eaten",
                value: caloriesInValue,
                delta: mealsSubtitle ?? "missing",
                trend: trend { entry in entry.meals.isEmpty ? nil : Double(entry.totalCaloriesIn) },
                source: viewModel.entry?.meals.isEmpty == false ? "Photos" : "missing",
                confidence: viewModel.entry?.meals.isEmpty == false ? .med : .low
            ),
            MetricTileData(
                id: "protein",
                label: "Protein",
                value: proteinValue,
                delta: "goal 140",
                trend: trend { entry in
                    let total = entry.meals.reduce(0) { $0 + ($1.estimatedProteinG?.value ?? 0) }
                    return total > 0 ? Double(total) : nil
                },
                source: viewModel.entry?.meals.isEmpty == false ? "Photos" : "missing",
                confidence: viewModel.entry?.meals.isEmpty == false ? .med : .low
            ),
            MetricTileData(
                id: "weight",
                label: "Weight",
                value: weightValue,
                delta: lastWeightDelta,
                trend: trend { entry in entry.weight?.weightKg }.map { $0.map { $0 * WeightService.poundsPerKilogram } },
                source: shortSource(weight?.source.displayName),
                confidence: weight?.confidenceBand ?? .low
            )
        ]
    }

    private var sleepValue: String {
        guard let mins = viewModel.entry?.sleep?.totalSleepMinutes?.value else { return "-" }
        return TodayViewModel.formatDuration(minutes: mins)
    }

    private var hrvValue: String {
        guard let hrv = viewModel.entry?.sleep?.hrv?.value else { return "-" }
        return "\(Int(hrv.rounded())) ms"
    }

    private var restingHRValue: String {
        guard let hr = viewModel.entry?.sleep?.restingHR?.value else { return "-" }
        return "\(hr) bpm"
    }

    private var stepsValue: String {
        guard let steps = viewModel.entry?.steps?.value else { return "-" }
        return steps.formatted()
    }

    private var activeCalValue: String {
        guard let calories = viewModel.entry?.activeCalories?.value else { return "-" }
        return "\(calories)"
    }

    private var caloriesInValue: String {
        guard let entry = viewModel.entry, !entry.meals.isEmpty else { return "-" }
        return entry.totalCaloriesIn.formatted()
    }

    private var proteinValue: String {
        guard let meals = viewModel.entry?.meals, !meals.isEmpty else { return "-" }
        let total = meals.reduce(0) { $0 + ($1.estimatedProteinG?.value ?? 0) }
        return total > 0 ? "\(total) g" : "-"
    }

    private var weightValue: String {
        guard let kg = viewModel.entry?.weight?.weightKg else { return "-" }
        return TodayViewModel.formatPounds(fromKg: kg)
    }

    private var mealsSubtitle: String? {
        guard let count = viewModel.entry?.meals.count, count > 0 else { return nil }
        return "\(count) meal\(count == 1 ? "" : "s")"
    }

    private var sleepDelta: String? {
        let values = nonNilTrend { entry in
            guard let minutes = entry.sleep?.totalSleepMinutes?.value else { return nil }
            return Double(minutes)
        }
        guard values.count >= 2, let latest = values.last, let prior = values.dropLast().last else { return nil }
        return signedDurationDelta(minutes: Int(latest - prior))
    }

    private var hrvDelta: String? {
        percentDelta { entry in entry.sleep?.hrv?.value }
    }

    private var restingHRDelta: String? {
        let values = nonNilTrend { entry in entry.sleep?.restingHR.map { Double($0.value) } }
        guard values.count >= 2, let latest = values.last, let prior = values.dropLast().last else { return nil }
        let delta = Int((latest - prior).rounded())
        return delta == 0 ? "flat" : "\(delta > 0 ? "+" : "")\(delta)"
    }

    private var lastWeightDelta: String? {
        let values = nonNilTrend { entry in entry.weight?.weightKg }
        guard let last = values.last else { return nil }
        return "last \(String(format: "%.1f", last * WeightService.poundsPerKilogram))"
    }

    private func trend(_ value: (DailyLedgerEntry) -> Double?) -> [Double?] {
        viewModel.recentEntries
            .sorted { $0.date < $1.date }
            .map(value)
    }

    private func nonNilTrend(_ value: (DailyLedgerEntry) -> Double?) -> [Double] {
        trend(value).compactMap { $0 }
    }

    private func percentDelta(_ value: (DailyLedgerEntry) -> Double?) -> String? {
        let values = nonNilTrend(value)
        guard values.count >= 2, let latest = values.last else { return nil }
        let priorValues = values.dropLast()
        let baseline = priorValues.reduce(0, +) / Double(priorValues.count)
        guard baseline != 0 else { return nil }
        let pct = Int(((latest - baseline) / baseline * 100).rounded())
        return pct == 0 ? "flat" : "\(pct > 0 ? "+" : "")\(pct)%"
    }

    private func signedDurationDelta(minutes: Int) -> String? {
        guard minutes != 0 else { return "flat" }
        let sign = minutes > 0 ? "+" : "-"
        let absMinutes = abs(minutes)
        let h = absMinutes / 60
        let m = absMinutes % 60
        if h > 0 {
            return "\(sign)\(h)h \(String(format: "%02d", m))m"
        }
        return "\(sign)\(m)m"
    }

    private func shortSource(_ source: String?) -> String {
        guard let source else { return "missing" }
        switch source {
        case "Oura Ring": return "Oura"
        case "Meal Photo": return "Photos"
        case "Manual Entry": return "Manual"
        default: return source
        }
    }

    private func handleOpenLoop(_ loop: TodayOpenLoop) {
        switch loop.id {
        case "weight":
            showWeightSheet = true
        case "food":
            showMealSheet = true
        case "hrv", "health":
            Task { await viewModel.load() }
        default:
            break
        }
    }

    private static func dateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: date)
    }
}

private struct ModePill: View {
    let mode: BodyMode

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(mode.tint)
                .frame(width: 9, height: 9)
            Text(mode.displayName)
                .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                .tracking(0.8)
                .textCase(.uppercase)
                .foregroundStyle(Theme.textBody)
        }
        .padding(.leading, 8)
        .padding(.trailing, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Theme.surface)
                .overlay(Capsule().strokeBorder(Theme.hairline, lineWidth: 1))
        )
    }
}

private struct SectionHead: View {
    let label: String
    var right: String?

    var body: some View {
        HStack(alignment: .center) {
            Text(label)
                .kickerStyle(color: Theme.textBody)
            Spacer()
            if let right {
                Text(right)
                    .font(AppFont.tag)
                    .tracking(1.0)
                    .foregroundStyle(Theme.textSecondary)
                    .textCase(.uppercase)
            }
        }
    }
}

private struct OpenLoopRow: View {
    let loop: TodayOpenLoop
    let action: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Theme.accent)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 3) {
                Text(loop.label)
                    .font(AppFont.body)
                    .foregroundStyle(Theme.textPrimary)
                Text(loop.since)
                    .font(AppFont.tag)
                    .tracking(0.8)
                    .foregroundStyle(Theme.textSecondary)
                    .textCase(.uppercase)
            }

            Spacer(minLength: 12)

            Button(action: action) {
                HStack(spacing: 4) {
                    Text(loop.cta)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 11, weight: .medium))
                }
                .font(AppFont.bodyMedium)
                .foregroundStyle(Theme.accent)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.tile, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
    }
}

private struct TimelineRow: View {
    let event: TodayTimelineEvent

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(Theme.background)
                .frame(width: 11, height: 11)
                .overlay(Circle().strokeBorder(Theme.textBody, lineWidth: 1.5))
                .offset(x: -18, y: 5)

            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .center, spacing: 8) {
                    Text(event.timeLabel)
                        .font(AppFont.tag)
                        .tracking(0.8)
                        .foregroundStyle(Theme.textSecondary)
                        .textCase(.uppercase)
                    SourceChip(label: shortSource(event.source), confidence: event.confidence)
                }
                Text(event.text)
                    .font(AppFont.body)
                    .foregroundStyle(Theme.textBody)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.bottom, 16)
    }

    private func shortSource(_ source: String) -> String {
        switch source {
        case "Oura Ring": return "Oura"
        case "Meal Photo": return "Photos"
        case "Manual Entry": return "Manual"
        default: return source
        }
    }
}
