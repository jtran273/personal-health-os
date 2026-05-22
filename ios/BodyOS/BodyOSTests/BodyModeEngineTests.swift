import XCTest
@testable import BodyOS

final class BodyModeEngineTests: XCTestCase {
    func testReadinessScoreDrivesModeWhenPresent() {
        let engine = BodyModeEngine()

        XCTAssertEqual(engine.computeMode(from: entry(readiness: 82, sleepMinutes: 300)), .green)
        XCTAssertEqual(engine.computeMode(from: entry(readiness: 70, sleepMinutes: 480)), .yellow)
        XCTAssertEqual(engine.computeMode(from: entry(readiness: 55, sleepMinutes: 480)), .red)
    }

    func testSleepDurationFallbackDrivesModeWhenReadinessMissing() {
        let engine = BodyModeEngine()

        XCTAssertEqual(engine.computeMode(from: entry(readiness: nil, sleepMinutes: 430)), .green)
        XCTAssertEqual(engine.computeMode(from: entry(readiness: nil, sleepMinutes: 390)), .yellow)
        XCTAssertEqual(engine.computeMode(from: entry(readiness: nil, sleepMinutes: 330)), .red)
    }

    func testMissingSignalsDefaultToYellow() {
        XCTAssertEqual(BodyModeEngine().computeMode(from: DailyLedgerEntry(date: Date())), .yellow)
    }

    private func entry(readiness: Int?, sleepMinutes: Int?) -> DailyLedgerEntry {
        let now = Date()
        let sleep = SleepRecovery(
            date: now,
            totalSleepMinutes: sleepMinutes.map {
                MetricSample(value: $0, source: .appleWatch, confidence: 0.85, capturedAt: now)
            },
            readinessScore: readiness.map {
                MetricSample(value: $0, source: .oura, confidence: 0.8, capturedAt: now)
            }
        )
        return DailyLedgerEntry(date: now, sleep: sleep)
    }
}
