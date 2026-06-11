import SwiftUI

/// Root tab bar for the simplified BodyOS app shell.
struct RootTabView: View {
    @Environment(\.appDependencies) private var dependencies
    @State private var selectedTab: RootTab = RootTab.initial

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView(viewModel: TodayViewModel(
                store: dependencies.ledgerStore,
                healthKitIngestor: dependencies.healthKitIngestor,
                ouraIngestor: dependencies.ouraIngestor
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

            WeeklyReviewView(viewModel: WeeklyReviewViewModel(
                store: dependencies.ledgerStore,
                healthKitIngestor: dependencies.healthKitIngestor
            ))
                .tabItem { Label("Past", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(RootTab.past)

            SourcesView(viewModel: SourcesViewModel(
                healthKitService: dependencies.healthKitService,
                healthKitIngestor: dependencies.healthKitIngestor,
                ouraIngestor: dependencies.ouraIngestor,
                store: dependencies.ledgerStore
            ))
                .tabItem { Label("Settings", systemImage: "slider.horizontal.3") }
                .tag(RootTab.settings)
        }
        .tint(Theme.textPrimary)
    }
}

private enum RootTab: Hashable {
    case today
    case past
    case settings

    static var initial: RootTab {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "--initial-tab"),
              args.indices.contains(index + 1) else {
            return .today
        }
        switch args[index + 1] {
        case "weekly", "past": return .past
        case "sources", "settings": return .settings
        default: return .today
        }
    }
}
