import Foundation
import Observation
import SwiftData
import SwiftUI

/// Lightweight DI container. Injected into the SwiftUI environment from the app root.
@Observable
final class AppDependencies {
    let ledgerStore: any LedgerStore
    let ouraService: OuraService
    let ouraIngestor: OuraIngestor
    let healthKitService: HealthKitService
    let healthKitIngestor: HealthKitIngestor
    let mealLogService: MealLogService
    let weightService: WeightService
    let deficitEstimator: DeficitEstimator
    let bodyModeEngine: BodyModeEngine

    init() {
        let store: any LedgerStore
        do {
            store = try SwiftDataLedgerStore.makeDefault()
        } catch {
            #if DEBUG
            assertionFailure("SwiftData ledger store failed; using preview-only in-memory ledger: \(error)")
            store = InMemoryLedgerStore()
            #else
            fatalError("BodyOS requires the persistent SwiftData ledger store at runtime: \(error)")
            #endif
        }

        let oura = OuraService()
        let healthKit = HealthKitService()
        let meals = MealLogService()
        let weight = WeightService()
        let deficit = DeficitEstimator()
        let mode = BodyModeEngine()
        self.ledgerStore = store
        self.ouraService = oura
        self.healthKitService = healthKit
        self.mealLogService = meals
        self.weightService = weight
        self.deficitEstimator = deficit
        self.bodyModeEngine = mode
        self.ouraIngestor = OuraIngestor(oura: oura, store: store, bodyModeEngine: mode)
        self.healthKitIngestor = HealthKitIngestor(healthKit: healthKit, store: store, bodyModeEngine: mode)
    }
}

private struct AppDependenciesKey: EnvironmentKey {
    static let defaultValue: AppDependencies = AppDependencies()
}

extension EnvironmentValues {
    var appDependencies: AppDependencies {
        get { self[AppDependenciesKey.self] }
        set { self[AppDependenciesKey.self] = newValue }
    }
}
