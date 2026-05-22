import XCTest
@testable import BodyOS

final class HealthKitSourceAttributionTests: XCTestCase {
    func testClassifiesAppleWatchAndIPhoneSources() {
        XCTAssertEqual(
            HealthKitService.metricSource(
                sourceName: "James's Apple Watch",
                bundleIdentifier: "com.apple.Health",
                deviceName: nil,
                deviceModel: nil,
                manufacturer: "Apple",
                metric: .movement
            ),
            .appleWatch
        )

        XCTAssertEqual(
            HealthKitService.metricSource(
                sourceName: "James's iPhone",
                bundleIdentifier: "com.apple.Health",
                deviceName: "iPhone",
                deviceModel: "iPhone16,2",
                manufacturer: "Apple",
                metric: .movement
            ),
            .iphone
        )
    }

    func testClassifiesOuraBridgeAndSmartScaleWeight() {
        XCTAssertEqual(
            HealthKitService.metricSource(
                sourceName: "Oura",
                bundleIdentifier: "com.ouraring.oura",
                deviceName: nil,
                deviceModel: nil,
                manufacturer: nil,
                metric: .recovery
            ),
            .oura
        )

        XCTAssertEqual(
            HealthKitService.metricSource(
                sourceName: "Withings",
                bundleIdentifier: "com.withings.wiScaleNG",
                deviceName: "Body Smart Scale",
                deviceModel: "Body+",
                manufacturer: "Withings",
                metric: .weight
            ),
            .smartScale
        )
    }
}
