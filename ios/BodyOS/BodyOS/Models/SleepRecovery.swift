import Foundation

/// A morning-of snapshot of sleep and recovery metrics for a given date.
///
/// Each field is optional because data may not yet have synced from the
/// source device, and is wrapped in `MetricSample` to preserve provenance.
public struct SleepRecovery: Codable, Equatable {
    public var date: Date
    public var totalSleepMinutes: MetricSample<Int>?
    public var hrv: MetricSample<Double>?
    public var restingHR: MetricSample<Int>?
    /// Oura-style 0–100 readiness score.
    public var readinessScore: MetricSample<Int>?
    public var skinTempDelta: MetricSample<Double>?

    public init(
        date: Date,
        totalSleepMinutes: MetricSample<Int>? = nil,
        hrv: MetricSample<Double>? = nil,
        restingHR: MetricSample<Int>? = nil,
        readinessScore: MetricSample<Int>? = nil,
        skinTempDelta: MetricSample<Double>? = nil
    ) {
        self.date = date
        self.totalSleepMinutes = totalSleepMinutes
        self.hrv = hrv
        self.restingHR = restingHR
        self.readinessScore = readinessScore
        self.skinTempDelta = skinTempDelta
    }
}
