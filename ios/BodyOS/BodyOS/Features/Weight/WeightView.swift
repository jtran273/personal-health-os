import SwiftUI
import Charts

/// Weight log: shows ledger-backed manual entries without inventing history.
struct WeightView: View {
    @State private var viewModel: WeightViewModel
    @State private var showLogSheet = false

    init(viewModel: WeightViewModel = WeightViewModel(store: InMemoryLedgerStore())) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    currentWeightCard
                    if viewModel.recentWeights.count >= 2 {
                        trendChart
                    }
                    historySection
                }
                .padding(16)
            }
            .background(Theme.background)
            .navigationTitle("Weight")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showLogSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Log weight")
                }
            }
            .sheet(isPresented: $showLogSheet) {
                ManualWeightEntrySheet(viewModel: viewModel)
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var currentWeightCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Current")
                .font(AppFont.caption)
                .foregroundStyle(Theme.textSecondary)
            Text(currentString)
                .font(AppFont.metricLarge)
            SourceChip(source: .manual, confidence: viewModel.todayEntry?.weight?.confidenceBand ?? .low)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Theme.surface)
        )
    }

    private var trendChart: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Trend")
                .font(AppFont.heading)
            Chart(viewModel.recentWeights.sorted(by: { $0.date < $1.date }), id: \.id) { entry in
                LineMark(
                    x: .value("Date", entry.date),
                    y: .value("lb", entry.weightKg * WeightService.poundsPerKilogram)
                )
                .interpolationMethod(.monotone)
                PointMark(
                    x: .value("Date", entry.date),
                    y: .value("lb", entry.weightKg * WeightService.poundsPerKilogram)
                )
            }
            .frame(height: 180)
        }
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("History")
                .font(AppFont.heading)
            if viewModel.recentWeights.isEmpty {
                Text("No entries yet")
                    .font(AppFont.body)
                    .foregroundStyle(Theme.textSecondary)
            } else {
                ForEach(viewModel.recentWeights, id: \.id) { entry in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(Self.dateString(entry.date))
                                .font(AppFont.body)
                            SourceChip(source: entry.source, confidence: entry.confidenceBand)
                        }
                        Spacer()
                        Text(WeightViewModel.formatPounds(fromKg: entry.weightKg))
                            .font(AppFont.body)
                            .foregroundStyle(Theme.textSecondary)
                    }
                    .padding(.vertical, 6)
                    Divider()
                }
            }
        }
    }

    private var currentString: String {
        guard let kg = viewModel.todayEntry?.weight?.weightKg else { return "-" }
        return WeightViewModel.formatPounds(fromKg: kg)
    }

    private static func dateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

/// Modal sheet for entering today's manual body weight in pounds.
struct ManualWeightEntrySheet: View {
    let viewModel: WeightViewModel
    let onSave: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var poundsString: String = ""

    init(viewModel: WeightViewModel, onSave: @escaping () async -> Void = {}) {
        self.viewModel = viewModel
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Weight (lb)") {
                    TextField("e.g. 184.2", text: $poundsString)
                        .keyboardType(.decimalPad)
                }

                Section {
                    HStack {
                        SourceChip(source: .manual, confidence: .high)
                        Text("Manual Entry, high confidence")
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }

                if let error = viewModel.saveError {
                    Section {
                        Text(error)
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.red)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Log weight")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(viewModel.isSaving ? "Saving" : "Save") {
                        save()
                    }
                    .disabled(poundsValue == nil || viewModel.isSaving)
                }
            }
        }
    }

    private var poundsValue: Double? {
        let trimmed = poundsString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let value = Double(trimmed), value > 0 else { return nil }
        return value
    }

    private func save() {
        guard let pounds = poundsValue else { return }
        Task {
            guard await viewModel.logPounds(pounds) != nil else { return }
            await onSave()
            dismiss()
        }
    }
}
