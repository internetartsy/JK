#!/bin/bash
set -e

echo "🚀 STARTING NATIVE BUILD FOR iOS SIMULATOR (GENERIC)"
echo "===================================================="

cd /Users/mic/docode/jk/mobile/ios

# Clean build folder
rm -rf build

echo "📦 Installing Pods..."
pod install

echo "🏗️  Building 'mobile' scheme..."
# Build for generic simulator
xcodebuild -workspace mobile.xcworkspace \
  -scheme mobile \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ./build

echo "✅ Build Complete."

echo "📱 Installing to Simulator (A9155F81...)..."
# The path might vary slightly with generic build, usually checks architecture
# Let's try to find the .app
APP_PATH=$(find ./build/Build/Products -name "mobile.app" | head -n 1)

if [ -z "$APP_PATH" ]; then
  echo "❌ Could not find mobile.app"
  exit 1
fi

echo "Found app at: $APP_PATH"
xcrun simctl install A9155F81-E4EC-4EFD-8B3B-6C3A43F7E165 "$APP_PATH"

echo "🚀 Launching App..."
xcrun simctl launch A9155F81-E4EC-4EFD-8B3B-6C3A43F7E165 com.agristack.mobile

echo "=========================================="
echo "🎉 NATIVE APP LAUNCHED!"
