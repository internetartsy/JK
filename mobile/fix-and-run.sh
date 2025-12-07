#!/bin/bash

echo "=========================================="
echo "🔧 FIXING CONNECTION ISSUE"
echo "=========================================="
echo ""

echo "Issue: Cannot connect to server during login"
echo "Symptoms: Network error, location diagnostics appearing"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FIXES APPLIED:"
echo "━━━━━━━━━━━━━━━"━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ 1. iOS HTTP Transport Security"
echo "   Added NSAppTransportSecurity to allow HTTP connections"
echo "   Required for local Keycloak on http://localhost:8080"
echo ""

echo "✅ 2. Backend Verification"
echo "   Testing connections..."
echo ""

# Test Keycloak
KEYCLOAK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
if [ "$KEYCLOAK" = "200" ] || [ "$KEYCLOAK" = "302" ] || [ "$KEYCLOAK" = "303" ]; then
    echo "   ✅ Keycloak: Reachable (HTTP $KEYCLOAK)"
else  
    echo "   ❌ Keycloak: Not reachable (HTTP $KEYCLOAK)"
    echo "   → Starting Keycloak..."
    cd /Users/mic/docode/jk
    docker-compose up -d keycloak
fi

# Test Backend
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/api/v1/parcels/ 2>/dev/null)
if [ "$BACKEND" = "200" ]; then
    echo "   ✅ Backend API: Connected (HTTP $BACKEND)"
else
    echo "   ❌ Backend API: Not connected (HTTP $BACKEND)"
    echo "   → Starting Backend..."
    cd /Users/mic/docode/jk
    docker-compose up -d backend nginx
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESTARTING APP WITH FIXES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /Users/mic/docode/jk/mobile

# Start fresh
echo "1. Starting Metro with cleared cache..."
npx expo start --clear &
METRO_PID=$!

echo "2. Waiting for Metro to start..."
sleep 8

echo "3. Opening simulator..."
open -a Simulator
sleep 3

echo "4. Opening app in Expo Go..."
xcrun simctl openurl booted exp://localhost:8081

sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ APP RESTARTED WITH FIXES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Check your simulator now"
echo ""
echo "What should happen:"
echo "  1. App loads in Expo Go"
echo "  2. LoginScreen appears"
echo "  3. Tap 'Login with Keycloak'"
echo "  4. Browser opens to login page"
echo "  5. Enter: admin / admin"
echo "  6. Redirects back to app"
echo "  7. App shows main content"
echo ""
echo "If you see location permission dialog:"
echo "  → This is from Expo Go, not your app"
echo "  → You can deny it (not needed for auth)"
echo ""
echo "Metro is running in background (PID: $METRO_PID)"
echo "To stop: kill $METRO_PID"
echo ""
echo "=========================================="
