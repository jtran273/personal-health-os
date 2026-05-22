import XCTest
@testable import BodyOS

final class OpenClawHealthExportTests: XCTestCase {
    func testExporterBuildsAssistantSafeDailySummary() throws {
        let calendar = Calendar(identifier: .gregorian)
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 22)))
        let capturedAt = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 22, hour: 7)))
        let exportedAt = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 22, hour: 10)))
        let entry = DailyLedgerEntry(
            date: day,
            sleep: SleepRecovery(
                date: day,
                totalSleepMinutes: MetricSample(value: 402, source: .appleWatch, confidence: 0.78, capturedAt: capturedAt),
                hrv: MetricSample(value: 42.5, source: .appleWatch, confidence: 0.7, capturedAt: capturedAt),
                restingHR: MetricSample(value: 54, source: .appleWatch, confidence: 0.75, capturedAt: capturedAt)
            ),
            weight: WeightEntry(date: capturedAt, weightKg: 81.4, source: .smartScale, confidence: 0.98),
            steps: MetricSample(value: 8_400, source: .appleWatch, confidence: 0.76, capturedAt: capturedAt),
            activeCalories: MetricSample(value: 510, source: .appleWatch, confidence: 0.45, capturedAt: capturedAt),
            meals: [Meal(description: "chicken bowl", estimatedCalories: MetricSample(value: 650, source: .manual, confidence: 0.85, capturedAt: capturedAt))],
            bodyMode: .yellow,
            coverageScore: 1.0
        )

        let export = OpenClawHealthExporter(calendar: calendar).export(entries: [entry], exportedAt: exportedAt, permission: .granted)
        let summary = try XCTUnwrap(export.dailySummaries.first)

        XCTAssertEqual(export.kind, "bodyos.openclaw.health.daily_export")
        XCTAssertEqual(export.device.app, "BodyOS")
        XCTAssertEqual(export.device.platform, "iOS")
        XCTAssertEqual(export.device.healthKitPermission, .granted)
        XCTAssertFalse(export.safety.rawHealthKitSamplesIncluded)
        XCTAssertFalse(export.safety.rawProviderPayloadsIncluded)
        XCTAssertFalse(export.safety.tokenIncluded)
        XCTAssertEqual(summary.date, "2026-05-22")
        XCTAssertEqual(summary.bodyMode, "yellow")
        XCTAssertEqual(summary.sleepHours?.source, "apple_watch")
        XCTAssertEqual(summary.sleepHours?.confidence, "high")
        XCTAssertEqual(summary.activeEnergyCalories?.confidence, "low")
        XCTAssertEqual(summary.activeEnergyCalories?.notes, "Wearable calories are a rough prior only; recalibrate against weight trend.")
        XCTAssertEqual(summary.weightKg?.source, "smart_scale")
        XCTAssertEqual(summary.meals?.count, 1)
        XCTAssertEqual(summary.meals?.calories?.source, "manual")
        XCTAssertTrue(summary.missingSignals.isEmpty)
        XCTAssertTrue(summary.sourceAttribution.contains { $0.signal == "weight" && $0.source == "smart_scale" })
    }

    func testExporterMarksMissingSignalsAndDoesNotEncodeRawMealPhotoData() throws {
        let calendar = Calendar(identifier: .gregorian)
        let day = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 22)))
        let exportedAt = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 5, day: 22, hour: 10)))
        let photoMeal = Meal(description: "photo meal", photoData: Data([0xde, 0xad, 0xbe, 0xef]))
        let entry = DailyLedgerEntry(date: day, meals: [photoMeal])

        let data = try OpenClawHealthExporter(calendar: calendar).jsonData(entries: [entry], exportedAt: exportedAt, permission: .unknown)
        let json = try XCTUnwrap(String(data: data, encoding: .utf8))
        let export = try JSONDecoder.iso8601BodyOS.decode(OpenClawHealthExport.self, from: data)
        let summary = try XCTUnwrap(export.dailySummaries.first)

        XCTAssertTrue(summary.missingSignals.contains("sleep"))
        XCTAssertTrue(summary.missingSignals.contains("weight"))
        XCTAssertEqual(summary.meals?.count, 1)
        XCTAssertFalse(json.contains("deadbeef"))
        XCTAssertFalse(json.localizedCaseInsensitiveContains("photoData"))
        XCTAssertEqual(export.safety.tokenIncluded, false)
    }
}

private extension JSONDecoder {
    static var iso8601BodyOS: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
