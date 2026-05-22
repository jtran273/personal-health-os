import Foundation
import HealthKit

public enum HealthKitServiceError: Error {
    case notAvailable
    case notAuthorized
    case missingType(HKQuantityTypeIdentifier)
    case unexpectedSample
}

/// Domain-level reads BodyOS needs from Apple Health.
public protocol HealthKitReading {
    func fetchSleepRecovery(for date: Date) async throws -> SleepRecovery?
    func fetchSteps(for date: Date) async throws -> MetricSample<Int>?
    func fetchActiveEnergy(for date: Date) async throws -> MetricSample<Int>?
    func fetchWeight(for date: Date) async throws -> WeightEntry?
}

/// Bridge to Apple HealthKit for Apple-Watch- and iPhone-sourced metrics.
public final class HealthKitService: HealthKitReading {
    private let healthStore = HKHealthStore()
    private let calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    /// Request read authorization for the metric types BodyOS consumes.
    public func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitServiceError.notAvailable
        }

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            healthStore.requestAuthorization(toShare: [], read: Self.readTypes) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if success {
                    continuation.resume()
                } else {
                    continuation.resume(throwing: HealthKitServiceError.notAuthorized)
                }
            }
        }
    }

    public func fetchSteps(for date: Date) async throws -> MetricSample<Int>? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            throw HealthKitServiceError.missingType(.stepCount)
        }
        let quantity = try await fetchAttributedSum(type: type, unit: .count(), for: date, metric: .movement)
        return quantity.map {
            MetricSample(value: Int($0.value.rounded()), source: $0.source, confidence: $0.confidence, capturedAt: Date())
        }
    }

    public func fetchActiveEnergy(for date: Date) async throws -> MetricSample<Int>? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else {
            throw HealthKitServiceError.missingType(.activeEnergyBurned)
        }
        let quantity = try await fetchAttributedSum(type: type, unit: .kilocalorie(), for: date, metric: .activeEnergy)
        return quantity.map {
            MetricSample(value: Int($0.value.rounded()), source: $0.source, confidence: $0.confidence, capturedAt: Date())
        }
    }

    public func fetchSleepRecovery(for date: Date) async throws -> SleepRecovery? {
        async let sleepMinutes = fetchSleepMinutes(for: date)
        async let hrv = fetchDailyAverage(.heartRateVariabilitySDNN, unit: .secondUnit(with: .milli), for: date)
        async let restingHR = fetchDailyAverage(.restingHeartRate, unit: HKUnit.count().unitDivided(by: .minute()), for: date)

        let (minutes, hrvMs, restingHeartRate) = try await (sleepMinutes, hrv, restingHR)
        if minutes == nil && hrvMs == nil && restingHeartRate == nil {
            return nil
        }

        let now = Date()
        return SleepRecovery(
            date: date,
            totalSleepMinutes: minutes.map {
                MetricSample(value: $0, source: .appleWatch, confidence: 0.75, capturedAt: now)
            },
            hrv: hrvMs.map {
                MetricSample(value: $0, source: .appleWatch, confidence: 0.7, capturedAt: now)
            },
            restingHR: restingHeartRate.map {
                MetricSample(value: Int($0.rounded()), source: .appleWatch, confidence: 0.75, capturedAt: now)
            }
        )
    }

    public func fetchWeight(latestSince date: Date) async throws -> WeightEntry? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            throw HealthKitServiceError.missingType(.bodyMass)
        }

        let predicate = HKQuery.predicateForSamples(
            withStart: calendar.startOfDay(for: date),
            end: nil,
            options: [.strictStartDate]
        )
        return try await fetchLatestWeight(type: type, predicate: predicate)
    }

    public func fetchWeight(for date: Date) async throws -> WeightEntry? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            throw HealthKitServiceError.missingType(.bodyMass)
        }

        let dayStart = calendar.startOfDay(for: date)
        guard
            let start = calendar.date(byAdding: .hour, value: -6, to: dayStart),
            let end = calendar.date(byAdding: .hour, value: 18, to: dayStart)
        else { return nil }
        let predicate = HKQuery.predicateForSamples(
            withStart: start,
            end: end,
            options: []
        )
        return try await fetchLatestWeight(type: type, predicate: predicate)
    }

    private func fetchLatestWeight(type: HKQuantityType, predicate: NSPredicate) async throws -> WeightEntry? {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<WeightEntry?, Error>) in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: 1,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let sample = samples?.first else {
                    continuation.resume(returning: nil)
                    return
                }
                guard let quantitySample = sample as? HKQuantitySample else {
                    continuation.resume(throwing: HealthKitServiceError.unexpectedSample)
                    return
                }
                let source = Self.metricSource(
                    sourceName: quantitySample.sourceRevision.source.name,
                    bundleIdentifier: quantitySample.sourceRevision.source.bundleIdentifier,
                    deviceName: quantitySample.device?.name,
                    deviceModel: quantitySample.device?.model,
                    manufacturer: quantitySample.device?.manufacturer,
                    metric: .weight
                )
                continuation.resume(returning: WeightEntry(
                    date: quantitySample.startDate,
                    weightKg: quantitySample.quantity.doubleValue(for: .gramUnit(with: .kilo)),
                    source: source,
                    confidence: Self.confidence(for: source, metric: .weight)
                ))
            }
            healthStore.execute(query)
        }
    }

    private func fetchSleepMinutes(for date: Date) async throws -> Int? {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            return nil
        }

        let dayStart = calendar.startOfDay(for: date)
        guard
            let start = calendar.date(byAdding: .hour, value: -12, to: dayStart),
            let end = calendar.date(byAdding: .hour, value: 12, to: dayStart)
        else { return nil }
        let predicate = HKQuery.predicateForSamples(
            withStart: start,
            end: end,
            options: []
        )

        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Int?, Error>) in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let seconds = samples?
                    .compactMap { $0 as? HKCategorySample }
                    .filter { Self.asleepValues.contains($0.value) }
                    .reduce(0.0) { $0 + Self.overlapSeconds(sample: $1, windowStart: start, windowEnd: end) } ?? 0
                continuation.resume(returning: seconds > 0 ? Int((seconds / 60.0).rounded()) : nil)
            }
            healthStore.execute(query)
        }
    }

    private static func overlapSeconds(sample: HKSample, windowStart: Date, windowEnd: Date) -> TimeInterval {
        let start = max(sample.startDate, windowStart)
        let end = min(sample.endDate, windowEnd)
        return max(0, end.timeIntervalSince(start))
    }

    private func fetchDailyAverage(
        _ identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        for date: Date
    ) async throws -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else {
            throw HealthKitServiceError.missingType(identifier)
        }

        let start = calendar.startOfDay(for: date)
        guard let end = calendar.date(byAdding: .day, value: 1, to: start) else { return nil }
        let predicate = HKQuery.predicateForSamples(
            withStart: start,
            end: end,
            options: [.strictStartDate, .strictEndDate]
        )

        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double?, Error>) in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .discreteAverage
            ) { _, statistics, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: statistics?.averageQuantity()?.doubleValue(for: unit))
            }
            healthStore.execute(query)
        }
    }

    private func fetchAttributedSum(
        type: HKQuantityType,
        unit: HKUnit,
        for date: Date,
        metric: HealthKitMetricKind
    ) async throws -> AttributedQuantity? {
        let start = calendar.startOfDay(for: date)
        guard let end = calendar.date(byAdding: .day, value: 1, to: start) else { return nil }
        let predicate = HKQuery.predicateForSamples(
            withStart: start,
            end: end,
            options: [.strictStartDate, .strictEndDate]
        )

        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<AttributedQuantity?, Error>) in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: [.cumulativeSum, .separateBySource]
            ) { _, statistics, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let value = statistics?.sumQuantity()?.doubleValue(for: unit), value > 0 else {
                    continuation.resume(returning: nil)
                    return
                }
                let dominantSource = statistics?.sources()?
                    .compactMap { source -> (HKSource, Double)? in
                        guard let quantity = statistics?.sumQuantity(for: source) else { return nil }
                        return (source, quantity.doubleValue(for: unit))
                    }
                    .max { $0.1 < $1.1 }?
                    .0
                let source = Self.metricSource(
                    sourceName: dominantSource?.name,
                    bundleIdentifier: dominantSource?.bundleIdentifier,
                    deviceName: nil,
                    deviceModel: nil,
                    manufacturer: nil,
                    metric: metric
                )
                continuation.resume(returning: AttributedQuantity(
                    value: value,
                    source: source,
                    confidence: Self.confidence(for: source, metric: metric)
                ))
            }
            healthStore.execute(query)
        }
    }

    static func metricSource(
        sourceName: String?,
        bundleIdentifier: String?,
        deviceName: String?,
        deviceModel: String?,
        manufacturer: String?,
        metric: HealthKitMetricKind
    ) -> MetricSource {
        let haystack = [sourceName, bundleIdentifier, deviceName, deviceModel, manufacturer]
            .compactMap { $0?.lowercased() }
            .joined(separator: " ")

        if haystack.contains("watch") {
            return .appleWatch
        }
        if haystack.contains("oura") {
            return .oura
        }
        if metric == .weight && (
            haystack.contains("scale") ||
            haystack.contains("withings") ||
            haystack.contains("renpho") ||
            haystack.contains("eufy") ||
            haystack.contains("fitbit")
        ) {
            return .smartScale
        }
        if haystack.contains("iphone") || haystack.contains("health") || bundleIdentifier?.hasPrefix("com.apple") == true {
            return .iphone
        }

        switch metric {
        case .movement, .activeEnergy, .recovery:
            return .iphone
        case .weight:
            return .manual
        }
    }

    private static func confidence(for source: MetricSource, metric: HealthKitMetricKind) -> Double {
        switch (metric, source) {
        case (.weight, .smartScale):
            return 0.98
        case (.weight, .manual):
            return 0.92
        case (.weight, .iphone):
            return 0.8
        case (.movement, .appleWatch):
            return 0.75
        case (.movement, .iphone):
            return 0.55
        case (.activeEnergy, .appleWatch):
            return 0.45
        case (.activeEnergy, .iphone):
            return 0.35
        case (.recovery, .appleWatch):
            return 0.75
        default:
            return 0.65
        }
    }

    private static var readTypes: Set<HKObjectType> {
        [
            HKQuantityType.quantityType(forIdentifier: .stepCount),
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned),
            HKQuantityType.quantityType(forIdentifier: .bodyMass),
            HKQuantityType.quantityType(forIdentifier: .restingHeartRate),
            HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
        ].compactMap { $0 }.asSet()
    }

    private static var asleepValues: Set<Int> {
        [
            HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
            HKCategoryValueSleepAnalysis.asleepCore.rawValue,
            HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
            HKCategoryValueSleepAnalysis.asleepREM.rawValue
        ]
    }
}

private extension Array where Element: Hashable {
    func asSet() -> Set<Element> {
        Set(self)
    }
}

struct AttributedQuantity {
    let value: Double
    let source: MetricSource
    let confidence: Double
}

enum HealthKitMetricKind {
    case movement
    case activeEnergy
    case recovery
    case weight
}
