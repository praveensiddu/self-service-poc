const { test, expect } = require('@playwright/test');

test.describe('Navigation E2E', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/OCP App Provisioning Portal/);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'visible' });
    await page.waitForTimeout(1000);

    // Check for buttons (navigation tabs)
    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should switch between different views', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'visible' });
    await page.waitForTimeout(1000);

    const buttons = await page.locator('button').all();

    // Click through different navigation items
    for (let i = 0; i < Math.min(3, buttons.length); i++) {
      const text = await buttons[i].textContent();
      if (text && !text.includes('Delete') && !text.includes('Remove') && !text.includes('Close')) {
        await buttons[i].click();
        await page.waitForTimeout(800);
      }
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock a failed API request
    await page.route('**/api/clusters', route => {
      route.abort();
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // App should still be visible, even if data fails to load
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(1000);

    await expect(page.locator('#root')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    await expect(page.locator('#root')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    await expect(page.locator('#root')).toBeVisible();
  });
});
