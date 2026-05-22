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
    func fetchSteps(for date: Date) async throws -> Int?
    func fetchActiveEnergy(for date: Date) async throws -> Int?
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

    public func fetchSteps(for date: Date) async throws -> Int? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            throw HealthKitServiceError.missingType(.stepCount)
        }
        let quantity = try await fetchSum(type: type, unit: .count(), for: date)
        return quantity.map { Int($0.rounded()) }
    }

    public func fetchActiveEnergy(for date: Date) async throws -> Int? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else {
            throw HealthKitServiceError.missingType(.activeEnergyBurned)
        }
        let quantity = try await fetchSum(type: type, unit: .kilocalorie(), for: date)
        return quantity.map { Int($0.rounded()) }
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
                continuation.resume(returning: WeightEntry(
                    date: quantitySample.startDate,
                    weightKg: quantitySample.quantity.doubleValue(for: .gramUnit(with: .kilo)),
                    source: .iphone,
                    confidence: 0.8
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

    private func fetchSum(type: HKQuantityType, unit: HKUnit, for date: Date) async throws -> Double? {
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
                options: .cumulativeSum
            ) { _, statistics, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let value = statistics?.sumQuantity()?.doubleValue(for: unit)
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
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
