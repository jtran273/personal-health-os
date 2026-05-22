# Fonts

BodyOS uses three families per the design handoff. All are free; download from Google Fonts.

## Files expected here

| File | Family | Where to get it |
|---|---|---|
| `InstrumentSerif-Regular.ttf` | Instrument Serif | <https://fonts.google.com/specimen/Instrument+Serif> |
| `Geist-Regular.ttf` | Geist | <https://fonts.google.com/specimen/Geist> |
| `Geist-Medium.ttf` | Geist | (same link, "Medium 500" weight) |
| `JetBrainsMono-Regular.ttf` | JetBrains Mono | <https://fonts.google.com/specimen/JetBrains+Mono> |

## Setup

The font files are already present. `project.yml` declares them in `UIAppFonts`, and XcodeGen includes them in the generated project. After changing fonts, run:

```bash
xcodegen generate
```

## Verifying

Run the app once in DEBUG and call `FontRegistration.dumpAvailableFamilies()` from anywhere to confirm:

```
Family: Instrument Serif
  - InstrumentSerif-Regular
Family: Geist
  - Geist-Regular
  - Geist-Medium
Family: JetBrains Mono
  - JetBrainsMono-Regular
```

The PostScript names on the right must match `Tokens.FontFamily.*` in `Tokens.swift`. If they don't, update `Tokens.FontFamily` — it's the only place to fix it.

## Why these three

From the handoff README:

> Three families. Always use the right one for the right job — they encode meaning.
> - **Instrument Serif** — headlines, screen titles, editorial numbers.
> - **Geist** — body and UI text.
> - **JetBrains Mono** — ALL-CAPS source labels, timestamps, kicker tags.
