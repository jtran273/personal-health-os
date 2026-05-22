import SwiftUI

/// Configuration: connected data sources, profile (height/BMR), about.
struct SettingsView: View {
    @Environment(\.appDependencies) private var dependencies

    @AppStorage("profile.heightCm") private var heightCm: Double = 178
    @AppStorage("profile.bmr") private var bmr: Double = 1700

    @AppStorage("source.healthKit") private var healthKitEnabled: Bool = false
    @AppStorage("source.smartScale") private var smartScaleEnabled: Bool = false
    @State private var healthKitStatus: HealthKitStatus = .idle

    var body: some View {
        Form {
            Section("Connected sources") {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Apple Watch")
                        Text(healthKitSubtitle)
                            .font(AppFont.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                    Spacer()
                    Button(healthKitEnabled ? "Refresh" : "Connect") {
                        Task { await connectHealthKit() }
                    }
                    .disabled(healthKitStatus == .requesting)
                }
                HStack {
                    Text("Oura")
                    Spacer()
                    Text("Disabled")
                        .foregroundStyle(Theme.textSecondary)
                }
                Toggle("Smart Scale", isOn: $smartScaleEnabled)
            }

            Section("Profile") {
                HStack {
                    Text("Height")
                    Spacer()
                    TextField("cm", value: $heightCm, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                    Text("cm").foregroundStyle(Theme.textSecondary)
                }
                HStack {
                    Text("BMR estimate")
                    Spacer()
                    TextField("kcal", value: $bmr, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                    Text("kcal").foregroundStyle(Theme.textSecondary)
                }
            }

            Section("About") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("0.1.0").foregroundStyle(Theme.textSecondary)
                }
                Text("BodyOS — a personal physical-health OS.")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .navigationTitle("Settings")
    }

    private var healthKitSubtitle: String {
        switch healthKitStatus {
        case .idle:
            return healthKitEnabled ? "Connected through Apple Health." : "Not connected"
        case .requesting:
            return "Requesting permission"
        case .connected:
            return "Connected through Apple Health."
        case .connectedNoData:
            return "Permission set; no readable Apple Health samples yet."
        case .failed(let message):
            return message
        }
    }

    private func connectHealthKit() async {
        healthKitStatus = .requesting
        do {
            try await dependencies.healthKitService.requestAuthorization()
            healthKitEnabled = true
            let entry = try await dependencies.healthKitIngestor.ingestRecent(days: 7)
            healthKitStatus = entry == nil ? .connectedNoData : .connected
        } catch {
            healthKitEnabled = false
            healthKitStatus = .failed(error.localizedDescription)
        }
    }
}

private enum HealthKitStatus: Equatable {
    case idle
    case requesting
    case connected
    case connectedNoData
    case failed(String)
}
