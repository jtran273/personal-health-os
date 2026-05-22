import XCTest
@testable import BodyOS

final class HealthDataRouterTests: XCTestCase {
    func testPreferredSourcesWinWhenAvailable() {
        let router = HealthDataRouter(availableSources: [.oura, .appleWatch, .iphone, .manual])

        XCTAssertEqual(router.bestSleepSource(), .appleWatch)
        XCTAssertEqual(router.bestStepSource(), .appleWatch)
        XCTAssertEqual(router.bestActiveCalorieSource(), .appleWatch)
        XCTAssertEqual(router.bestWeightSource(), .manual)
    }

    func testFallbackSourcesStayConservative() {
        let router = HealthDataRouter(availableSources: [])

        XCTAssertEqual(router.bestSleepSource(), .estimated)
        XCTAssertEqual(router.bestStepSource(), .estimated)
        XCTAssertEqual(router.bestActiveCalorieSource(), .estimated)
        XCTAssertEqual(router.bestWeightSource(), .manual)
    }
}
