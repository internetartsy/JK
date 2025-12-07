#!/bin/bash
echo "=========================================="
echo "FIXING CONNECTION ISSUE"
echo "=========================================="
echo ""
echo "Fix 1: Added iOS HTTP transport security"
echo "Fix 2: Restarting app with cleared cache"
echo ""

cd /Users/mic/docode/jk/mobile
npx expo start --clear &
sleep 8
open -a Simulator
sleep 3  
xcrun simctl openurl booted exp://localhost:8081

echo ""
echo "App restarted! Check simulator."
echo "Login with: admin / admin"
echo ""
