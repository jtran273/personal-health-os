import Foundation

/// Computes the daily `BodyMode` traffic-light from a ledger entry.
///
/// Rationale:
///   - Readiness score is the highest-signal single number when a source provides it,
///     so we use it as the primary input when present.
///   - When readiness is missing, total sleep is the next-most-reliable
///     proxy for whether the body is ready to push.
///   - When neither is present, default to yellow ("maintain") rather than
///     guessing green/red — under-information should never tell the user
///     to either overreach or unnecessarily back off.
public final class BodyModeEngine {
    public init() {}

    public func computeMode(from entry: DailyLedgerEntry) -> BodyMode {
        if let readiness = entry.sleep?.readinessScore?.value {
            switch readiness {
            case 80...: return .green
            case 60..<80: return .yellow
            default: return .red
            }
        }

        if let sleepMinutes = entry.sleep?.totalSleepMinutes?.value {
            switch sleepMinutes {
            case 420...: return .green
            case 360..<420: return .yellow
            default: return .red
            }
        }

        return .yellow
    }
}
