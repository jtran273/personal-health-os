import SwiftUI

/// Static OpenClaw chat prototype hosted in the current Meals tab.
struct MealsView: View {
    @State private var viewModel: MealsViewModel
    @State private var draft = ""
    @State private var showMealSheet = false
    @State private var sheetDraft = ParsedManualMealDraft(description: "", calories: 0, proteinG: nil)

    init(viewModel: MealsViewModel = MealsViewModel(store: InMemoryLedgerStore())) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
                .overlay(Theme.hairline)

            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    TimeDivider("This morning")

                    MorningBriefingCard()
                    TodayFoodCard(
                        calories: viewModel.todayCaloriesLabel,
                        protein: viewModel.todayProteinLabel,
                        mealCount: viewModel.meals.count
                    )

                    ChatBubble(role: .me, text: "ok. weigh-in?")
                    ChatBubble(role: .system, text: "Step on. I'll read the scale.")
                    ChatBubble(role: .me, text: "184.0")

                    WeightTrendCard()

                    ChatBubble(role: .me, photoCaption: "breakfast")
                    MealEstimateCard()

                    TimeDivider("12:18 pm")

                    SystemCard {
                        Text("Walk window in 12 min. ")
                            .foregroundStyle(Theme.textBody)
                        + Text("68°F, clear")
                            .font(.custom(Tokens.FontFamily.mono, size: 11))
                            .foregroundStyle(Theme.textSecondary)
                    }

                    loggedMeals
                    suggestedReplies
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 12)
            }
            .scrollIndicators(.hidden)

            inputBar
        }
        .background(Theme.background)
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .sheet(isPresented: $showMealSheet) {
            ManualMealEntrySheet(
                viewModel: viewModel,
                initialDescription: sheetDraft.description,
                initialCalories: sheetDraft.calories > 0 ? sheetDraft.calories : nil,
                initialProteinG: sheetDraft.proteinG
            )
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Theme.accent, Theme.red],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                Circle()
                    .fill(Theme.background)
                    .padding(3)
                Text("O")
                    .font(.custom(Tokens.FontFamily.serif, size: 18))
                    .foregroundStyle(Theme.accent)
            }
            .frame(width: 38, height: 38)
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text("OpenClaw")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Theme.textPrimary)
                Text("quiet · always on")
                    .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                    .foregroundStyle(Theme.textSecondary)
            }

            Spacer()

            Button {} label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 20, weight: .regular))
                    .foregroundStyle(Theme.textSecondary)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Conversation options")
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 14)
    }

    private var suggestedReplies: some View {
        FlowLayout(spacing: 6, rowSpacing: 6) {
            SuggestedReplyPill("I'll head out at 12:30")
            SuggestedReplyPill("Move to 1pm")
            SuggestedReplyPill("What about tomorrow's lift?")
        }
        .padding(.top, 2)
        .padding(.horizontal, 4)
    }

    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider()
                .overlay(Theme.hairline)

            HStack(spacing: 6) {
                Button {
                    sheetDraft = ParsedManualMealDraft(description: "", calories: 0, proteinG: nil)
                    showMealSheet = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .regular))
                        .frame(width: 32, height: 32)
                }
                .foregroundStyle(Theme.textSecondary)
                .buttonStyle(.plain)
                .accessibilityLabel("Attach")

                TextField("Tell OpenClaw...", text: $draft)
                    .font(AppFont.body)
                    .foregroundStyle(Theme.textPrimary)
                    .textInputAutocapitalization(.sentences)
                    .submitLabel(.send)
                    .onSubmit(sendDraft)

                Button {
                    sheetDraft = ParsedManualMealDraft(description: draft.trimmingCharacters(in: .whitespacesAndNewlines), calories: 0, proteinG: nil)
                    showMealSheet = true
                } label: {
                    Image(systemName: "photo")
                        .font(.system(size: 20, weight: .regular))
                        .frame(width: 32, height: 32)
                }
                .foregroundStyle(Theme.textSecondary)
                .buttonStyle(.plain)
                .accessibilityLabel("Add photo")

                Button(action: sendDraft) {
                    Image(systemName: draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "mic" : "paperplane.fill")
                        .font(.system(size: 16, weight: .regular))
                        .foregroundStyle(Theme.background)
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(Theme.textPrimary))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Record voice" : "Send")
            }
            .padding(.leading, 14)
            .padding(.trailing, 6)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Theme.surface)
                    .overlay(Capsule().strokeBorder(Theme.hairlineStrong, lineWidth: 1))
            )
            .padding(.horizontal, 12)
            .padding(.top, 8)
            .padding(.bottom, 10)
        }
            .background(Theme.background)
    }

    private func sendDraft() {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        if let parsed = MealsViewModel.parseManualMealDraft(trimmed) {
            Task {
                guard await viewModel.logManualMeal(
                    description: parsed.description,
                    calories: parsed.calories,
                    proteinG: parsed.proteinG
                ) != nil else { return }
                draft = ""
            }
        } else {
            sheetDraft = ParsedManualMealDraft(description: trimmed, calories: 0, proteinG: nil)
            showMealSheet = true
        }
    }

    @ViewBuilder
    private var loggedMeals: some View {
        if !viewModel.meals.isEmpty {
            SystemCard {
                VStack(alignment: .leading, spacing: 10) {
                    CardHeader(title: "Logged today", chip: SourceChip(source: .manual, confidence: .high))
                    ForEach(viewModel.meals) { meal in
                        LoggedMealRow(meal: meal)
                    }
                }
            }
        }
    }
}

private enum ChatRole {
    case me
    case system
}

private struct ChatBubble: View {
    let role: ChatRole
    let text: String?
    let photoCaption: String?

    init(role: ChatRole, text: String) {
        self.role = role
        self.text = text
        self.photoCaption = nil
    }

    init(role: ChatRole, photoCaption: String) {
        self.role = role
        self.text = nil
        self.photoCaption = photoCaption
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            if role == .me { Spacer(minLength: 44) }

            Group {
                if let photoCaption {
                    PhotoPlaceholder(caption: photoCaption)
                        .padding(6)
                } else {
                    Text(text ?? "")
                        .font(AppFont.body)
                        .lineSpacing(1)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                }
            }
            .foregroundStyle(role == .me ? Theme.background : Theme.textPrimary)
            .background(bubbleBackground)
            .clipShape(bubbleShape)
            .overlay {
                if role == .system {
                    bubbleShape
                        .strokeBorder(Theme.hairline, lineWidth: 1)
                }
            }
            .frame(maxWidth: 300, alignment: role == .me ? .trailing : .leading)

            if role == .system { Spacer(minLength: 44) }
        }
        .frame(maxWidth: .infinity, alignment: role == .me ? .trailing : .leading)
        .padding(.bottom, 4)
    }

    @ViewBuilder
    private var bubbleBackground: some View {
        if role == .me {
            Theme.textPrimary
        } else {
            Theme.surface
        }
    }

    private var bubbleShape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            cornerRadii: .init(
                topLeading: 18,
                bottomLeading: role == .me ? 18 : 4,
                bottomTrailing: role == .me ? 4 : 18,
                topTrailing: 18
            ),
            style: .continuous
        )
    }
}

private struct SystemCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .font(AppFont.body)
            .lineSpacing(2)
            .foregroundStyle(Theme.textBody)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.cardInner, style: .continuous)
                    .fill(Theme.surfaceNested)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.cardInner, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .padding(.trailing, 34)
            .padding(.bottom, 6)
    }
}

private struct MorningBriefingCard: View {
    var body: some View {
        SystemCard {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Theme.yellow)
                        .frame(width: 9, height: 9)
                    Text("Yellow - short sleep")
                        .kickerStyle(color: Theme.textBody)
                    Rectangle()
                        .fill(Theme.hairline)
                        .frame(height: 1)
                    Text("6:55 am")
                        .font(.custom(Tokens.FontFamily.mono, size: 10))
                        .foregroundStyle(Theme.textSecondary)
                }
                .padding(.bottom, 8)

                Text("Slept ")
                    .foregroundStyle(Theme.textPrimary)
                + Text("6h 12m")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Theme.textPrimary)
                + Text(". HRV down 18%.")
                    .foregroundStyle(Theme.textPrimary)

                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    Text("One thing: ")
                        .foregroundStyle(Theme.textBody)
                    Text("skip the lift, walk 25 min at lunch.")
                        .foregroundStyle(Theme.accent)
                }
                .padding(.top, 6)
            }
        }
    }
}

private struct TodayFoodCard: View {
    let calories: String
    let protein: String
    let mealCount: Int

    var body: some View {
        SystemCard {
            VStack(alignment: .leading, spacing: 10) {
                CardHeader(title: "Food today", chip: SourceChip(source: .manual, confidence: mealCount > 0 ? .high : .low))

                HStack(alignment: .firstTextBaseline, spacing: 20) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(calories)
                            .metricNumber(size: 30)
                            .foregroundStyle(Theme.textPrimary)
                        Text("kcal in")
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(protein)
                            .metricNumber(size: 30)
                            .foregroundStyle(Theme.textPrimary)
                        Text("protein")
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }

                Text(mealCount == 0 ? "No meals logged today." : "\(mealCount) meal\(mealCount == 1 ? "" : "s") logged today.")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
    }
}

private struct WeightTrendCard: View {
    var body: some View {
        SystemCard {
            VStack(alignment: .leading, spacing: 10) {
                CardHeader(title: "Weight, 7-day trend", chip: SourceChip(source: .manual, confidence: .high))

                HStack(alignment: .bottom, spacing: 14) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("184.0")
                            .metricNumber(size: 32)
                            .foregroundStyle(Theme.textPrimary)
                        Text("lb")
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Sparkline(
                            data: [185.6, 185.2, 184.9, 184.8, 184.6, 184.4, 184.0],
                            confidence: .high,
                            color: Theme.accent
                        )
                        .frame(width: 120, height: 28)

                        Text("-0.9 lb this week")
                            .font(.custom(Tokens.FontFamily.mono, size: 10))
                            .foregroundStyle(Theme.textSecondary)
                    }

                    Spacer(minLength: 0)
                }
            }
        }
    }
}

private struct MealEstimateCard: View {
    var body: some View {
        SystemCard {
            VStack(alignment: .leading, spacing: 10) {
                CardHeader(title: "Meal estimate", chip: SourceChip(source: .mealPhoto, confidence: .med))

                VStack(spacing: 7) {
                    EstimateRow(label: "kcal", confidence: .med, value: "410")
                    EstimateRow(label: "protein", confidence: .med, value: "12 g")
                    EstimateRow(label: "carbs", confidence: .low, value: "62 g")
                }

                Text("Looks like your usual oats + blueberries + black coffee. Save as \"regular breakfast\"?")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textSecondary)
                    .lineSpacing(1)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 8) {
                    Button {} label: {
                        Text("Save & log")
                            .font(.custom(Tokens.FontFamily.sansMedium, size: 12))
                            .foregroundStyle(Theme.background)
                            .padding(.horizontal, 12)
                            .frame(height: 34)
                            .background(Capsule().fill(Theme.textPrimary))
                    }
                    .buttonStyle(.plain)

                    Button {} label: {
                        Text("Edit")
                            .font(.custom(Tokens.FontFamily.sansMedium, size: 12))
                            .foregroundStyle(Theme.textBody)
                            .padding(.horizontal, 12)
                            .frame(height: 34)
                            .background(
                                Capsule()
                                    .strokeBorder(Theme.hairlineStrong, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct LoggedMealRow: View {
    let meal: Meal

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(meal.description)
                    .font(AppFont.body)
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)
                Text(Self.timeString(meal.loggedAt))
                    .font(.custom(Tokens.FontFamily.mono, size: 10))
                    .foregroundStyle(Theme.textSecondary)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                Text(meal.estimatedCalories.map { "\($0.value) kcal" } ?? "-")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textBody)
                Text(meal.estimatedProteinG.map { "\($0.value) g protein" } ?? "protein missing")
                    .font(.custom(Tokens.FontFamily.mono, size: 10))
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.vertical, 6)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.hairline)
                .frame(height: 1)
        }
    }

    private static func timeString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date).lowercased()
    }
}

private struct CardHeader<Chip: View>: View {
    let title: String
    let chip: Chip

    var body: some View {
        HStack(spacing: 6) {
            Text(title)
                .kickerStyle(color: Theme.textBody)
            Rectangle()
                .fill(Theme.hairline)
                .frame(height: 1)
            chip
        }
    }
}

private struct EstimateRow: View {
    let label: String
    let confidence: Confidence
    let value: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(label)
                .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                .foregroundStyle(Theme.textSecondary)
                .frame(width: 54, alignment: .leading)

            ConfidenceRule(confidence: confidence)
                .frame(height: 1)

            Text(value)
                .font(.custom(Tokens.FontFamily.serif, size: 16))
                .foregroundStyle(Theme.textPrimary)
                .monospacedDigit()
        }
    }
}

private struct ConfidenceRule: View {
    let confidence: Confidence

    var body: some View {
        GeometryReader { geometry in
            Path { path in
                path.move(to: CGPoint(x: 0, y: 0.5))
                path.addLine(to: CGPoint(x: geometry.size.width, y: 0.5))
            }
            .stroke(
                Theme.hairlineStrong,
                style: StrokeStyle(lineWidth: 1, lineCap: .round, dash: dash)
            )
        }
    }

    private var dash: [CGFloat] {
        switch confidence {
        case .high: []
        case .med: [3, 2]
        case .low: [1, 2]
        }
    }
}

private struct PhotoPlaceholder: View {
    let caption: String

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: Tokens.Radius.cardInner, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Theme.accentSoft, Theme.accent.opacity(0.78)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Image(systemName: "photo")
                .font(.system(size: 32, weight: .regular))
                .foregroundStyle(Theme.surface.opacity(0.78))

            Text(caption)
                .font(.custom(Tokens.FontFamily.mono, size: 11))
                .tracking(0.4)
                .foregroundStyle(Theme.surface)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                .padding(.leading, 8)
                .padding(.bottom, 7)
        }
        .frame(width: 180, height: 180)
    }
}

private struct TimeDivider: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(.custom(Tokens.FontFamily.mono, size: 10))
            .tracking(0.6)
            .textCase(.uppercase)
            .foregroundStyle(Theme.textFaint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
    }
}

private struct SuggestedReplyPill: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Button {} label: {
            Text(title)
                .font(.custom(Tokens.FontFamily.sansRegular, size: 12.5))
                .foregroundStyle(Theme.textBody)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
                .padding(.horizontal, 12)
                .frame(height: 34)
                .background(
                    Capsule()
                        .strokeBorder(Theme.hairlineStrong, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

private struct FlowLayout: Layout {
    let spacing: CGFloat
    let rowSpacing: CGFloat

    init(spacing: CGFloat, rowSpacing: CGFloat) {
        self.spacing = spacing
        self.rowSpacing = rowSpacing
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? 0
        var size = CGSize.zero
        var rowWidth: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let subviewSize = subview.sizeThatFits(.unspecified)
            if rowWidth > 0, rowWidth + spacing + subviewSize.width > maxWidth {
                size.width = max(size.width, rowWidth)
                size.height += rowHeight + rowSpacing
                rowWidth = subviewSize.width
                rowHeight = subviewSize.height
            } else {
                rowWidth += rowWidth == 0 ? subviewSize.width : spacing + subviewSize.width
                rowHeight = max(rowHeight, subviewSize.height)
            }
        }

        size.width = max(size.width, rowWidth)
        size.height += rowHeight
        return size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let subviewSize = subview.sizeThatFits(.unspecified)
            if x > bounds.minX, x + spacing + subviewSize.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + rowSpacing
                rowHeight = 0
            }

            subview.place(
                at: CGPoint(x: x, y: y),
                proposal: ProposedViewSize(width: subviewSize.width, height: subviewSize.height)
            )
            x += subviewSize.width + spacing
            rowHeight = max(rowHeight, subviewSize.height)
        }
    }
}

#Preview {
    MealsView()
}
