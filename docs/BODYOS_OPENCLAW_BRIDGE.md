# BodyOS → OpenClaw Health Bridge

OpenClaw on Mac cannot read Apple Health or HealthKit cloud data directly. The safe path is:

1. BodyOS iOS requests HealthKit read permission from the user.
2. BodyOS ingests Apple Watch/iPhone/smart-scale-derived signals into its local daily ledger.
3. BodyOS exports a bounded assistant-safe JSON summary.
4. Health OS/OpenClaw validates that summary and may turn the latest day into `/api/openclaw/health/*`-style daily guidance.

## Local/dev handoff

BodyOS can produce the JSON with `OpenClawHealthExporter`:

```swift
let entries = await ledgerStore.recentEntries(days: 7)
let exporter = OpenClawHealthExporter()
try exporter.writeLocalHandoff(
    entries: entries,
    to: handoffURL,
    permission: .granted
)
```

The payload kind is `bodyos.openclaw.health.daily_export`. It contains daily summaries only: source-tagged metrics, confidence, freshness, missing signals, body mode, and meal totals/counts. It does **not** contain raw HealthKit samples, raw provider payloads, sample UUIDs, meal photo bytes, secrets, or auth tokens.

## Network/dev endpoint

For local development, the web app exposes:

```http
POST /api/openclaw/health/bodyos-ledger
Authorization: Bearer $OPENCLAW_HEALTH_TOKEN
Content-Type: application/json
```

The bearer token must come from explicit local configuration. Do not include it in the JSON body, logs, fixture payloads, commits, or screenshots.

A successful response acknowledges the number of days accepted and returns the latest assistant-facing daily summary. The current implementation validates and normalizes the handoff; persistence can be attached later without changing the payload shape.

## Privacy rules

- HealthKit reads happen only in BodyOS on iOS after user permission.
- OpenClaw receives normalized summaries, not raw Apple Health samples.
- Every metric includes `source`, `confidence`, `observedAt`, and `freshnessMinutes`.
- `missingSignals` tells the assistant what not to assume.
- `safety.rawHealthKitSamplesIncluded`, `safety.rawProviderPayloadsIncluded`, and `safety.tokenIncluded` must all be `false`.

## Minimal payload example

```json
{
  "kind": "bodyos.openclaw.health.daily_export",
  "bridgeVersion": "2026-05-22",
  "exportedAt": "2026-05-22T16:55:00Z",
  "device": {
    "app": "BodyOS",
    "platform": "iOS",
    "healthKitPermission": "granted"
  },
  "dailySummaries": [
    {
      "date": "2026-05-22",
      "bodyMode": "yellow",
      "sleepHours": {
        "value": 6.7,
        "unit": "h",
        "source": "apple_watch",
        "confidence": "high",
        "observedAt": "2026-05-22T14:00:00Z",
        "freshnessMinutes": 175
      },
      "steps": {
        "value": 8300,
        "unit": "count",
        "source": "apple_watch",
        "confidence": "high",
        "observedAt": "2026-05-22T16:50:00Z",
        "freshnessMinutes": 5
      },
      "missingSignals": ["meals", "resting_heart_rate"],
      "sourceAttribution": [
        {
          "signal": "steps",
          "source": "apple_watch",
          "confidence": "high",
          "observedAt": "2026-05-22T16:50:00Z",
          "freshnessMinutes": 5
        }
      ]
    }
  ],
  "safety": {
    "rawHealthKitSamplesIncluded": false,
    "rawProviderPayloadsIncluded": false,
    "tokenIncluded": false
  }
}
```
