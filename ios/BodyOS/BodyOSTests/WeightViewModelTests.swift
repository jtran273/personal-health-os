import XCTest
@testable import BodyOS

final class WeightViewModelTests: XCTestCase {
    func testLogPoundsWritesLedgerAndRecomputesCoverage() async {
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        await store.upsert(DailyLedgerEntry(
            date: today,
            steps: MetricSample(value: 6_000, source: .appleWatch, confidence: 0.75),
            activeCalories: MetricSample(value: 350, source: .appleWatch, confidence: 0.45)
        ))

        let viewModel = WeightViewModel(store: store)
        let entry = await viewModel.logPounds(184)

        XCTAssertEqual(entry?.weight?.source, .manual)
        XCTAssertEqual(entry?.weight?.weightKg ?? 0, 83.46, accuracy: 0.01)
        XCTAssertEqual(entry?.coverageScore ?? 0, 3.0 / 7.0, accuracy: 0.0001)
        XCTAssertNil(viewModel.saveError)
    }
}
