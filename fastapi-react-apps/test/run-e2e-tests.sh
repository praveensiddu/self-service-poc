#!/bin/bash

# E2E Test Runner Script
# This script automatically sets up dependencies (if needed) and runs E2E tests
# No separate setup script needed!

set -e

# Default configuration
DEFAULT_PORT=8888
TEST_PORT="${TEST_PORT:-$DEFAULT_PORT}"  # Can be overridden by environment variable

echo "=========================================="
echo "E2E Test Runner for FastAPI React App"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Go to the parent directory (fastapi-react-apps root)
cd "$SCRIPT_DIR/.."

# Check if server is running
check_server() {
    echo "Checking if server is running on http://localhost:${TEST_PORT}..."
    if curl -s "http://localhost:${TEST_PORT}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is running on port ${TEST_PORT}${NC}"
        return 0
    else
        echo -e "${YELLOW}✗ Server is not running on port ${TEST_PORT}${NC}"
        return 1
    fi
}

# Start the server on the specified port
start_server() {
    echo ""
    echo -e "${BLUE}⚙ Starting server on port ${TEST_PORT}...${NC}"

    cd backend

    # Check if virtual environment exists, create if needed
    if [ ! -d "venv" ]; then
        echo "  Creating Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        echo "  Installing backend dependencies..."
        pip install -q --upgrade pip
        pip install -q -r requirements.txt
    else
        source venv/bin/activate
    fi

    # Go back to parent directory to run uvicorn (needed for backend module import)
    cd ..

    # Start server in background from parent directory
    echo "  Starting uvicorn server on port ${TEST_PORT}..."
    source backend/venv/bin/activate
    nohup uvicorn backend.main:app --host 0.0.0.0 --port ${TEST_PORT} > server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > server.pid

    deactivate

    # Wait for server to be ready
    echo "  Waiting for server to be ready..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s "http://localhost:${TEST_PORT}" > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ Server started successfully on port ${TEST_PORT} (PID: ${SERVER_PID})${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done

    echo ""
    echo -e "${RED}  ✗ Failed to start server${NC}"
    echo -e "${YELLOW}  Check logs: tail -f server.log${NC}"
    return 1
}

# Stop the server
stop_server() {
    if [ -f "server.pid" ]; then
        local pid=$(cat server.pid)
        echo ""
        echo -e "${BLUE}⚙ Stopping server (PID: ${pid})...${NC}"

        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || true
            sleep 2

            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid 2>/dev/null || true
            fi

            echo -e "${GREEN}✓ Server stopped${NC}"
        fi

        rm -f server.pid
    fi

    # Also stop Allure server if running
    if [ -f "allure.pid" ]; then
        local allure_pid=$(cat allure.pid)
        if ps -p $allure_pid > /dev/null 2>&1; then
            echo -e "${BLUE}⚙ Stopping Allure server...${NC}"
            kill $allure_pid 2>/dev/null || true
        fi
        rm -f allure.pid
    fi
}

# Smart setup - only installs if dependencies are missing
setup_backend_dependencies() {
    local needs_setup=false

    # Check if venv exists
    if [ ! -d "venv" ]; then
        needs_setup=true
    fi

    # Check if pytest is installed
    if [ -d "venv" ]; then
        source venv/bin/activate
        if ! python -c "import pytest" 2>/dev/null; then
            needs_setup=true
        fi
        deactivate
    fi

    if [ "$needs_setup" = true ]; then
        echo -e "${BLUE}⚙ Setting up backend test dependencies...${NC}"

        if [ ! -d "venv" ]; then
            echo "  Creating Python virtual environment..."
            python3 -m venv venv
        fi

        source venv/bin/activate
        echo "  Installing backend dependencies..."
        pip install -q --upgrade pip
        pip install -q -r requirements.txt
        pip install -q -r tests/requirements-test.txt
        deactivate

        echo -e "${GREEN}  ✓ Backend dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Backend dependencies already configured${NC}"
    fi
}

# Smart setup - only installs if dependencies are missing
setup_frontend_dependencies() {
    local needs_setup=false

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        needs_setup=true
    fi

    # Check if playwright is installed
    if [ ! -d "$HOME/.cache/ms-playwright/chromium-"* ] 2>/dev/null; then
        needs_setup=true
    fi

    if [ "$needs_setup" = true ]; then
        echo -e "${BLUE}⚙ Setting up frontend test dependencies...${NC}"

        if [ ! -d "node_modules" ]; then
            echo "  Installing npm dependencies..."
            npm install --silent
        fi

        if [ ! -d "$HOME/.cache/ms-playwright/chromium-"* ] 2>/dev/null; then
            echo "  Installing Playwright browsers..."
            npx playwright install chromium --with-deps
        fi

        echo -e "${GREEN}  ✓ Frontend dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Frontend dependencies already configured${NC}"
    fi
}

# Backend E2E Tests
run_backend_tests() {
    echo ""
    echo "=========================================="
    echo "Running Backend E2E Tests"
    echo "=========================================="
    cd backend

    # Smart setup - only installs if needed
    setup_backend_dependencies

    echo ""
    echo "Running pytest..."
    source venv/bin/activate
    pytest tests/e2e/ -v --tb=short

    BACKEND_EXIT=$?

    # Cleanup test data (e2e-test-app) after tests
    echo ""
    echo "Cleaning up test data..."
    python tests/cleanup_test_data.py 2>/dev/null || true

    deactivate
    cd ..

    if [ $BACKEND_EXIT -eq 0 ]; then
        echo -e "${GREEN}✓ Backend E2E tests passed${NC}"
    else
        echo -e "${RED}✗ Backend E2E tests failed${NC}"
    fi

    return $BACKEND_EXIT
}

# Frontend E2E Tests
run_frontend_tests() {
    echo ""
    echo "=========================================="
    echo "Running Frontend E2E Tests"
    echo "=========================================="
    cd frontend/e2e

    # Smart setup - only installs if needed
    setup_frontend_dependencies

    echo ""
    echo "Running Playwright tests on port ${TEST_PORT}..."

    # Export base URL for Playwright to use
    export PLAYWRIGHT_BASE_URL="http://localhost:${TEST_PORT}"

    npm run test:e2e

    FRONTEND_EXIT=$?
    # Generate and serve Allure report (regardless of test pass/fail)
    if [ -d "allure-results" ] && [ "$(ls -A allure-results)" ]; then
        echo ""
        echo -e "${BLUE}📊 Generating Allure Report...${NC}"
        npm run allure:serve > /dev/null 2>&1 &
        ALLURE_PID=$!

        # Wait a moment for server to start
        sleep 2

        echo -e "${GREEN}✓ Allure Report is opening in your browser${NC}"
        echo -e "${YELLOW}ℹ  Report URL: http://localhost:5050${NC}"
        echo -e "${YELLOW}ℹ  Press Ctrl+C to stop the Allure server${NC}"

        # Save Allure PID for cleanup
        echo $ALLURE_PID > ../../allure.pid
    fi

    cd ../..

    if [ $FRONTEND_EXIT -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend E2E tests passed${NC}"
    else
        echo -e "${RED}✗ Frontend E2E tests failed${NC}"
    fi

    return $FRONTEND_EXIT
}

# Main execution
main() {
    # Parse arguments for --port option
    local test_type="all"
    local auto_started_server=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --port)
                TEST_PORT="$2"
                shift 2
                ;;
            --port=*)
                TEST_PORT="${1#*=}"
                shift
                ;;
            backend|frontend|all)
                test_type="$1"
                shift
                ;;
            help|--help|-h)
                echo "Usage: $0 [OPTIONS] [COMMAND]"
                echo ""
                echo "Smart E2E Test Runner - Automatically sets up and runs tests"
                echo ""
                echo "Commands:"
                echo "  backend   - Run only backend E2E tests"
                echo "  frontend  - Run only frontend E2E tests"
                echo "  all       - Run all E2E tests (default)"
                echo "  help      - Show this help message"
                echo ""
                echo "Options:"
                echo "  --port PORT       - Test against server on specific port (default: 8888)"
                echo "  TEST_PORT=PORT    - Environment variable to set port"
                echo ""
                echo "Features:"
                echo "  ✓ Automatic server startup if not running"
                echo "  ✓ Automatic dependency detection and installation"
                echo "  ✓ Automatic server cleanup after tests"
                echo "  ✓ Automatic Allure report generation and opening"
                echo "  ✓ Parallel test execution (4 workers)"
                echo "  ✓ Configurable server port"
                echo "  ✓ Comprehensive test coverage"
                echo ""
                echo "Examples:"
                echo "  # Run all tests (server starts automatically, report opens)"
                echo "  ./run-e2e-tests.sh"
                echo ""
                echo "  # Run tests on port 9000"
                echo "  ./run-e2e-tests.sh --port 9000"
                echo ""
                echo "  # Run only frontend tests"
                echo "  ./run-e2e-tests.sh frontend"
                echo ""
                echo "  # Using environment variable"
                echo "  TEST_PORT=9000 ./run-e2e-tests.sh"
                echo ""
                echo "Note: After tests complete, Allure report will open automatically"
                echo "      in your browser at http://localhost:5050"
                echo "      Press Ctrl+C to stop servers and exit when done."
                echo ""
                exit 0
                ;;
            *)
                echo -e "${RED}Error: Unknown option '$1'${NC}"
                echo ""
                echo "Usage: $0 [OPTIONS] {backend|frontend|all|help}"
                echo "Run '$0 help' for more information"
                exit 1
                ;;
        esac
    done

    # Setup cleanup trap to stop server if we started it
    cleanup() {
        if [ "$auto_started_server" = true ]; then
            stop_server
        fi
    }
    trap cleanup EXIT

    # Check if server is running, start it if not
    if ! check_server; then
        echo ""
        echo -e "${YELLOW}Server will be started automatically...${NC}"
        if start_server; then
            auto_started_server=true
        else
            echo ""
            echo -e "${RED}Failed to start server. Please check logs:${NC}"
            echo "  tail -f server.log"
            exit 1
        fi
    fi

    # Run tests based on command
    case "$test_type" in
        backend)
            run_backend_tests
            exit $?
            ;;
        frontend)
            run_frontend_tests
            FRONTEND_RESULT=$?

            echo ""
            echo "=========================================="
            echo "📊 Allure Report"
            echo "=========================================="

            if [ -f "allure.pid" ]; then
                echo -e "${GREEN}✓ Visual test report is available in your browser${NC}"
                echo -e "${YELLOW}  URL: http://localhost:5050${NC}"
                echo ""
                echo -e "${BLUE}ℹ  Keep this terminal open to view the report${NC}"
                echo -e "${BLUE}ℹ  Press Ctrl+C when done to cleanup${NC}"
                echo ""
                echo "Waiting... (Press Ctrl+C to stop Allure server and exit)"
                wait
            fi

            exit $FRONTEND_RESULT
            ;;
        all)
            run_backend_tests
            BACKEND_RESULT=$?

            run_frontend_tests
            FRONTEND_RESULT=$?

            echo ""
            echo "=========================================="
            echo "Test Results Summary"
            echo "=========================================="

            if [ $BACKEND_RESULT -eq 0 ]; then
                echo -e "Backend:  ${GREEN}✓ PASSED${NC}"
            else
                echo -e "Backend:  ${RED}✗ FAILED${NC}"
            fi

            if [ $FRONTEND_RESULT -eq 0 ]; then
                echo -e "Frontend: ${GREEN}✓ PASSED${NC}"
            else
                echo -e "Frontend: ${RED}✗ FAILED${NC}"
            fi

            echo ""
            echo "=========================================="
            echo "📊 Allure Report"
            echo "=========================================="
            echo -e "${GREEN}✓ Visual test report is available in your browser${NC}"
            echo -e "${YELLOW}  URL: http://localhost:5050${NC}"
            echo ""
            echo -e "${BLUE}ℹ  Keep this terminal open to view the report${NC}"
            echo -e "${BLUE}ℹ  Press Ctrl+C when done to cleanup${NC}"
            echo ""

            if [ $BACKEND_RESULT -eq 0 ] && [ $FRONTEND_RESULT -eq 0 ]; then
                echo -e "${GREEN}All tests passed! 🎉${NC}"

                # Wait for user to press Ctrl+C to keep Allure server running
                echo ""
                echo "Waiting... (Press Ctrl+C to stop Allure server and exit)"
                wait

                exit 0
            else
                echo -e "${RED}Some tests failed - Check Allure report for details${NC}"

                # Wait for user to press Ctrl+C to keep Allure server running
                echo ""
                echo "Waiting... (Press Ctrl+C to stop Allure server and exit)"
                wait

                exit 1
            fi
            ;;
    esac
}

main "$@"
