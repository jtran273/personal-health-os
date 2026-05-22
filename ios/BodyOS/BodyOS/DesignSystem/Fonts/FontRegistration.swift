import SwiftUI
import CoreText
#if canImport(UIKit)
import UIKit
#endif

/// Custom font registration for BodyOS.
///
/// Production path: list the `.ttf`/`.otf` filenames under `UIAppFonts` in `Info.plist`
/// (see `BodyOS/Resources/Info.plist.template`). iOS registers them automatically at launch
/// and they're available via `Font.custom(_:)`.
///
/// This helper exists for two cases:
///   1. SwiftUI Previews — `UIAppFonts` is not always applied to preview bundles.
///   2. Diagnostic output — call `dumpAvailableFamilies()` to verify the PostScript names
///      match what `Tokens.FontFamily` references.
public enum FontRegistration {

    /// Files we expect to find bundled. Download from Google Fonts and add to the target.
    public static let expectedFiles: [String] = [
        "InstrumentSerif-Regular.ttf",
        "Geist-Regular.ttf",
        "Geist-Medium.ttf",
        "JetBrainsMono-Regular.ttf"
    ]

    /// Register any bundled font files that iOS hasn't already loaded (e.g. in previews).
    /// Safe to call multiple times — duplicate registrations are silently ignored.
    public static func registerBundledFontsIfNeeded() {
        for filename in expectedFiles {
            let parts = filename.split(separator: ".")
            guard parts.count == 2,
                  let url = Bundle.main.url(forResource: String(parts[0]), withExtension: String(parts[1]))
            else { continue }
            var errorRef: Unmanaged<CFError>?
            _ = CTFontManagerRegisterFontsForURL(url as CFURL, .process, &errorRef)
            // Errors are typically "already registered" — ignore.
        }
    }

    /// Print available font families/postscript names. Use during setup to confirm the
    /// names in `Tokens.FontFamily` match what the registered files report.
    public static func dumpAvailableFamilies() {
        #if DEBUG && canImport(UIKit)
        for family in UIFont.familyNames.sorted() {
            print("Family: \(family)")
            for name in UIFont.fontNames(forFamilyName: family).sorted() {
                print("  - \(name)")
            }
        }
        #endif
    }
}
