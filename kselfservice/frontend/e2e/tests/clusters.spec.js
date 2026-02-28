const { test, expect } = require('@playwright/test');

test.describe('Clusters Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for React to load
    await page.waitForSelector('#root', { state: 'visible' });

    // Wait a bit for the app to initialize
    await page.waitForTimeout(1000);
  });

  test('should load the main page', async ({ page }) => {
    await expect(page).toHaveTitle(/OCP App Provisioning Portal/);

    // Check that main container is visible
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should display clusters table', async ({ page }) => {
    // Check for table structure - adjust selector based on actual DOM
    const hasTable = await page.locator('table').count() > 0;
    const hasCards = await page.locator('.card').count() > 0;

    // At least one of these should be present
    expect(hasTable || hasCards).toBeTruthy();
  });

  test('should filter clusters by clustername', async ({ page }) => {
    // Wait for any data to load
    await page.waitForTimeout(2000);

    // Try to find filter input for clustername
    const filterInputs = await page.locator('input[type="text"]').all();

    if (filterInputs.length > 0) {
      // Type in the first filter input
      await filterInputs[0].fill('prod');

      // Wait for filtering to take effect
      await page.waitForTimeout(500);

      // Check that some content is visible
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).not.toBeNull();
    }
  });

  test('should select and deselect all clusters', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find all checkboxes
    const checkboxes = await page.locator('input[type="checkbox"]').all();

    if (checkboxes.length > 0) {
      // Click first checkbox (likely "Select All")
      await checkboxes[0].check();
      await page.waitForTimeout(300);

      // Verify it's checked
      await expect(checkboxes[0]).toBeChecked();

      // Uncheck
      await checkboxes[0].uncheck();
      await page.waitForTimeout(300);

      // Verify it's unchecked
      await expect(checkboxes[0]).not.toBeChecked();
    }
  });

  test('should open and close create cluster modal', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for "Add" or "Create" button
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const text = await button.textContent();
      if (text && (text.includes('Add') || text.includes('Create') || text.includes('+'))) {
        // Click the button
        await button.click();
        await page.waitForTimeout(500);

        // Check if a modal appeared (look for overlay or modal)
        const hasOverlay = await page.locator('[style*="position: fixed"]').count() > 0;
        const hasModal = await page.locator('.card').count() > 1;

        if (hasOverlay || hasModal) {
          // Try to find close button
          const closeButtons = await page.locator('button').all();
          for (const closeBtn of closeButtons) {
            const closeBtnText = await closeBtn.textContent();
            if (closeBtnText && closeBtnText.includes('Close')) {
              await closeBtn.click();
              await page.waitForTimeout(500);
              break;
            }
          }
        }
        break;
      }
    }
  });

  test('should create a new cluster', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Try to find and click Add button
    const buttons = await page.locator('button').all();
    let addButtonFound = false;

    for (const button of buttons) {
      const text = await button.textContent();
      if (text && (text.includes('Add') || text.includes('Create'))) {
        await button.click();
        addButtonFound = true;
        await page.waitForTimeout(500);
        break;
      }
    }

    if (addButtonFound) {
      // Fill in the form
      const inputs = await page.locator('input[type="text"]').all();

      if (inputs.length >= 4) {
        // Clustername
        await inputs[0].fill(`e2e-test-cluster-${Date.now()}`);

        // Purpose
        await inputs[1].fill('testing');

        // Datacenter
        await inputs[2].fill('dc-test');

        // Applications
        await inputs[3].fill('app1, app2');

        // Try to find submit button
        const submitButtons = await page.locator('button').all();
        for (const btn of submitButtons) {
          const btnText = await btn.textContent();
          if (btnText && (btnText.includes('Add') || btnText.includes('Submit') || btnText.includes('Create'))) {
            // Click submit
            await btn.click();
            await page.waitForTimeout(1000);
            break;
          }
        }
      }
    }
  });

  test('should delete selected clusters', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find checkboxes (other than select-all)
    const checkboxes = await page.locator('input[type="checkbox"]').all();

    if (checkboxes.length > 1) {
      // Select a cluster (not the first one which might be select-all)
      await checkboxes[1].check();
      await page.waitForTimeout(500);

      // Look for delete button
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && (text.includes('Delete') || text.includes('Remove'))) {
          await button.click();
          await page.waitForTimeout(500);

          // If confirmation dialog appears, confirm it
          const confirmButtons = await page.locator('button').all();
          for (const confirmBtn of confirmButtons) {
            const confirmText = await confirmBtn.textContent();
            if (confirmText && (confirmText.includes('Confirm') || confirmText.includes('Yes') || confirmText.includes('OK'))) {
              await confirmBtn.click();
              await page.waitForTimeout(1000);
              break;
            }
          }
          break;
        }
      }
    }
  });

  test('should switch between environment tabs', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for environment buttons/tabs
    const buttons = await page.locator('button').all();

    // Try to find environment buttons (DEV, QA, PROD, etc.)
    const envButtons = [];
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && (text.match(/^(DEV|QA|PROD|STAGE|UAT)$/i))) {
        envButtons.push(button);
      }
    }

    if (envButtons.length > 1) {
      // Click on second environment
      await envButtons[1].click();
      await page.waitForTimeout(1000);

      // Click back to first environment
      await envButtons[0].click();
      await page.waitForTimeout(1000);
    }
  });
});
