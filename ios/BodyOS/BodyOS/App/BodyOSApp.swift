import SwiftUI

/// App entry point for BodyOS — James's personal physical-health OS.
@main
struct BodyOSApp: App {
    @State private var dependencies = AppDependencies()

    init() {
        FontRegistration.registerBundledFontsIfNeeded()
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(\.appDependencies, dependencies)
        }
    }
}
