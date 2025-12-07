#!/bin/bash

echo "========================================="
echo "Mobile Auth Test - Step by Step"
echo "========================================="
echo ""

echo "📱 Current State Check..."
echo ""
echo "From terminal logs, the app shows:"
echo "  ✅ Token refreshed"
echo "  ✅ Database initialized"
echo "  → This means you're AUTHENTICATED"
echo ""

echo "========================================="
echo "TEST PLAN"
echo "========================================="
echo ""

echo "Step 1: Verify Current State"
echo "-----------------------------"
echo "Look at the iPhone 14 Pro Simulator:"
echo "  [ ] Can you see the main app (Map/Capture screens)?"
echo "  [ ] Can you see a Logout button in the app bar?"
echo "  [ ] OR do you see the LoginScreen?"
echo ""
echo "If you see the LOGIN screen:"
echo "  → Tap 'Login with Keycloak'"
echo "  → Browser will open"
echo "  → Login with: admin / admin"
echo "  → App should redirect back and show main content"
echo ""
echo "If you see the MAIN app:"
echo "  → You're already logged in!"
echo "  → Proceed to Step 2"
echo ""

echo "Step 2: Test Logout"
echo "-----------------------------"
echo "  1. Find the Logout button (usually in app bar)"
echo "  2. Tap Logout"
echo "  3. Should return to LoginScreen"
echo "  4. Token should be cleared from SecureStore"
echo ""

echo "Step 3: Test Re-Login"  
echo "-----------------------------"
echo "  1. Tap 'Login with Keycloak' button"
echo "  2. Browser opens to Keycloak login"
echo "  3. Enter credentials: admin / admin"
echo "  4. Keycloak redirects back to app"
echo "  5. Should see main app content"
echo ""

echo "Step 4: Check Terminal Logs"
echo "-----------------------------"
echo "Expected to see:"
echo "  - 'Initiating Auth Session with PKCE...'"
echo "  - 'Redirect URI: exp://...'"
echo "  - 'Code received, exchanging for token with PKCE...'"
echo "  - 'Token refreshed' (or no error)"
echo "  - 'Database initialized'"
echo ""

echo "========================================="
echo "VERIFY BACKEND INTEGRATION"
echo "========================================="
echo ""

# Get current token if possible (requires app to expose it somehow)
echo "To verify token with Keycloak:"
echo ""
echo "1. Extract token from app (if you have dev tools)"
echo "2. Test with:"
echo '   curl -X GET "http://localhost:8080/realms/agristack/protocol/openid-connect/userinfo" \'
echo '     -H "Authorization: Bearer <YOUR_TOKEN>"'
echo ""

echo "========================================="
echo "TROUBLESHOOTING"
echo "========================================="
echo ""
echo "If login fails with 'Offline tokens not allowed':"
echo "  → User might not have offline_access role"
echo "  → Run: ./config/enable-offline-access.sh"
echo ""
echo "If redirect fails:"
echo "  → Check Keycloak redirectUris include: exp://192.168.1.11:8081/*"
echo "  → Expo Go must be installed on simulator"
echo ""
echo "If app shows fallback for Map:"
echo "  → EXPECTED in Expo Go"
echo "  → Native modules need Development Build"
echo ""

echo "========================================="
echo "Current Keycloak Configuration"
echo "========================================="
echo ""

# Get admin token
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ -n "$TOKEN" ]; then
    echo "✅ Keycloak is reachable"
    
    # Check client config
    echo ""
    echo "Mobile Client Configuration:"
    curl -s -X GET "http://localhost:8080/admin/realms/agristack/clients" \
      -H "Authorization: Bearer $TOKEN" | \
      jq '.[] | select(.clientId=="agristack-mobile") | {
        clientId, 
        redirectUris, 
        optionalClientScopes: .optionalClientScopes
      }'
    
    echo ""
    echo "Admin User Roles:"
    USER_ID=$(curl -s -X GET "http://localhost:8080/admin/realms/agristack/users?username=admin" \
      -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
    
    curl -s -X GET "http://localhost:8080/admin/realms/agristack/users/$USER_ID/role-mappings/realm" \
      -H "Authorization: Bearer $TOKEN" | jq '[.[].name]'
else
    echo "❌ Could not connect to Keycloak"
    echo "   Ensure Keycloak is running: docker ps | grep keycloak"
fi

echo ""
echo "========================================="
echo "Ready to test! Check the simulator now."
echo "========================================="
