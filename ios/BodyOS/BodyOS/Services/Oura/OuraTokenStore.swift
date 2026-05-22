import Foundation
import Security

/// Keychain-backed storage for the Oura Personal Access Token.
///
/// Token resolution order:
///   1. Keychain (set via Settings → Oura → Paste token).
///   2. `OURA_PAT` in `Secrets.plist` (gitignored dev fallback).
///   3. `OURA_PAT` environment variable (Xcode scheme env).
///   4. `nil` — Oura is treated as disconnected.
public final class OuraTokenStore {
    public static let shared = OuraTokenStore()

    private let service = "com.bodyos.oura"
    private let account = "personalAccessToken"

    private init() {}

    /// Returns the active token, or nil if none is configured.
    public func currentToken() -> String? {
        if let kc = keychainRead() { return kc }
        if let plist = secretsPlistToken() { return plist }
        if let env = ProcessInfo.processInfo.environment["OURA_PAT"], !env.isEmpty { return env }
        return nil
    }

    /// True when a usable token exists in any source.
    public var isConfigured: Bool { currentToken() != nil }

    /// Persist a token to the Keychain. Pass nil or empty string to clear.
    @discardableResult
    public func setToken(_ token: String?) -> Bool {
        let trimmed = token?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let value = trimmed, !value.isEmpty else { return keychainDelete() }
        return keychainWrite(value)
    }

    // MARK: - Keychain

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }

    private func keychainRead() -> String? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess,
              let data = item as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        return token
    }

    private func keychainWrite(_ token: String) -> Bool {
        let query = baseQuery()
        let attributes: [String: Any] = [
            kSecValueData as String: Data(token.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return true }
        if updateStatus == errSecItemNotFound {
            var addQuery = query
            addQuery.merge(attributes) { _, new in new }
            return SecItemAdd(addQuery as CFDictionary, nil) == errSecSuccess
        }
        return false
    }

    @discardableResult
    private func keychainDelete() -> Bool {
        SecItemDelete(baseQuery() as CFDictionary) == errSecSuccess
    }

    // MARK: - Dev fallback

    private func secretsPlistToken() -> String? {
        guard let url = Bundle.main.url(forResource: "Secrets", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
              let token = plist["OURA_PAT"] as? String,
              !token.isEmpty else {
            return nil
        }
        return token
    }
}
