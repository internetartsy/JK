#!/bin/bash
# Run all tests in parallel

set -e

echo "🚀 Running All Tests in Parallel..."
echo "===================================="

cd "$(dirname "$0")"

# Make scripts executable
chmod +x test-frontend.sh test-backend.sh test-geo.sh test-mobile.sh

# Create log directory
mkdir -p test-logs

# Run tests in parallel and capture output
echo "Starting parallel test execution..."
echo ""

./test-backend.sh > test-logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✓ Backend tests started (PID: $BACKEND_PID)"

./test-geo.sh > test-logs/geo.log 2>&1 &
GEO_PID=$!
echo "✓ Geo data tests started (PID: $GEO_PID)"

./test-frontend.sh > test-logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✓ Frontend tests started (PID: $FRONTEND_PID)"

./test-mobile.sh > test-logs/mobile.log 2>&1 &
MOBILE_PID=$!
echo "✓ Mobile tests started (PID: $MOBILE_PID)"

echo ""
echo "Waiting for all tests to complete..."
echo "You can monitor progress in test-logs/ directory"
echo ""

# Wait for all tests
wait $BACKEND_PID
BACKEND_EXIT=$?
echo "✓ Backend tests completed (exit code: $BACKEND_EXIT)"

wait $GEO_PID
GEO_EXIT=$?
echo "✓ Geo data tests completed (exit code: $GEO_EXIT)"

wait $FRONTEND_PID
FRONTEND_EXIT=$?
echo "✓ Frontend tests completed (exit code: $FRONTEND_EXIT)"

wait $MOBILE_PID
MOBILE_EXIT=$?
echo "✓ Mobile tests completed (exit code: $MOBILE_EXIT)"

echo ""
echo "========================================="
echo "📊 Test Summary"
echo "========================================="

# Display results
cat test-logs/backend.log | tail -1
cat test-logs/geo.log | tail -1
cat test-logs/frontend.log | tail -1
cat test-logs/mobile.log | tail -1

echo ""
echo "Full logs available in test-logs/ directory:"
ls -lh test-logs/*.log

# Exit with error if any test failed
if [ $BACKEND_EXIT -ne 0 ] || [ $GEO_EXIT -ne 0 ] || [ $FRONTEND_EXIT -ne 0 ] || [ $MOBILE_EXIT -ne 0 ]; then
  echo ""
  echo "❌ Some tests failed. Check logs for details."
  exit 1
else
  echo ""
  echo "✅ All tests passed!"
  exit 0
fi
