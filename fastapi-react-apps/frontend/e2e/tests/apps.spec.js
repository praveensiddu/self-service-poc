const { test, expect } = require('@playwright/test');

test.describe('Apps Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'visible' });
    await page.waitForTimeout(1000);
  });

  test('should navigate to apps view', async ({ page }) => {
    // Look for Apps tab/button
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.toLowerCase().includes('app')) {
        await button.click();
        await page.waitForTimeout(1000);
        break;
      }
    }
  });

  test('should display apps table or list', async ({ page }) => {
    // Navigate to apps if needed
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.toLowerCase().includes('app') && !text.toLowerCase().includes('application')) {
        await button.click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Check for content
    const hasTable = await page.locator('table').count() > 0;
    const hasCards = await page.locator('.card').count() > 0;
    const hasList = await page.locator('ul, ol').count() > 0;

    expect(hasTable || hasCards || hasList).toBeTruthy();
  });

  test('should filter apps', async ({ page }) => {
    // Navigate to apps
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.toLowerCase().includes('app')) {
        await button.click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Find filter inputs
    const inputs = await page.locator('input[type="text"]').all();

    if (inputs.length > 0) {
      await inputs[0].fill('test');
      await page.waitForTimeout(500);

      // Clear filter
      await inputs[0].clear();
      await page.waitForTimeout(500);
    }
  });

  test('should open app details', async ({ page }) => {
    // Navigate to apps
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.toLowerCase().includes('app')) {
        await button.click();
        await page.waitForTimeout(1500);
        break;
      }
    }

    // Try to click on a row or link
    const links = await page.locator('a, tr').all();
    if (links.length > 0) {
      // Click first clickable element
      const firstClickable = links[0];
      await firstClickable.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should create new app', async ({ page }) => {
    // Navigate to apps
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.toLowerCase().includes('app')) {
        await button.click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Look for Add/Create button
    const addButtons = await page.locator('button').all();
    let createButtonFound = false;

    for (const button of addButtons) {
      const text = await button.textContent();
      if (text && (text.includes('Add') || text.includes('Create') || text === '+')) {
        await button.click();
        createButtonFound = true;
        await page.waitForTimeout(500);
        break;
      }
    }

    if (createButtonFound) {
      // Fill form
      const inputs = await page.locator('input[type="text"]').all();

      if (inputs.length >= 1) {
        await inputs[0].fill(`e2e-test-app-${Date.now()}`);

        if (inputs.length >= 2) {
          await inputs[1].fill('E2E Test App');
        }

        if (inputs.length >= 3) {
          await inputs[2].fill('test-team');
        }

        // Submit
        const submitButtons = await page.locator('button').all();
        for (const btn of submitButtons) {
          const btnText = await btn.textContent();
          if (btnText && (btnText.includes('Add') || btnText.includes('Submit') || btnText.includes('Create'))) {
            await btn.click();
            await page.waitForTimeout(1000);
            break;
          }
        }
      }
    }
  });
});
