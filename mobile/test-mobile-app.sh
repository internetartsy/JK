#!/bin/bash
echo "🧹 Cleaning expired tokens and restarting..."
echo ""

# Kill any existing Metro
pkill -f "expo start" 2>/dev/null || true
sleep 2

# Start fresh Metro
cd /Users/mic/docode/jk/mobile
echo "Starting Metro Bundler..."
npx expo start --clear &

sleep 8

echo ""
echo "✅ Metro started on port 8081"
echo ""
echo "📱 Opening iOS Simulator..."
open -a Simulator
sleep 3

echo "🚀 Launching app..."
xcrun simctl openurl booted exp://localhost:8081

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 APP LAUNCHED - TESTING GUIDE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The app is loading in iPhone 14 Pro Simulator"
echo ""
echo "🔑 FRESH LOGIN (Token expired - need new login)"
echo ""
echo "What you'll see:"
echo "  1. LoginScreen with 'Sign in with Keycloak' button"
echo "  2. Tap the button"
echo "  3. Browser opens to Keycloak"
echo "  4. Enter: admin / admin"
echo "  5. Browser redirects back"
echo "  6. App shows main dashboard"
echo ""
echo "✅ Features to test:"
echo "  • Map View (shows fallback in Expo Go)"
echo "  • Add Parcel (mock camera/OCR)"
echo "  • Data Sync (5 parcels available)"
echo "  • Logout → Login again"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
