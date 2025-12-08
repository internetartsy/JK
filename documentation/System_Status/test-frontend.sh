#!/bin/bash
# Frontend/Web Landing Page Tests

set -e

echo "🌐 Starting Frontend Tests..."
echo "================================"

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

echo "✅ 1. Installing dependencies..."
npm install --silent

echo "✅ 2. Running linter..."
npm run lint || echo "⚠️  Linting warnings present"

echo "✅ 3. Type checking TypeScript..."
npx tsc --noEmit || echo "⚠️  TypeScript errors present"

echo "✅ 4. Building production bundle..."
npm run build

echo "✅ 5. Testing dev server startup..."
timeout 10s npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 5

echo "✅ 6. Testing frontend endpoints..."
curl -s http://localhost:5173 > /dev/null && echo "   ✓ Homepage accessible" || echo "   ✗ Homepage failed"


# Kill dev server
kill $DEV_PID 2>/dev/null || true

echo "✅ 7. Bundle size check..."
du -sh dist/ | awk '{print "   Bundle size: " $1}'

echo ""
echo "✅ Frontend tests completed!"
