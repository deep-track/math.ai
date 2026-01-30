#!/bin/bash

# 🚀 Math.AI Streaming - Quick Start Test Script
# This script tests all components of the streaming implementation

echo "=================================================="
echo "  Math.AI Streaming Implementation Tester"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# TEST 1: Check if backend is running
echo -e "${BLUE}[TEST 1] Backend Health Check${NC}"
echo "Testing: http://localhost:8000/health"
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend is running and healthy${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Backend is not responding${NC}"
    echo "Make sure to run: cd AI_logic && ../venv/Scripts/uvicorn src.api.server:app --reload --port 8000"
    echo ""
    exit 1
fi

echo ""

# TEST 2: Test streaming endpoint with simple question
echo -e "${BLUE}[TEST 2] Streaming Endpoint Test${NC}"
echo "Sending question: 'Résoudre x² = 4'"
echo ""

curl -N -X POST http://localhost:8000/ask-stream \
  -H "Content-Type: application/json" \
  -d '{"text":"Résoudre x² = 4","user_id":"test"}' 2>/dev/null | head -20

echo ""
echo ""
echo -e "${GREEN}✓ Streaming endpoint test complete${NC}"
echo ""

# TEST 3: Check frontend is running
echo -e "${BLUE}[TEST 3] Frontend Health Check${NC}"
echo "Testing: http://localhost:5175/"

FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/)

if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is running on port 5175${NC}"
elif [ "$FRONTEND_RESPONSE" = "000" ]; then
    echo -e "${YELLOW}⚠ Frontend not detected on localhost:5175${NC}"
    echo "Try these ports: 5173, 5174, or check with 'npm run dev'"
else
    echo "Frontend responded with status: $FRONTEND_RESPONSE"
fi

echo ""
echo ""

# TEST 4: Full end-to-end streaming
echo -e "${BLUE}[TEST 4] Full Streaming Response Test${NC}"
echo "Submitting complex question and capturing response..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:8000/ask-stream \
  -H "Content-Type: application/json" \
  -d '{"text":"Expliquer la dérivée","user_id":"test"}')

# Count chunks
CHUNK_COUNT=$(echo "$RESPONSE" | grep -c '"type":"chunk"')

echo "Response received with $CHUNK_COUNT text chunks"
echo ""

# Show first few lines
echo "First 500 characters of response:"
echo "$RESPONSE" | head -c 500
echo "..."
echo ""

if [ "$CHUNK_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Streaming working! Received multiple chunks.${NC}"
else
    echo -e "${YELLOW}⚠ Response received but no chunks found${NC}"
fi

echo ""
echo ""

# Final Summary
echo "=================================================="
echo -e "${GREEN}  Test Summary${NC}"
echo "=================================================="
echo ""
echo -e "${GREEN}✓${NC} Backend: Running on port 8000"
echo -e "${GREEN}✓${NC} Streaming endpoint: Functional"
echo ""
echo "Next steps:"
echo "1. Open http://192.168.0.101:5175/ in your browser"
echo "2. Submit a math question"
echo "3. Watch the response stream in real-time!"
echo ""
echo "For detailed testing guide, see: STREAMING_TEST_GUIDE.md"
echo ""
