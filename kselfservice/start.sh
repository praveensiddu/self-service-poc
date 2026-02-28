#!/bin/bash

# Start FastAPI + React Application
# This script starts the FastAPI server which also serves the React frontend

cd "$(dirname "$0")"

PORT=8888
LOG_FILE="server.log"
PID_FILE="server.pid"

echo "Starting FastAPI + React application..."

# Check if server is already running
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "❌ Error: Port $PORT is already in use. Server may already be running."
    echo "   Use './stop.sh' to stop the existing server first."
    exit 1
fi

# Check for virtual environment
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one now..."
    python3 -m venv venv

    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are installed by checking for a key package
if ! python -c "import requests" 2>/dev/null; then
    echo "📦 Installing/updating dependencies..."
    pip install -r backend/requirements.txt

    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Start the FastAPI server (which serves both backend API and frontend)
echo "🚀 Starting server on port $PORT..."
nohup venv/bin/uvicorn backend.main:app --reload --host 0.0.0.0 --port $PORT > "$LOG_FILE" 2>&1 &

sleep 2

# Verify server started successfully
if lsof -ti:$PORT > /dev/null 2>&1; then
    PID=$(lsof -ti:$PORT)
    echo "$PID" > "$PID_FILE"
    echo ""
    echo "✅ Application started successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   PID:  $PID"
    echo "   Port: $PORT"
    echo "   URL:  http://localhost:$PORT"
    echo "   Logs: tail -f $LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "To stop the server, run: ./stop.sh"
else
    echo ""
    echo "❌ Failed to start server. Check $LOG_FILE for errors:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -20 "$LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
