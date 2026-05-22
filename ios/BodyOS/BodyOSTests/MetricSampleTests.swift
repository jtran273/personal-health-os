import XCTest
@testable import BodyOS

final class MetricSampleTests: XCTestCase {
    func testConfidenceBandThresholds() {
        XCTAssertEqual(Confidence(score: 0.90), .high)
        XCTAssertEqual(Confidence(score: 0.75), .high)
        XCTAssertEqual(Confidence(score: 0.74), .med)
        XCTAssertEqual(Confidence(score: 0.45), .med)
        XCTAssertEqual(Confidence(score: 0.44), .low)
    }
}
