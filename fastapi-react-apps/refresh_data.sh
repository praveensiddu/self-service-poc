#!/bin/bash

# Refresh Pre-Prepared Data
# This script deletes everything in the cloned-repositories folder and restarts the app

echo "🔄 Refreshing pre-prepared data..."

# Step 1: Clean the cloned-repositories folder
CLONED_REPOS_DIR="$HOME/workspace/kselfserv/cloned-repositories"

if [ -d "$CLONED_REPOS_DIR" ]; then
    echo "📁 Cleaning $CLONED_REPOS_DIR..."
    rm -rf "$CLONED_REPOS_DIR"/*

    if [ $? -eq 0 ]; then
        echo "✅ Successfully cleaned cloned-repositories folder"
    else
        echo "❌ Failed to clean cloned-repositories folder"
        exit 1
    fi
else
    echo "⚠️  Warning: Directory $CLONED_REPOS_DIR does not exist"
fi

# Step 2: Stop the app
echo ""
echo "🛑 Stopping the application..."
./stop.sh

# Step 3: Start the app
echo ""
echo "🚀 Starting the application..."
./start.sh

echo ""
echo "✅ Data refresh complete!"
