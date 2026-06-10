import SwiftUI

/// OpenClaw-first meal capture surface. Empty states stay honest until real meals land.
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
                    captureOverview
                    TodayFoodCard(
                        calories: viewModel.todayCaloriesLabel,
                        protein: viewModel.todayProteinLabel,
                        mealCount: viewModel.meals.count
                    )
                    loggedMeals
                    estimatorPlanCard
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
            AppLogoMark()

            VStack(alignment: .leading, spacing: 3) {
                Text("Meals")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Theme.textPrimary)
                Text("OpenClaw capture · corrections become memory")
                    .font(.custom(Tokens.FontFamily.mono, size: 10.5))
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
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
            SuggestedReplyPill("same breakfast as yesterday")
            SuggestedReplyPill("chicken bowl 650 cal 42g protein")
            SuggestedReplyPill("add a photo estimate")
        }
        .padding(.top, 2)
        .padding(.horizontal, 4)
    }

    private var captureOverview: some View {
        SystemCard {
            HStack(alignment: .top, spacing: 12) {
                AppLogoMark(size: .small)

                VStack(alignment: .leading, spacing: 8) {
                    CardHeader(title: "OpenClaw meal loop", chip: SourceChip(label: "OpenClaw", confidence: viewModel.meals.isEmpty ? .low : .high))

                    Text("Use text now. Photo estimates should stay low/medium confidence until James confirms, then corrections become known foods.")
                        .font(AppFont.caption)
                        .foregroundStyle(Theme.textSecondary)
                        .lineSpacing(2)
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 8) {
                        CaptureStep(number: "1", label: "Capture")
                        CaptureStep(number: "2", label: "Estimate")
                        CaptureStep(number: "3", label: "Correct")
                    }
                }
            }
        }
    }

    private var estimatorPlanCard: some View {
        SystemCard {
            VStack(alignment: .leading, spacing: 10) {
                CardHeader(title: "Photo estimator guardrails", chip: SourceChip(source: .mealPhoto, confidence: .low))

                VStack(alignment: .leading, spacing: 8) {
                    GuardrailRow(icon: "camera.metering.center.weighted", text: "Photos are accepted as evidence, not truth.")
                    GuardrailRow(icon: "list.bullet.clipboard", text: "USDA/Open Food Facts grounding should beat free-form guessing.")
                    GuardrailRow(icon: "scalemass", text: "Withings trend calibrates the weekly calorie math.")
                }
            }
        }
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

                TextField("Meal, weight, or photo note...", text: $draft)
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
        } else {
            SystemCard {
                VStack(alignment: .leading, spacing: 10) {
                    CardHeader(title: "No meals logged today", chip: SourceChip(source: .manual, confidence: .low))
                    Text("Empty is better than fake calories. Add a text meal with calories/protein now, or attach a photo when the estimator queue exists.")
                        .font(AppFont.caption)
                        .foregroundStyle(Theme.textSecondary)
                        .lineSpacing(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct CaptureStep: View {
    let number: String
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Text(number)
                .font(.custom(Tokens.FontFamily.mono, size: 10))
                .foregroundStyle(Theme.background)
                .frame(width: 18, height: 18)
                .background(Circle().fill(Theme.textPrimary))
            Text(label)
                .font(.custom(Tokens.FontFamily.sansMedium, size: 11.5))
                .foregroundStyle(Theme.textBody)
        }
        .padding(.horizontal, 8)
        .frame(height: 30)
        .background(
            Capsule()
                .fill(Theme.surface)
                .overlay(Capsule().strokeBorder(Theme.hairline, lineWidth: 1))
        )
    }
}

private struct GuardrailRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.accent)
                .frame(width: 18)

            Text(text)
                .font(AppFont.caption)
                .foregroundStyle(Theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
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
