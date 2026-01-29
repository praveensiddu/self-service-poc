# Frontend E2E Tests

## Overview
End-to-end tests for the React frontend using Playwright for browser automation.

## Requirements
- Node.js 16+
- Playwright with Chromium

## Installation
```bash
cd frontend
npm install
npx playwright install chromium
```

## Running Tests
```bash
# From frontend directory
npm run test:e2e                # Run all tests
npm run test:e2e:ui             # Interactive UI mode
npm run test:e2e:headed         # Watch browser
npm run test:e2e:debug          # Debug mode

# Run specific test file
npx playwright test e2e/tests/clusters-enhanced.spec.js

# Run specific test
npx playwright test e2e/tests/clusters-enhanced.spec.js -g "should filter"
```

## Test Files
- `clusters.spec.js` - Basic cluster table tests
- `clusters-enhanced.spec.js` - Enhanced tests with data-testid selectors
- `apps.spec.js` - Apps management tests
- `navigation.spec.js` - Navigation and responsive design tests

## Configuration Files
- `playwright.config.js` - Playwright configuration (in this e2e directory)
- `package.json` - Test dependencies and scripts (in this e2e directory)
- `.gitignore` - Ignore test artifacts (test-results, playwright-report)

## Test Coverage
- ✅ Page load and initialization
- ✅ Clusters table display
- ✅ Filter by clustername, purpose, datacenter, applications
- ✅ Select/deselect all and individual clusters
- ✅ Environment tab switching
- ✅ Cluster creation modal (open, fill, submit, close)
- ✅ Delete clusters
- ✅ Apps navigation and management
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Error handling

## Prerequisites
- Backend server must be running on http://localhost:8000
- Start server from parent directory: `./start.sh`

## Test Reports
- HTML report: `playwright-report/index.html`
- View report: `npx playwright show-report`
- Screenshots: `test-results/` (on failure)
- Videos: `test-results/` (on failure)

## Configuration
- Config file: `playwright.config.js`
- Base URL: http://localhost:8888
- Browser: Chromium (default)
- Retries: 2 (in CI), 0 (local)

## Notes
- Tests use data-testid selectors for stability
- Tests are flexible and handle missing features gracefully
- All tests wait for elements properly before interaction
