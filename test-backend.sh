#!/bin/bash
# Backend API Tests

set -e

echo "🔧 Starting Backend Tests..."
echo "================================"

cd "$(dirname "$0")"

echo "✅ 1. Checking Docker services..."
docker-compose ps | grep -E "backend|db|redis" || echo "⚠️  Some services not running"

echo "✅ 2. Testing health endpoint..."
curl -s http://localhost:8000/health | jq '.' || echo "   ✗ Health check failed"

echo "✅ 3. Testing API endpoints..."
curl -s http://localhost:8000/api/v1/parcels/ | jq 'length' | xargs -I {} echo "   ✓ Parcels API: {} records"
curl -s -o /dev/null -w "   ✓ Persons API: %{http_code}\n" http://localhost:8000/api/v1/persons/ || echo "   ✗ Persons API failed"

echo "✅ 4. Testing webhook endpoint..."
curl -s -X POST http://localhost:8000/api/v1/frappe/webhook \
  -H "Content-Type: application/json" \
  -d '{"name":"TestFarmer","event":"insert","doctype":"Farmer","action":"insert","data":{"farmer_id":"TEST001"}}' \
  > /dev/null && echo "   ✓ Webhook endpoint responsive" || echo "   ✗ Webhook failed"

echo "✅ 5. Database connectivity..."
docker-compose exec -T db psql -U postgres -c "SELECT version();" > /dev/null && echo "   ✓ PostgreSQL connected" || echo "   ✗ DB connection failed"

echo "✅ 6. Checking backend logs for errors..."
docker-compose logs backend --tail=50 | grep -i "error" | wc -l | xargs -I {} echo "   Found {} error lines in logs"

echo "✅ 7. Redis connectivity..."
docker-compose exec -T redis redis-cli ping | grep -q "PONG" && echo "   ✓ Redis connected" || echo "   ✗ Redis failed"

echo ""
echo "✅ Backend tests completed!"
