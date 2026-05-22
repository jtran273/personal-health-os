import XCTest
@testable import BodyOS

final class MealsViewModelTests: XCTestCase {
    func testParseManualMealDraftExtractsCaloriesProteinAndDescription() throws {
        let parsed = try XCTUnwrap(MealsViewModel.parseManualMealDraft("chicken bowl 650 kcal 42g protein"))

        XCTAssertEqual(parsed.description, "chicken bowl")
        XCTAssertEqual(parsed.calories, 650)
        XCTAssertEqual(parsed.proteinG, 42)
    }

    func testParseManualMealDraftSupportsCaloriesOnly() throws {
        let parsed = try XCTUnwrap(MealsViewModel.parseManualMealDraft("pho 780 calories"))

        XCTAssertEqual(parsed.description, "pho")
        XCTAssertEqual(parsed.calories, 780)
        XCTAssertNil(parsed.proteinG)
    }

    func testParseManualMealDraftRejectsMissingCalories() {
        XCTAssertNil(MealsViewModel.parseManualMealDraft("chicken bowl with rice"))
    }

    func testManualMealWritesTodayLedgerAndRecomputesDeficit() async {
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        let active = MetricSample(value: 500, source: .appleWatch, confidence: 0.4)
        await store.upsert(DailyLedgerEntry(date: today, activeCalories: active))
        UserDefaults.standard.set(1700, forKey: "profile.bmr")

        let viewModel = MealsViewModel(store: store)
        let entry = await viewModel.logManualMeal(
            description: "Chicken bowl",
            calories: 650,
            proteinG: 42
        )

        XCTAssertEqual(entry?.meals.count, 1)
        XCTAssertEqual(entry?.meals.first?.estimatedCalories?.value, 650)
        XCTAssertEqual(entry?.meals.first?.estimatedCalories?.source, .manual)
        XCTAssertEqual(entry?.meals.first?.estimatedProteinG?.value, 42)
        XCTAssertEqual(entry?.estimatedDeficit, 1550)
        XCTAssertEqual(entry?.coverageScore ?? 0, 2.0 / 7.0, accuracy: 0.0001)

        let saved = await store.entry(for: today)
        XCTAssertEqual(saved?.meals.count, 1)
        XCTAssertEqual(saved?.estimatedDeficit, 1550)
    }

    func testParsedManualMealWritesLedgerAndRecomputesDeficit() async throws {
        let parsed = try XCTUnwrap(MealsViewModel.parseManualMealDraft("chicken bowl 650 kcal 42g protein"))
        let store = InMemoryLedgerStore()
        let today = Calendar.current.startOfDay(for: Date())
        let active = MetricSample(value: 500, source: .appleWatch, confidence: 0.4)
        await store.upsert(DailyLedgerEntry(date: today, activeCalories: active))
        UserDefaults.standard.set(1700, forKey: "profile.bmr")

        let viewModel = MealsViewModel(store: store)
        let entry = await viewModel.logManualMeal(
            description: parsed.description,
            calories: parsed.calories,
            proteinG: parsed.proteinG
        )

        XCTAssertEqual(entry?.meals.first?.description, "chicken bowl")
        XCTAssertEqual(entry?.meals.first?.estimatedCalories?.value, 650)
        XCTAssertEqual(entry?.meals.first?.estimatedCalories?.source, .manual)
        XCTAssertEqual(entry?.meals.first?.estimatedProteinG?.value, 42)
        XCTAssertEqual(entry?.estimatedDeficit, 1550)
        XCTAssertNil(viewModel.saveError)
    }
}
