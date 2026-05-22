import SwiftUI
import Observation

/// Settings sub-screen: paste / test / clear the Oura Personal Access Token.
struct OuraConnectionView: View {
    @Environment(\.appDependencies) private var dependencies

    @State private var tokenField: String = ""
    @State private var status: Status = .idle
    @State private var personalInfoSummary: String?
    @State private var hasStoredToken: Bool = OuraTokenStore.shared.isConfigured

    enum Status {
        case idle
        case testing
        case ok(String)
        case error(String)
    }

    var body: some View {
        Form {
            Section("Personal Access Token") {
                if hasStoredToken {
                    HStack {
                        Image(systemName: "checkmark.seal.fill").foregroundStyle(Theme.green)
                        Text("Token is configured.")
                    }
                } else {
                    Text("No token configured. Paste your Oura PAT below.")
                        .foregroundStyle(Theme.textSecondary)
                }

                SecureField("oura_pat_...", text: $tokenField)
                    .autocorrectionDisabled(true)
                    .textInputAutocapitalization(.never)

                HStack {
                    Button("Save") { saveToken() }
                        .disabled(tokenField.trimmingCharacters(in: .whitespaces).isEmpty)
                    Spacer()
                    if hasStoredToken {
                        Button("Clear", role: .destructive) { clearToken() }
                    }
                }
            }

            Section("Test connection") {
                Button {
                    Task { await testConnection() }
                } label: {
                    HStack {
                        Text("Fetch personal info")
                        Spacer()
                        if case .testing = status { ProgressView() }
                    }
                }
                .disabled(!hasStoredToken)

                switch status {
                case .idle, .testing:
                    EmptyView()
                case .ok(let message):
                    Label(message, systemImage: "checkmark.circle.fill")
                        .foregroundStyle(Theme.green)
                case .error(let message):
                    Label(message, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(Theme.red)
                }

                if let personalInfoSummary {
                    Text(personalInfoSummary)
                        .font(AppFont.caption)
                        .foregroundStyle(Theme.textSecondary)
                }
            }

            Section("How to get a token") {
                Text("Go to cloud.ouraring.com → Personal Access Tokens → Create New Personal Access Token. Paste it above.")
                    .font(AppFont.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .navigationTitle("Oura")
    }

    private func saveToken() {
        let trimmed = tokenField.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if OuraTokenStore.shared.setToken(trimmed) {
            tokenField = ""
            hasStoredToken = true
            status = .ok("Token saved to Keychain.")
        } else {
            status = .error("Failed to save to Keychain.")
        }
    }

    private func clearToken() {
        OuraTokenStore.shared.setToken(nil)
        hasStoredToken = false
        status = .idle
        personalInfoSummary = nil
    }

    private func testConnection() async {
        status = .testing
        do {
            let info = try await dependencies.ouraService.personalInfo()
            let parts = [
                info.age.map { "age \($0)" },
                info.biologicalSex.map { "sex \($0)" },
                info.weight.map { String(format: "%.1f kg", $0) }
            ].compactMap { $0 }
            personalInfoSummary = parts.isEmpty ? "Connected." : parts.joined(separator: " · ")
            status = .ok("Connected to Oura.")
        } catch {
            personalInfoSummary = nil
            status = .error(error.localizedDescription)
        }
    }
}
