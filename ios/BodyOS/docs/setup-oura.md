# Setting up Oura

Oura is dormant in the current Apple Watch build. The service and token store remain in the codebase as fallback infrastructure, but Today, Body, and Weekly no longer auto-ingest Oura when a token exists.

BodyOS reads Oura via the Cloud API v2 using a **Personal Access Token (PAT)**.

## Get a token

1. Sign in at <https://cloud.ouraring.com>.
2. Open **Personal Access Tokens** → **Create New Personal Access Token**.
3. Copy the token.

## Add it to the app

### Preferred — in-app (stored in iOS Keychain)

1. Open BodyOS on your device or simulator.
2. **Today** → gear icon → **Oura**.
3. Paste the token, tap **Save**, then **Fetch personal info** to verify.

The token is stored in the iOS Keychain. `com.bodyos.oura` is the Keychain service name, not the app bundle id.

### Dev fallback — `Secrets.plist`

For running in the simulator without typing the token every fresh install:

1. Copy `BodyOS/Resources/Secrets.plist.example` → `BodyOS/Resources/Secrets.plist`.
2. Fill in `OURA_PAT`.

`Secrets.plist` is gitignored and excluded from the generated Xcode project so it cannot be bundled or committed accidentally. Prefer Keychain or a scheme environment variable if you need to test Oura again.

### Xcode scheme environment variable

The token store also reads the `OURA_PAT` env var, useful if you set it on the Xcode scheme: **Edit Scheme → Run → Arguments → Environment Variables → `OURA_PAT`**.

## Resolution order

`OuraTokenStore.shared.currentToken()` returns the first hit:

1. Keychain.
2. `Secrets.plist` (bundled).
3. `OURA_PAT` env var.
4. `nil` → Oura treated as disconnected.

## What the app does with it

- Current app: nothing automatically. Oura is disabled while Apple Watch / Apple Health is the active wearable path.
- If Oura is re-enabled later, `OuraIngestor` can fetch `daily_sleep` + `daily_readiness` + `sleep` + `daily_activity` and write them into the ledger as `MetricSample<…>(source: .oura, …)`.
- The token is never logged or sent anywhere except `api.ouraring.com`.

## Rotation

If you ever paste your token into chat, an issue tracker, or a shared screenshot — rotate it. Oura's PAT page lets you delete and recreate at any time.
