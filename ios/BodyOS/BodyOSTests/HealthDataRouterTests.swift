import XCTest
@testable import BodyOS

final class HealthDataRouterTests: XCTestCase {
    func testAppleWatchWinsForTrialRecoveryAndActivityEvenWhenOuraTokenExists() {
        let router = HealthDataRouter(availableSources: [.oura, .appleWatch, .iphone, .manual])

        XCTAssertEqual(router.bestSleepSource(), .appleWatch)
        XCTAssertEqual(router.bestRecoverySource(), .appleWatch)
        XCTAssertEqual(router.bestStepSource(), .appleWatch)
        XCTAssertEqual(router.bestActiveCalorieSource(), .appleWatch)
        XCTAssertEqual(router.bestWeightSource(), .manual)
    }

    func testOuraTokenAloneDoesNotBecomeAutomaticSleepOrRecoveryRoute() {
        let router = HealthDataRouter(availableSources: [.oura])

        XCTAssertEqual(router.bestSleepSource(), .estimated)
        XCTAssertEqual(router.bestRecoverySource(), .estimated)
    }

    func testDormantOuraCanBeExplicitFallbackWhenAppleHealthIsUnavailable() {
        let router = HealthDataRouter(
            availableSources: [.oura],
            allowsDormantOuraFallback: true
        )

        XCTAssertEqual(router.bestSleepSource(), .oura)
        XCTAssertEqual(router.bestRecoverySource(), .oura)
    }

    func testFallbackSourcesStayConservative() {
        let router = HealthDataRouter(availableSources: [])

        XCTAssertEqual(router.bestSleepSource(), .estimated)
        XCTAssertEqual(router.bestRecoverySource(), .estimated)
        XCTAssertEqual(router.bestStepSource(), .estimated)
        XCTAssertEqual(router.bestActiveCalorieSource(), .estimated)
        XCTAssertEqual(router.bestWeightSource(), .manual)
    }

    func testWeightUsesSmartScaleThenAppleHealthWeightThenManualPrompt() {
        XCTAssertEqual(
            HealthDataRouter(availableSources: [.smartScale, .iphone, .manual], hasAppleHealthWeight: true).bestWeightSource(),
            .smartScale
        )
        XCTAssertEqual(
            HealthDataRouter(availableSources: [.iphone, .manual], hasAppleHealthWeight: true).bestWeightSource(),
            .iphone
        )
        XCTAssertEqual(
            HealthDataRouter(availableSources: [.iphone, .manual], hasAppleHealthWeight: false).bestWeightSource(),
            .manual
        )
        XCTAssertEqual(
            HealthDataRouter(availableSources: [.manual]).bestWeightSource(),
            .manual
        )
    }
}
