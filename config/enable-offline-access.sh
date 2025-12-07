#!/bin/bash

# Get admin token
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

# Get the client ID (internal UUID)
CLIENT_UUID=$(curl -s -X GET "http://localhost:8080/admin/realms/agristack/clients" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.clientId=="agristack-mobile") | .id')

echo "Client UUID: $CLIENT_UUID"

# Get current client configuration  
curl -s -X GET "http://localhost:8080/admin/realms/agristack/clients/$CLIENT_UUID" \
  -H "Authorization: Bearer $TOKEN" > /tmp/client-config.json

# Update the client to include offline_access in optional scopes
# Get offline_access scope ID
OFFLINE_SCOPE_ID=$(curl -s -X GET "http://localhost:8080/admin/realms/agristack/client-scopes" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="offline_access") | .id')

echo "Offline Access Scope ID: $OFFLINE_SCOPE_ID"

# Add offline_access to optional client scopes
curl -s -X PUT "http://localhost:8080/admin/realms/agristack/clients/$CLIENT_UUID/optional-client-scopes/$OFFLINE_SCOPE_ID" \
  -H "Authorization: Bearer $TOKEN"

echo "✅ Offline access enabled for agristack-mobile client"
