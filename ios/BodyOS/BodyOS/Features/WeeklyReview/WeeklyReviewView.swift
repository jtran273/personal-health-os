import SwiftUI

/// Weekly summary view: calibration, gaps, trend lines, and next-week defaults.
struct WeeklyReviewView: View {
    @State private var viewModel: WeeklyReviewViewModel

    init(viewModel: WeeklyReviewViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                headline
                calibrationCard
                winsAndSlips
                weekLines
                nextWeekPlan
            }
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Theme.background)
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(viewModel.weekKicker)
                .kickerStyle()
            Text(viewModel.dateRangeTitle)
                .font(.custom(Tokens.FontFamily.serif, size: 30))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .padding(.top, 54)
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    private var headline: some View {
        Text(viewModel.headline)
            .font(.custom(Tokens.FontFamily.serif, size: 20))
            .lineSpacing(4)
            .foregroundStyle(Theme.textBody)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, 14)
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
    }

    private var calibrationCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            WeeklySectionHead(label: "Deficit vs. weight trend")
                .padding(.bottom, 4)

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(viewModel.calibrationValue)
                    .font(.custom(Tokens.FontFamily.serif, size: 36))
                    .monospacedDigit()
                    .foregroundStyle(Theme.textPrimary)
                Text(viewModel.calibrationUnit)
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 13))
                    .foregroundStyle(Theme.textSecondary)
            }
            .padding(.bottom, 6)

            CalibrationChart(points: viewModel.chartPoints)
                .frame(height: 184)

            VStack(alignment: .leading, spacing: 4) {
                Text(viewModel.calibrationInsightTitle)
                    .kickerStyle(color: Theme.accent)
                Text(viewModel.calibrationInsight)
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 13))
                    .lineSpacing(4)
                    .foregroundStyle(Theme.textBody)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Theme.background)
            )
            .overlay(alignment: .leading) {
                Rectangle()
                    .fill(Theme.accent)
                    .frame(width: 2)
                    .padding(.vertical, 10)
            }
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .padding(.top, 14)
        }
        .weeklyCardPadding(16)
        .padding(.horizontal, 16)
    }

    private var winsAndSlips: some View {
        HStack(alignment: .top, spacing: 10) {
            WeeklyBulletCard(
                title: "Held",
                color: Theme.green,
                items: viewModel.heldItems
            )
            WeeklyBulletCard(
                title: "Slipped",
                color: Theme.accent,
                items: viewModel.slippedItems
            )
        }
        .padding(.top, 20)
        .padding(.horizontal, 16)
    }

    private var weekLines: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("The week in two lines")
                .kickerStyle(color: Theme.textBody)

            WeeklySparkRow(
                title: "Sleep, hours",
                meta: viewModel.sleepAverageLabel,
                data: viewModel.sleepTrend,
                color: Theme.textPrimary,
                confidence: .high
            )

            WeeklySparkRow(
                title: "Protein, grams",
                meta: viewModel.proteinAverageLabel,
                data: viewModel.proteinTrend,
                color: Theme.accent,
                confidence: .med
            )
        }
        .weeklyCardPadding(14)
        .padding(.top, 20)
        .padding(.horizontal, 16)
    }

    private var nextWeekPlan: some View {
        VStack(alignment: .leading, spacing: 12) {
            WeeklySectionHead(label: "Next week, automatically", right: "3 decisions")

            VStack(spacing: 8) {
                ForEach(Array(viewModel.nextWeekPlan.enumerated()), id: \.offset) { index, text in
                    WeeklyPlanRow(index: index + 1, text: text)
                }
            }

            PrimaryButton(title: "Approve plan for next week") {}
                .padding(.top, 2)
        }
        .padding(.top, 20)
        .padding(.horizontal, 16)
    }
}

private struct CalibrationChart: View {
    let points: [WeeklyChartPoint]

    var body: some View {
        VStack(spacing: 10) {
            CalibrationChartCanvas(points: points)
                .frame(height: 136)

            HStack(spacing: 14) {
                HStack(spacing: 6) {
                    Rectangle()
                        .fill(Theme.textPrimary)
                        .frame(width: 14, height: 2)
                    Text("weight, lb")
                        .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                        .foregroundStyle(Theme.textSecondary)
                }

                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(Theme.accentSoft)
                        .overlay(
                            RoundedRectangle(cornerRadius: 2, style: .continuous)
                                .strokeBorder(Theme.accent, lineWidth: 1)
                        )
                        .frame(width: 10, height: 10)
                    Text("daily deficit, kcal")
                        .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct CalibrationChartCanvas: View {
    let points: [WeeklyChartPoint]

    private var hasData: Bool {
        points.contains { $0.weightLb != nil || $0.deficit != nil }
    }

    var body: some View {
        ZStack {
            Canvas { context, size in
                draw(in: context, size: size)
            }

            if !hasData {
                Text("Waiting on weight and deficit data")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .accessibilityLabel(hasData ? "Weekly calibration chart" : "Weekly calibration chart waiting on data")
    }

    private func draw(in context: GraphicsContext, size: CGSize) {
        guard points.count > 1 else { return }

        let padLeft: CGFloat = 8
        let padRight: CGFloat = 8
        let padTop: CGFloat = 8
        let labelBand: CGFloat = 20
        let plotHeight = size.height - labelBand
        let plotWidth = size.width - padLeft - padRight
        let zeroY = padTop + (plotHeight - padTop) / 2

        var baseline = Path()
        baseline.move(to: CGPoint(x: padLeft, y: zeroY))
        baseline.addLine(to: CGPoint(x: size.width - padRight, y: zeroY))
        context.stroke(
            baseline,
            with: .color(Theme.hairline),
            style: StrokeStyle(lineWidth: 1, dash: [2, 3])
        )

        let xValues = points.indices.map { index in
            padLeft + (CGFloat(index) / CGFloat(points.count - 1)) * plotWidth
        }

        drawDeficitBars(in: context, xValues: xValues, zeroY: zeroY, plotTop: padTop, plotHeight: plotHeight)
        drawWeightLine(in: context, xValues: xValues, plotTop: padTop, plotHeight: plotHeight)
        drawDayLabels(in: context, xValues: xValues, y: size.height - 8)
    }

    private func drawDeficitBars(
        in context: GraphicsContext,
        xValues: [CGFloat],
        zeroY: CGFloat,
        plotTop: CGFloat,
        plotHeight: CGFloat
    ) {
        let deficits = points.compactMap { $0.deficit }
        let range = max(deficits.map { abs($0) }.max() ?? 1, 1)
        let maxHeight = (plotHeight - plotTop) / 2
        let barWidth = min(CGFloat(16), max(CGFloat(8), (xValues.dropLast().first.map { xValues[1] - $0 } ?? 28) * 0.36))

        for (index, point) in points.enumerated() {
            guard let deficit = point.deficit else { continue }

            let height = CGFloat(abs(deficit)) / CGFloat(range) * maxHeight
            let isDeficit = deficit >= 0
            let rect = CGRect(
                x: xValues[index] - barWidth / 2,
                y: isDeficit ? zeroY - height : zeroY,
                width: barWidth,
                height: height
            )
            let path = Path(roundedRect: rect, cornerRadius: 3)
            context.fill(path, with: .color(isDeficit ? Theme.greenSoft : Theme.accentSoft))
            context.stroke(path, with: .color(isDeficit ? Theme.green : Theme.accent), lineWidth: 0.7)
        }
    }

    private func drawWeightLine(
        in context: GraphicsContext,
        xValues: [CGFloat],
        plotTop: CGFloat,
        plotHeight: CGFloat
    ) {
        let weights = points.compactMap { $0.weightLb }
        guard !weights.isEmpty else { return }

        let minWeight = weights.min() ?? 0
        let maxWeight = weights.max() ?? 1
        let range = max(maxWeight - minWeight, .ulpOfOne)
        let plotBottom = plotHeight

        func y(_ weight: Double) -> CGFloat {
            let normalized = (weight - minWeight) / range
            return plotBottom - CGFloat(normalized) * (plotBottom - plotTop)
        }

        var line = Path()
        var previousPoint: CGPoint?

        for (index, point) in points.enumerated() {
            guard let weight = point.weightLb else {
                previousPoint = nil
                continue
            }

            let current = CGPoint(x: xValues[index], y: y(weight))
            if let previousPoint {
                let midX = (previousPoint.x + current.x) / 2
                let midY = (previousPoint.y + current.y) / 2
                line.addQuadCurve(
                    to: CGPoint(x: midX, y: midY),
                    control: CGPoint(x: midX, y: previousPoint.y)
                )
                line.addQuadCurve(
                    to: current,
                    control: CGPoint(x: midX, y: current.y)
                )
            } else {
                line.move(to: current)
            }
            previousPoint = current
        }

        context.stroke(
            line,
            with: .color(Theme.textPrimary),
            style: StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round)
        )

        for (index, point) in points.enumerated() {
            guard let weight = point.weightLb else { continue }
            let center = CGPoint(x: xValues[index], y: y(weight))
            let dot = Path(ellipseIn: CGRect(x: center.x - 2.6, y: center.y - 2.6, width: 5.2, height: 5.2))
            context.fill(dot, with: .color(Theme.background))
            context.stroke(dot, with: .color(Theme.textPrimary), lineWidth: 1.4)
        }
    }

    private func drawDayLabels(in context: GraphicsContext, xValues: [CGFloat], y: CGFloat) {
        for (index, point) in points.enumerated() {
            let text = Text(point.dayLabel)
                .font(.custom(Tokens.FontFamily.mono, size: 9))
                .foregroundStyle(Theme.textSecondary)
            context.draw(text, at: CGPoint(x: xValues[index], y: y), anchor: .center)
        }
    }
}

private struct WeeklyBulletCard: View {
    let title: String
    let color: Color
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .kickerStyle(color: color)

            VStack(alignment: .leading, spacing: 8) {
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(color)
                            .frame(width: 4, height: 4)
                            .padding(.top, 7)
                        Text(item)
                            .font(.custom(Tokens.FontFamily.sansRegular, size: 12.5))
                            .lineSpacing(2)
                            .foregroundStyle(Theme.textBody)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .weeklyCardPadding(14)
    }
}

private struct WeeklySparkRow: View {
    let title: String
    let meta: String
    let data: [Double?]
    let color: Color
    let confidence: Confidence

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(.custom(Tokens.FontFamily.sansRegular, size: 13))
                    .foregroundStyle(Theme.textBody)
                Spacer(minLength: 12)
                Text(meta)
                    .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                    .foregroundStyle(Theme.textSecondary)
            }

            ZStack {
                Sparkline(data: data, confidence: confidence, color: color, fill: true)
                if data.compactMap({ $0 }).isEmpty {
                    Text("No data")
                        .font(AppFont.caption)
                        .foregroundStyle(Theme.textFaint)
                }
            }
            .frame(height: 28)
        }
    }
}

private struct WeeklyPlanRow: View {
    let index: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index)")
                .font(.custom(Tokens.FontFamily.serif, size: 13))
                .foregroundStyle(Theme.textPrimary)
                .frame(width: 28, height: 28)
                .background(
                    Circle()
                        .fill(Theme.backgroundDeep)
                )

            Text(text)
                .font(.custom(Tokens.FontFamily.sansRegular, size: 13.5))
                .lineSpacing(3)
                .foregroundStyle(Theme.textBody)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 4)

            Spacer(minLength: 8)

            Button {} label: {
                Image(systemName: "pencil")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Theme.textSecondary)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Edit plan item \(index)")
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.cardInner, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.cardInner, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
    }
}

private struct WeeklySectionHead: View {
    let label: String
    var right: String?

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            Text(label)
                .kickerStyle(color: Theme.textBody)
            Rectangle()
                .fill(Theme.hairline)
                .frame(height: 1)
            if let right {
                Text(right)
                    .font(AppFont.tag)
                    .tracking(1.0)
                    .foregroundStyle(Theme.textSecondary)
                    .textCase(.uppercase)
                    .lineLimit(1)
            }
        }
    }
}

private extension View {
    func weeklyCardPadding(_ padding: CGFloat) -> some View {
        self
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.card, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
    }
}
