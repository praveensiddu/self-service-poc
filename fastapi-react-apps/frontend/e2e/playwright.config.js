const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // Output folder for test artifacts (screenshots, videos, traces)
  outputDir: './test-results',

  // Enable parallel execution - tests within a file run in parallel
  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Use multiple workers for parallel execution
  // CI: 2 workers (more stable), Local: 4 workers (faster)
  workers: process.env.CI ? 2 : 4,

  // Timeout for each test (30 seconds default)
  timeout: 30000,

  // Global timeout for the entire test run
  globalTimeout: 600000, // 10 minutes

  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['list'],
    ['allure-playwright', {
      outputFolder: './allure-results',
      detail: true,
      suiteTitle: true,
      categories: [
        {
          name: 'Product Defects',
          matchedStatuses: ['failed']
        },
        {
          name: 'Test Defects',
          matchedStatuses: ['broken']
        },
        {
          name: 'Timeout Issues',
          messageRegex: '.*TimeoutError.*'
        }
      ],
      environmentInfo: {
        'Test Environment': 'Local Development',
        'Browser': 'Chromium',
        'Test Type': 'E2E',
        'Parallel Workers': '4'
      }
    }]
  ],

  use: {
    // Use environment variable if set, otherwise default to 8888
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8888',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Add action timeout
    actionTimeout: 10000,

    // Add navigation timeout
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Expects server to be running
  // If you want playwright to start the server, uncomment below:
  // webServer: {
  //   command: 'cd .. && uvicorn backend.main:app --reload',
  //   port: 8000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
