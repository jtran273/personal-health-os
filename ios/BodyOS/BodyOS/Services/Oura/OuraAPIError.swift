import Foundation

/// Typed errors surfaced by `OuraService`.
public enum OuraAPIError: LocalizedError {
    case missingToken
    case invalidResponse
    case http(status: Int, body: String?)
    case decoding(underlying: Error)
    case transport(underlying: Error)

    public var errorDescription: String? {
        switch self {
        case .missingToken:
            return "No Oura access token configured. Paste your Personal Access Token in Settings → Oura."
        case .invalidResponse:
            return "Oura returned an unexpected response."
        case .http(let status, let body):
            let snippet = body.flatMap { $0.isEmpty ? nil : String($0.prefix(200)) } ?? ""
            return "Oura HTTP \(status). \(snippet)"
        case .decoding(let underlying):
            return "Oura response decoding failed: \(underlying.localizedDescription)"
        case .transport(let underlying):
            return "Oura request failed: \(underlying.localizedDescription)"
        }
    }
}
