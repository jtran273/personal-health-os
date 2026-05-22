#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios/BodyOS"
PROJECT_FILE="$IOS_DIR/BodyOS.xcodeproj/project.pbxproj"

cd "$IOS_DIR"

if ! command -v xcodegen >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "xcodegen not found; installing with Homebrew..."
    brew install xcodegen
  else
    echo "error: xcodegen is required to regenerate BodyOS.xcodeproj, and Homebrew is not available." >&2
    exit 1
  fi
fi

xcodegen generate

if ! git -C "$ROOT_DIR" diff --exit-code -- ios/BodyOS/BodyOS.xcodeproj ios/BodyOS/project.yml; then
  echo "error: BodyOS.xcodeproj is not in sync with ios/BodyOS/project.yml. Run scripts/ci-ios.sh locally and commit the regenerated project." >&2
  exit 1
fi

if grep -R "Secrets\.plist" "$PROJECT_FILE" >/dev/null 2>&1; then
  echo "error: Secrets.plist or Secrets.plist.example is referenced by the generated Xcode project." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "error: xcodebuild is required for iOS tests." >&2
  exit 1
fi

DESTINATION="${IOS_DESTINATION:-}"
if [[ -z "$DESTINATION" ]]; then
  destinations_output="$(mktemp)"
  if ! xcodebuild -project BodyOS.xcodeproj -scheme BodyOS -showdestinations >"$destinations_output" 2>&1; then
    cat "$destinations_output" >&2
    rm -f "$destinations_output"
    echo "error: failed to query iOS Simulator destinations. Ensure the runner has full Xcode selected, not only Command Line Tools." >&2
    exit 1
  fi
  DESTINATION=$(sed -nE '/name:iPhone/ s/.*platform:iOS Simulator.*name:([^,}]+).*/platform=iOS Simulator,name=\1/p' "$destinations_output" | sed -E 's/[[:space:]]+$//' | head -n 1)
  rm -f "$destinations_output"
fi

if [[ -z "$DESTINATION" ]]; then
  echo "error: no available iOS Simulator destination found for the BodyOS scheme." >&2
  xcodebuild -project BodyOS.xcodeproj -scheme BodyOS -showdestinations || true
  exit 1
fi

echo "Running iOS tests on: $DESTINATION"
xcodebuild test \
  -project BodyOS.xcodeproj \
  -scheme BodyOS \
  -destination "$DESTINATION" \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO
