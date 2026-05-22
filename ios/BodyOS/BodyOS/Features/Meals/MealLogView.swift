import SwiftUI

/// Modal sheet for logging a manually estimated meal into today's ledger.
struct ManualMealEntrySheet: View {
    let viewModel: MealsViewModel
    let onSave: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var description: String
    @State private var caloriesString: String
    @State private var proteinString: String

    init(
        viewModel: MealsViewModel,
        initialDescription: String = "",
        initialCalories: Int? = nil,
        initialProteinG: Int? = nil,
        onSave: @escaping () async -> Void = {}
    ) {
        self.viewModel = viewModel
        self.onSave = onSave
        _description = State(initialValue: initialDescription)
        _caloriesString = State(initialValue: initialCalories.map(String.init) ?? "")
        _proteinString = State(initialValue: initialProteinG.map(String.init) ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Meal") {
                    TextField("e.g. chicken bowl", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                    TextField("Calories", text: $caloriesString)
                        .keyboardType(.numberPad)
                    TextField("Protein (g, optional)", text: $proteinString)
                        .keyboardType(.numberPad)
                }

                Section {
                    HStack {
                        SourceChip(source: .manual, confidence: .high)
                        Text("Manual estimates stay visible as manual.")
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
            .navigationTitle("Log meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(viewModel.isSaving ? "Saving" : "Save") {
                        save()
                    }
                    .disabled(!canSave || viewModel.isSaving)
                }
            }
        }
    }

    private var calories: Int? {
        Int(caloriesString.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    private var protein: Int? {
        let trimmed = proteinString.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : Int(trimmed)
    }

    private var canSave: Bool {
        !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && (calories ?? 0) > 0
    }

    private func save() {
        guard let calories, calories > 0 else { return }
        Task {
            guard await viewModel.logManualMeal(
                description: description,
                calories: calories,
                proteinG: protein
            ) != nil else { return }
            await onSave()
            dismiss()
        }
    }
}
