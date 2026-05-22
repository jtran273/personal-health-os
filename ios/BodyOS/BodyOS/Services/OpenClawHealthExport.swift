import Foundation

/// Assistant-safe BodyOS -> OpenClaw handoff payload.
///
/// This exporter deliberately summarizes the SwiftData ledger. It never includes raw HealthKit
/// samples, sample UUIDs, provider payloads, photos, or auth tokens. HealthKit reads still happen
/// only inside BodyOS after the user grants iOS permission; OpenClaw receives this bounded summary.
public struct OpenClawHealthExport: Codable, Equatable {
    public var kind: String = "bodyos.openclaw.health.daily_export"
    public var bridgeVersion: String
    public var exportedAt: Date
    public var device: Device
    public var dailySummaries: [DailySummary]
    public var safety: Safety

    public init(
        bridgeVersion: String = "2026-05-22",
        exportedAt: Date = Date(),
        healthKitPermission: HealthKitPermission = .unknown,
        dailySummaries: [DailySummary]
    ) {
        self.bridgeVersion = bridgeVersion
        self.exportedAt = exportedAt
        self.device = Device(healthKitPermission: healthKitPermission)
        self.dailySummaries = dailySummaries
        self.safety = Safety()
    }

    public struct Device: Codable, Equatable {
        public var app: String = "BodyOS"
        public var platform: String = "iOS"
        public var healthKitPermission: HealthKitPermission
    }

    public struct Safety: Codable, Equatable {
        public var rawHealthKitSamplesIncluded: Bool = false
        public var rawProviderPayloadsIncluded: Bool = false
        public var tokenIncluded: Bool = false
    }

    public enum HealthKitPermission: String, Codable {
        case granted
        case notGranted = "not_granted"
        case notAvailable = "not_available"
        case unknown
    }

    public struct DailySummary: Codable, Equatable {
        public var date: String
        public var bodyMode: String?
        public var sleepHours: AssistantMetric<Double>?
        public var readinessScore: AssistantMetric<Int>?
        public var hrvMs: AssistantMetric<Double>?
        public var restingHeartRateBpm: AssistantMetric<Int>?
        public var temperatureDeviationC: AssistantMetric<Double>?
        public var steps: AssistantMetric<Int>?
        public var activeEnergyCalories: AssistantMetric<Int>?
        public var weightKg: AssistantMetric<Double>?
        public var meals: MealSummary?
        public var missingSignals: [String]
        public var sourceAttribution: [SourceAttribution]
    }

    public struct AssistantMetric<Value: Codable & Equatable>: Codable, Equatable {
        public var value: Value
        public var unit: String?
        public var source: String
        public var confidence: String
        public var observedAt: Date
        public var freshnessMinutes: Int
        public var notes: String?
    }

    public struct MealSummary: Codable, Equatable {
        public var count: Int
        public var calories: AssistantMetric<Int>?
        public var proteinGrams: AssistantMetric<Int>?
    }

    public struct SourceAttribution: Codable, Equatable {
        public var signal: String
        public var source: String
        public var confidence: String
        public var observedAt: Date
        public var freshnessMinutes: Int
    }
}

public struct OpenClawHealthExporter {
    private let calendar: Calendar
    private let encoder: JSONEncoder

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        self.encoder = encoder
    }

    public func export(entries: [DailyLedgerEntry], exportedAt: Date = Date(), permission: OpenClawHealthExport.HealthKitPermission = .unknown) -> OpenClawHealthExport {
        OpenClawHealthExport(
            exportedAt: exportedAt,
            healthKitPermission: permission,
            dailySummaries: entries
                .sorted { $0.date > $1.date }
                .map { dailySummary(from: $0, exportedAt: exportedAt) }
        )
    }

    public func jsonData(entries: [DailyLedgerEntry], exportedAt: Date = Date(), permission: OpenClawHealthExport.HealthKitPermission = .unknown) throws -> Data {
        try encoder.encode(export(entries: entries, exportedAt: exportedAt, permission: permission))
    }

    public func writeLocalHandoff(entries: [DailyLedgerEntry], to url: URL, exportedAt: Date = Date(), permission: OpenClawHealthExport.HealthKitPermission = .unknown) throws {
        let data = try jsonData(entries: entries, exportedAt: exportedAt, permission: permission)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    private func dailySummary(from entry: DailyLedgerEntry, exportedAt: Date) -> OpenClawHealthExport.DailySummary {
        var attribution: [OpenClawHealthExport.SourceAttribution] = []
        let sleepHours = entry.sleep?.totalSleepMinutes.map {
            metric(Double($0.value) / 60.0, unit: "h", signal: "sleep", sample: $0, exportedAt: exportedAt, attribution: &attribution)
        }
        let readinessScore = entry.sleep?.readinessScore.map {
            metric($0.value, unit: "score", signal: "readiness", sample: $0, exportedAt: exportedAt, attribution: &attribution)
        }
        let hrvMs = entry.sleep?.hrv.map {
            metric($0.value, unit: "ms", signal: "hrv", sample: $0, exportedAt: exportedAt, attribution: &attribution)
        }
        let restingHeartRateBpm = entry.sleep?.restingHR.map {
            metric($0.value, unit: "bpm", signal: "resting_heart_rate", sample: $0, exportedAt: exportedAt, attribution: &attribution)
        }
        let temperatureDeviationC = entry.sleep?.skinTempDelta.map {
            metric($0.value, unit: "celsius", signal: "temperature_deviation", sample: $0, exportedAt: exportedAt, attribution: &attribution)
        }
        let steps = entry.steps.map {
            metric($0.value, unit: "count", signal: "steps", sample: $0, exportedAt: exportedAt, attribution: &attribution)
        }
        let activeEnergyCalories = entry.activeCalories.map {
            metric($0.value, unit: "kcal", signal: "active_energy", sample: $0, exportedAt: exportedAt, attribution: &attribution, notes: "Wearable calories are a rough prior only; recalibrate against weight trend.")
        }
        let weightKg = entry.weight.map {
            weightMetric($0, exportedAt: exportedAt, attribution: &attribution)
        }
        let meals = mealSummary(entry.meals, exportedAt: exportedAt, attribution: &attribution)

        return OpenClawHealthExport.DailySummary(
            date: dayString(entry.date),
            bodyMode: entry.bodyMode?.rawValue,
            sleepHours: sleepHours,
            readinessScore: readinessScore,
            hrvMs: hrvMs,
            restingHeartRateBpm: restingHeartRateBpm,
            temperatureDeviationC: temperatureDeviationC,
            steps: steps,
            activeEnergyCalories: activeEnergyCalories,
            weightKg: weightKg,
            meals: meals,
            missingSignals: missingSignals(entry),
            sourceAttribution: attribution
        )
    }

    private func mealSummary(_ meals: [Meal], exportedAt: Date, attribution: inout [OpenClawHealthExport.SourceAttribution]) -> OpenClawHealthExport.MealSummary? {
        guard !meals.isEmpty else { return nil }
        let calorieSamples = meals.compactMap(\.estimatedCalories)
        let proteinSamples = meals.compactMap(\.estimatedProteinG)
        let calories = aggregateMealMetric(calorieSamples, unit: "kcal", signal: "meals", exportedAt: exportedAt, attribution: &attribution)
        let protein = aggregateMealMetric(proteinSamples, unit: "g", signal: "meals", exportedAt: exportedAt, attribution: &attribution)
        return OpenClawHealthExport.MealSummary(count: meals.count, calories: calories, proteinGrams: protein)
    }

    private func aggregateMealMetric(_ samples: [MetricSample<Int>], unit: String, signal: String, exportedAt: Date, attribution: inout [OpenClawHealthExport.SourceAttribution]) -> OpenClawHealthExport.AssistantMetric<Int>? {
        guard !samples.isEmpty else { return nil }
        let value = samples.reduce(0) { $0 + $1.value }
        let freshest = samples.max { $0.capturedAt < $1.capturedAt } ?? samples[0]
        return metric(value, unit: unit, signal: signal, sample: freshest, exportedAt: exportedAt, attribution: &attribution)
    }

    private func metric<Value: Codable & Equatable, SampleValue>(_ value: Value, unit: String, signal: String, sample: MetricSample<SampleValue>, exportedAt: Date, attribution: inout [OpenClawHealthExport.SourceAttribution], notes: String? = nil) -> OpenClawHealthExport.AssistantMetric<Value> {
        let source = openClawSource(sample.source)
        let confidence = confidenceLabel(sample.confidence)
        let freshnessMinutes = max(0, Int(exportedAt.timeIntervalSince(sample.capturedAt) / 60.0))
        attribution.append(OpenClawHealthExport.SourceAttribution(
            signal: signal,
            source: source,
            confidence: confidence,
            observedAt: sample.capturedAt,
            freshnessMinutes: freshnessMinutes
        ))
        return OpenClawHealthExport.AssistantMetric(
            value: value,
            unit: unit,
            source: source,
            confidence: confidence,
            observedAt: sample.capturedAt,
            freshnessMinutes: freshnessMinutes,
            notes: notes
        )
    }

    private func weightMetric(_ weight: WeightEntry, exportedAt: Date, attribution: inout [OpenClawHealthExport.SourceAttribution]) -> OpenClawHealthExport.AssistantMetric<Double> {
        let source = openClawSource(weight.source)
        let confidence = confidenceLabel(weight.confidence)
        let freshnessMinutes = max(0, Int(exportedAt.timeIntervalSince(weight.date) / 60.0))
        attribution.append(OpenClawHealthExport.SourceAttribution(
            signal: "weight",
            source: source,
            confidence: confidence,
            observedAt: weight.date,
            freshnessMinutes: freshnessMinutes
        ))
        return OpenClawHealthExport.AssistantMetric(
            value: weight.weightKg,
            unit: "kg",
            source: source,
            confidence: confidence,
            observedAt: weight.date,
            freshnessMinutes: freshnessMinutes,
            notes: nil
        )
    }

    private func missingSignals(_ entry: DailyLedgerEntry) -> [String] {
        var missing: [String] = []
        if entry.sleep?.totalSleepMinutes == nil { missing.append("sleep") }
        if entry.sleep?.hrv == nil { missing.append("hrv") }
        if entry.sleep?.restingHR == nil { missing.append("resting_heart_rate") }
        if entry.steps == nil { missing.append("steps") }
        if entry.activeCalories == nil { missing.append("active_energy") }
        if entry.weight == nil { missing.append("weight") }
        if entry.meals.isEmpty { missing.append("meals") }
        return missing
    }

    private func openClawSource(_ source: MetricSource) -> String {
        switch source {
        case .oura: return "oura"
        case .appleWatch: return "apple_watch"
        case .iphone: return "apple_health"
        case .smartScale: return "smart_scale"
        case .manual: return "manual"
        case .mealPhoto, .knownFood, .estimated: return "openclaw"
        }
    }

    private func confidenceLabel(_ confidence: Double) -> String {
        if confidence >= 0.75 { return "high" }
        if confidence >= 0.5 { return "medium" }
        if confidence > 0 { return "low" }
        return "unknown"
    }

    private func dayString(_ date: Date) -> String {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", components.year ?? 1970, components.month ?? 1, components.day ?? 1)
    }
}
