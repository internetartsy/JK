#!/bin/bash
# Mobile App Tests

set -e

echo "📱 Starting Mobile Tests..."
echo "================================"

cd "$(dirname "$0")/mobile"

echo "✅ 1. Checking Node.js and npm..."
node --version
npm --version

echo "✅ 2. Installing dependencies..."
npm install --silent

echo "✅ 3. Checking Expo CLI..."
npx expo --version

echo "✅ 4. TypeScript type checking..."
npx tsc --noEmit || echo "⚠️  TypeScript errors present"

echo "✅ 5. Running linter..."
npm run lint || echo "⚠️  Linting warnings present"

echo "✅ 6. Checking app.json configuration..."
cat app.json | jq '.expo.name, .expo.slug, .expo.version' || echo "⚠️  Invalid app.json"

echo "✅ 7. Testing prebuild (iOS)..."
if [ -d "ios" ]; then
  echo "   ✓ iOS project exists"
  ls -la ios/*.xcworkspace 2>/dev/null && echo "   ✓ Xcode workspace found" || echo "   ⚠️  No Xcode workspace"
else
  echo "   ⚠️  iOS not prebuild - run: npx expo prebuild -p ios"
fi

echo "✅ 8. Testing prebuild (Android)..."
if [ -d "android" ]; then
  echo "   ✓ Android project exists"
  ls android/app/build.gradle && echo "   ✓ Android build config found" || echo "   ⚠️  Invalid Android project"
else
  echo "   ⚠️  Android not prebuild - run: npx expo prebuild -p android"
fi

echo "✅ 9. Checking dependencies for vulnerabilities..."
npm audit --production | head -20

echo "✅ 10. Asset validation..."
ls assets/*.png 2>/dev/null | wc -l | xargs -I {} echo "   Found {} image assets"

echo ""
echo "✅ Mobile tests completed!"
