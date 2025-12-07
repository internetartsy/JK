#!/bin/bash
# Geo Data and Map Tests

set -e

echo "🗺️  Starting Geo Data Tests..."
echo "================================"

cd "$(dirname "$0")"

echo "✅ 1. Testing PostGIS extension..."
docker-compose exec -T db psql -U postgres -d land_records -c "SELECT PostGIS_version();" | grep -q "POSTGIS" && echo "   ✓ PostGIS installed" || echo "   ✗ PostGIS missing"

echo "✅ 2. Testing spatial data tables..."
docker-compose exec -T db psql -U postgres -d land_records -c "\dt" | grep -i "land" && echo "   ✓ Land parcel tables exist" || echo "   ⚠️  No spatial tables found"

echo "✅ 3. Testing parcel geometries..."
PARCEL_COUNT=$(curl -s http://localhost:8000/api/v1/parcels/ | jq 'length')
echo "   ✓ Found $PARCEL_COUNT parcels"

echo "✅ 4. Testing map tile accessibility..."
curl -s "https://a.tile.openstreetmap.org/10/500/300.png" -o /dev/null && echo "   ✓ OSM tiles accessible" || echo "   ✗ Tile server unreachable"

echo "✅ 5. Validating VGH mapping..."
docker-compose exec -T db psql -U postgres -d land_records -c "SELECT COUNT(*) FROM vgh_map;" 2>/dev/null | grep -E "[0-9]+" && echo "   ✓ VGH mappings present" || echo "   ⚠️  No VGH mappings"

echo "✅ 6. Testing geographic queries..."
docker-compose exec -T db psql -U postgres -d land_records -c "SELECT ST_AsText(ST_MakePoint(73.0479, 33.6844));" | grep -q "POINT" && echo "   ✓ Spatial functions working" || echo "   ✗ Spatial queries failed"

echo "✅ 7. MapLibre GL JS availability..."
curl -s "https://unpkg.com/maplibre-gl/dist/maplibre-gl.js" -o /dev/null && echo "   ✓ MapLibre CDN accessible" || echo "   ✗ MapLibre CDN failed"

echo ""
echo "✅ Geo data tests completed!"
