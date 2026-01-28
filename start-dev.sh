#!/bin/bash
# Quick start script for Math.AI (Backend + Frontend)
# This script starts both the Python backend and React frontend in separate terminals

echo "🚀 Starting Math.AI..."
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Project root: $SCRIPT_DIR"
echo ""

# Function to check if a port is in use
check_port() {
    if nc -z localhost $1 2>/dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if ports are available
echo "🔍 Checking ports..."
if check_port 8000; then
    echo "⚠️  Port 8000 (Backend) is already in use"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if check_port 5173; then
    echo "⚠️  Port 5173 (Frontend) is already in use"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "✅ Starting services..."
echo ""

# Start Backend
echo "🔧 Starting Backend (Port 8000)..."
cd "$SCRIPT_DIR/AI_logic"
echo "   Run command: uvicorn src.api.server:app --reload --port 8000"

# Check if we're on Windows (Git Bash/MSYS)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    start cmd /k "cd $SCRIPT_DIR\\AI_logic && uvicorn src.api.server:app --reload --port 8000"
else
    # macOS/Linux
    gnome-terminal -- bash -c "cd '$SCRIPT_DIR/AI_logic' && uvicorn src.api.server:app --reload --port 8000; exec bash" &
fi

sleep 2

# Start Frontend
echo "⚛️  Starting Frontend (Port 5173)..."
cd "$SCRIPT_DIR"
echo "   Run command: npm run dev"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    start cmd /k "cd $SCRIPT_DIR && npm run dev"
else
    # macOS/Linux
    gnome-terminal -- bash -c "cd '$SCRIPT_DIR' && npm run dev; exec bash" &
fi

echo ""
echo "✅ Both services starting..."
echo ""
echo "📚 Next steps:"
echo "   1. Wait for both services to start (1-2 seconds)"
echo "   2. Backend: http://localhost:8000"
echo "   3. Frontend: http://localhost:5173"
echo ""
echo "📖 API Docs:"
echo "   http://localhost:8000/docs"
echo ""
