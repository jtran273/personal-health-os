import Foundation

public enum WeightTrendStatus: Equatable {
    case ready
    case insufficientData(required: Int, actual: Int)
}

public struct WeightTrendSummary: Equatable {
    public let windowDays: Int
    public let sampleCount: Int
    public let startDate: Date?
    public let endDate: Date?
    public let startWeightKg: Double?
    public let endWeightKg: Double?
    public let changeKg: Double?
    public let status: WeightTrendStatus

    public var changeLb: Double? {
        changeKg.map { $0 * WeightService.poundsPerKilogram }
    }
}

public struct DeficitCalibrationSummary: Equatable {
    public let trend: WeightTrendSummary
    public let avgEstimatedDeficit: Int?
    public let observedDeficitKcalPerDay: Int?
    public let correctionKcalPerDay: Int?
    public let status: WeightTrendStatus
}

/// Computes weight trends and calorie-model calibration from ledger rows.
public final class WeightTrendService {
    public static let minimumWeightSamples = 2

    private let calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    public func trend(entries: [DailyLedgerEntry], windowDays: Int) -> WeightTrendSummary {
        let weights = filteredWeights(entries: entries, windowDays: windowDays)
        guard weights.count >= Self.minimumWeightSamples, let first = weights.first, let last = weights.last else {
            return WeightTrendSummary(
                windowDays: windowDays,
                sampleCount: weights.count,
                startDate: weights.first?.date,
                endDate: weights.last?.date,
                startWeightKg: weights.first?.weightKg,
                endWeightKg: weights.last?.weightKg,
                changeKg: nil,
                status: .insufficientData(required: Self.minimumWeightSamples, actual: weights.count)
            )
        }

        return WeightTrendSummary(
            windowDays: windowDays,
            sampleCount: weights.count,
            startDate: first.date,
            endDate: last.date,
            startWeightKg: first.weightKg,
            endWeightKg: last.weightKg,
            changeKg: last.weightKg - first.weightKg,
            status: .ready
        )
    }

    public func trends(entries: [DailyLedgerEntry]) -> [WeightTrendSummary] {
        [7, 14, 28].map { trend(entries: entries, windowDays: $0) }
    }

    public func calibration(entries: [DailyLedgerEntry], windowDays: Int) -> DeficitCalibrationSummary {
        let trend = trend(entries: entries, windowDays: windowDays)
        let deficits = entries
            .filter { isWithinWindow($0.date, windowDays: windowDays) }
            .compactMap(\.estimatedDeficit)
        let avgDeficit = deficits.isEmpty ? nil : deficits.reduce(0, +) / deficits.count

        guard
            trend.status == .ready,
            let changeLb = trend.changeLb,
            let start = trend.startDate,
            let end = trend.endDate
        else {
            return DeficitCalibrationSummary(
                trend: trend,
                avgEstimatedDeficit: avgDeficit,
                observedDeficitKcalPerDay: nil,
                correctionKcalPerDay: nil,
                status: trend.status
            )
        }

        let days = max(1, calendar.dateComponents([.day], from: start, to: end).day ?? 1)
        let observedDeficit = Int(((-changeLb * 3500.0) / Double(days)).rounded())
        let correction = avgDeficit.map { observedDeficit - $0 }

        return DeficitCalibrationSummary(
            trend: trend,
            avgEstimatedDeficit: avgDeficit,
            observedDeficitKcalPerDay: observedDeficit,
            correctionKcalPerDay: correction,
            status: trend.status
        )
    }

    private func filteredWeights(entries: [DailyLedgerEntry], windowDays: Int) -> [WeightEntry] {
        entries
            .filter { isWithinWindow($0.date, windowDays: windowDays) }
            .compactMap(\.weight)
            .sorted { $0.date < $1.date }
    }

    private func isWithinWindow(_ date: Date, windowDays: Int) -> Bool {
        let today = calendar.startOfDay(for: Date())
        guard let start = calendar.date(byAdding: .day, value: -(windowDays - 1), to: today) else {
            return false
        }
        let day = calendar.startOfDay(for: date)
        return day >= start && day <= today
    }
}
