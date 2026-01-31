#!/bin/bash

# Stop FastAPI + React Application
# This script stops the FastAPI server and cleans up processes

cd "$(dirname "$0")"

PORT=8888

echo "Stopping FastAPI + React application..."

# Find and kill uvicorn processes by name
PIDS=$(ps aux | grep '[u]vicorn backend.main:app' | awk '{print $2}')

if [ -z "$PIDS" ]; then
    # No uvicorn process found by name, check port directly
    PORT_PID=$(lsof -ti:$PORT 2>/dev/null)

    if [ ! -z "$PORT_PID" ]; then
        echo "Found process $PORT_PID using port $PORT"
        kill $PORT_PID 2>/dev/null
        sleep 1

        # Force kill if still running
        if ps -p $PORT_PID > /dev/null 2>&1; then
            echo "Force killing process..."
            kill -9 $PORT_PID 2>/dev/null
        fi

        echo "✅ Server stopped (PID: $PORT_PID)"
    else
        echo "ℹ️  No server process found running on port $PORT"
    fi
else
    # Kill all found uvicorn processes
    echo "Found server process(es): $PIDS"

    for PID in $PIDS; do
        echo "Stopping process $PID..."
        kill $PID 2>/dev/null
        sleep 1

        # Force kill if still running
        if ps -p $PID > /dev/null 2>&1; then
            echo "Force killing process $PID..."
            kill -9 $PID 2>/dev/null
        fi
    done

    echo "✅ FastAPI server stopped"
fi

# Double check that port is now free
sleep 1
if lsof -ti:$PORT > /dev/null 2>&1; then
    REMAINING_PID=$(lsof -ti:$PORT)
    echo "⚠️  Warning: Port $PORT is still in use by PID $REMAINING_PID"
    echo "   Run: kill -9 $REMAINING_PID"
else
    echo "✅ Port $PORT is now free"
fi
