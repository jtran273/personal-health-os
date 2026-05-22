import SwiftUI

/// Root tab bar wiring the four primary tabs of BodyOS.
struct RootTabView: View {
    @Environment(\.appDependencies) private var dependencies
    @State private var selectedTab: RootTab = RootTab.initial

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView(viewModel: TodayViewModel(
                store: dependencies.ledgerStore,
                healthKitIngestor: dependencies.healthKitIngestor
            ), mealsViewModel: MealsViewModel(
                store: dependencies.ledgerStore,
                mealLogService: dependencies.mealLogService,
                deficitEstimator: dependencies.deficitEstimator,
                bodyModeEngine: dependencies.bodyModeEngine
            ), weightViewModel: WeightViewModel(
                store: dependencies.ledgerStore,
                weightService: dependencies.weightService,
                bodyModeEngine: dependencies.bodyModeEngine
            ))
                .tabItem { Label("Today", systemImage: "house") }
                .tag(RootTab.today)

            MealsView(viewModel: MealsViewModel(
                store: dependencies.ledgerStore,
                mealLogService: dependencies.mealLogService,
                deficitEstimator: dependencies.deficitEstimator,
                bodyModeEngine: dependencies.bodyModeEngine
            ))
                .tabItem { Label("Copilot", systemImage: "bubble.left") }
                .tag(RootTab.meals)

            BodyLedgerView(viewModel: BodyLedgerViewModel(
                store: dependencies.ledgerStore,
                healthKitIngestor: dependencies.healthKitIngestor
            ), weightViewModel: WeightViewModel(
                store: dependencies.ledgerStore,
                weightService: dependencies.weightService,
                bodyModeEngine: dependencies.bodyModeEngine
            ))
                .tabItem { Label("Body", systemImage: "list.bullet.rectangle") }
                .tag(RootTab.body)

            WeeklyReviewView(viewModel: WeeklyReviewViewModel(
                store: dependencies.ledgerStore,
                healthKitIngestor: dependencies.healthKitIngestor
            ))
                .tabItem { Label("Weekly", systemImage: "chart.bar") }
                .tag(RootTab.weekly)

            SourcesView(viewModel: SourcesViewModel(
                healthKitService: dependencies.healthKitService,
                healthKitIngestor: dependencies.healthKitIngestor,
                store: dependencies.ledgerStore
            ))
                .tabItem { Label("Sources", systemImage: "point.3.connected.trianglepath.dotted") }
                .tag(RootTab.sources)
        }
    }
}

private enum RootTab: Hashable {
    case today
    case meals
    case body
    case weekly
    case sources

    static var initial: RootTab {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "--initial-tab"),
              args.indices.contains(index + 1) else {
            return .today
        }
        switch args[index + 1] {
        case "meals": return .meals
        case "body": return .body
        case "weekly": return .weekly
        case "sources": return .sources
        default: return .today
        }
    }
}
