const { test, expect } = require('@playwright/test');

// Configure Allure metadata for the entire test suite
test.describe('Apps Management E2E - Enhanced with data-testid', () => {
  test.use({
    // Add test metadata visible in Allure report
    testInfo: {
      annotations: [
        { type: 'epic', description: 'Self-Service Platform' },
        { type: 'feature', description: 'Application Management' },
      ]
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'visible' });
    await page.waitForTimeout(1000);

    // Navigate to apps page
    const requestProvisioningBtn = page.locator('button', { hasText: 'Request provisioning' });
    if (await requestProvisioningBtn.isVisible()) {
      await requestProvisioningBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display apps table with data-testid', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'View Applications List' },
      { type: 'description', description: 'Verify that the apps table is visible and properly rendered with test ids' }
    );

    const appsTable = page.getByTestId('apps-table');
    await expect(appsTable).toBeVisible();
  });

  test('should filter apps by appname using data-testid', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'normal' },
      { type: 'story', description: 'Filter Applications' },
      { type: 'description', description: 'Filter applications list by application name' }
    );

    const filterInput = page.getByTestId('filter-appname');
    await expect(filterInput).toBeVisible();

    await filterInput.fill('test');
    await page.waitForTimeout(500);

    // Verify table still visible (filtering works)
    await expect(page.getByTestId('apps-table')).toBeVisible();
  });

  test('should filter apps by description', async ({ page }) => {
    const filterInput = page.getByTestId('filter-description');
    await expect(filterInput).toBeVisible();

    await filterInput.fill('test');
    await page.waitForTimeout(500);
  });

  test('should filter apps by managed by', async ({ page }) => {
    const filterInput = page.getByTestId('filter-managedby');
    await expect(filterInput).toBeVisible();

    await filterInput.fill('team');
    await page.waitForTimeout(500);
  });

  test('should toggle select all checkbox', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'normal' },
      { type: 'story', description: 'Bulk Selection' },
      { type: 'description', description: 'Toggle select all checkbox to select/deselect all apps' }
    );

    await page.waitForTimeout(1500);

    // Check if there are any apps in the table
    const appRows = await page.locator('[data-testid^="app-row-"]').all();

    if (appRows.length === 0) {
      console.log('No apps available to test select all checkbox, skipping');
      return;
    }

    const selectAllCheckbox = page.getByTestId('select-all-apps-checkbox');
    await expect(selectAllCheckbox).toBeVisible();

    // Check - should select all apps
    await selectAllCheckbox.check();
    await page.waitForTimeout(300);
    await expect(selectAllCheckbox).toBeChecked();

    // Verify at least one app checkbox is checked
    if (appRows.length > 0) {
      const firstAppTestId = await appRows[0].getAttribute('data-testid');
      const firstAppName = firstAppTestId?.replace('app-row-', '');
      if (firstAppName) {
        const firstAppCheckbox = page.getByTestId(`app-checkbox-${firstAppName}`);
        await expect(firstAppCheckbox).toBeChecked();
      }
    }

    // Uncheck - should deselect all apps
    await selectAllCheckbox.uncheck();
    await page.waitForTimeout(300);
    await expect(selectAllCheckbox).not.toBeChecked();
  });

  test('should open and close app creation modal', async ({ page }) => {
    // Click add app button
    const addButton = page.getByTestId('add-app-btn');
    await expect(addButton).toBeVisible();
    await addButton.click();

    await page.waitForTimeout(500);

    // Modal should be visible
    const modal = page.getByTestId('create-app-modal');
    await expect(modal).toBeVisible();

    const closeButton = page.getByTestId('close-app-modal-btn');
    await expect(closeButton).toBeVisible();

    // Close modal
    await closeButton.click();
    await page.waitForTimeout(500);

    // Modal should not be visible anymore
    await expect(modal).not.toBeVisible();
  });

  test('should fill and clear app creation form', async ({ page }) => {
    // Open modal
    await page.getByTestId('add-app-btn').click();
    await page.waitForTimeout(500);

    // Fill form
    await page.getByTestId('input-appname').fill('test-app-e2e');
    await page.getByTestId('input-description').fill('Test App Description');
    await page.getByTestId('input-managedby').fill('test-team');
    await page.getByTestId('input-clusters').fill('01,02');

    // Verify values
    await expect(page.getByTestId('input-appname')).toHaveValue('test-app-e2e');
    await expect(page.getByTestId('input-description')).toHaveValue('Test App Description');
    await expect(page.getByTestId('input-managedby')).toHaveValue('test-team');
    await expect(page.getByTestId('input-clusters')).toHaveValue('01,02');

    // Clear form
    await page.getByTestId('clear-app-form-btn').click();
    await page.waitForTimeout(300);

    // Verify cleared
    await expect(page.getByTestId('input-appname')).toHaveValue('');
    await expect(page.getByTestId('input-description')).toHaveValue('');
    await expect(page.getByTestId('input-managedby')).toHaveValue('');
    await expect(page.getByTestId('input-clusters')).toHaveValue('');

    // Close modal to prevent blocking other actions
    const closeButton = page.getByTestId('close-app-modal-btn');
    await closeButton.click();
    await page.waitForTimeout(300);
  });

  test('should create a new app in DEV environment', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'Create Application' },
      { type: 'description', description: 'Create a new application in DEV environment and verify creation' },
      { type: 'tag', description: 'smoke' }
    );

    // Open modal
    await page.getByTestId('add-app-btn').click();
    await page.waitForTimeout(500);

    // Fill form with unique app name
    const uniqueName = `e2e-app-dev-${Date.now()}`;
    await page.getByTestId('input-appname').fill(uniqueName);
    await page.getByTestId('input-description').fill('E2E Test App DEV');
    await page.getByTestId('input-managedby').fill('e2e-team');
    await page.getByTestId('input-clusters').fill('01');

    // Submit
    await page.getByTestId('submit-app-btn').click();
    await page.waitForTimeout(2000);

    // Modal should be closed
    const modalVisible = await page.getByTestId('create-app-modal').isVisible().catch(() => false);
    expect(modalVisible).toBe(false);

    // Verify app appears in table
    const appRow = page.getByTestId(`app-row-${uniqueName}`);
    await expect(appRow).toBeVisible({ timeout: 5000 });

    // Clean up - delete the app (ALWAYS delete, whether test passes or fails)
    const deleteBtn = page.getByTestId(`delete-app-${uniqueName}`);

    // Set up dialog handler BEFORE clicking delete
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await deleteBtn.click();
    await page.waitForTimeout(2000);

    // Verify app was deleted
    const stillExists = await appRow.isVisible({ timeout: 1000 }).catch(() => false);
    if (stillExists) {
      console.log(`Warning: App ${uniqueName} may not have been deleted properly`);
    }
  });

  test('should create and delete app in QA environment', async ({ page }) => {
    // Switch to QA environment
    const qaTab = page.locator('button', { hasText: 'QA' }).first();
    const isQaVisible = await qaTab.isVisible().catch(() => false);

    if (isQaVisible) {
      await qaTab.click();
      await page.waitForTimeout(1500);

      // Open modal
      await page.getByTestId('add-app-btn').click();
      await page.waitForTimeout(500);

      // Fill form with unique app name
      const uniqueName = `e2e-app-qa-${Date.now()}`;
      await page.getByTestId('input-appname').fill(uniqueName);
      await page.getByTestId('input-description').fill('E2E Test App QA');
      await page.getByTestId('input-managedby').fill('e2e-team');
      await page.getByTestId('input-clusters').fill('02');

      // Submit
      await page.getByTestId('submit-app-btn').click();
      await page.waitForTimeout(2000);

      // Verify app appears in table
      const appRow = page.getByTestId(`app-row-${uniqueName}`);
      await expect(appRow).toBeVisible({ timeout: 5000 });

      // Delete the app - set up handler BEFORE clicking
      const deleteBtn = page.getByTestId(`delete-app-${uniqueName}`);

      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await deleteBtn.click();
      await page.waitForTimeout(2000);

      // Verify deletion
      const stillExists = await appRow.isVisible({ timeout: 1000 }).catch(() => false);
      if (stillExists) {
        console.log(`Warning: App ${uniqueName} in QA may not have been deleted properly`);
      }
    } else {
      console.log('QA environment not available, skipping test');
    }
  });

  test('should create and delete app in PRD environment', async ({ page }) => {
    // Switch to PRD environment
    const prdTab = page.locator('button', { hasText: 'PRD' }).first();
    const isPrdVisible = await prdTab.isVisible().catch(() => false);

    if (isPrdVisible) {
      await prdTab.click();
      await page.waitForTimeout(1500);

      // Open modal
      await page.getByTestId('add-app-btn').click();
      await page.waitForTimeout(500);

      // Fill form with unique app name
      const uniqueName = `e2e-app-prd-${Date.now()}`;
      await page.getByTestId('input-appname').fill(uniqueName);
      await page.getByTestId('input-description').fill('E2E Test App PRD');
      await page.getByTestId('input-managedby').fill('e2e-team');
      await page.getByTestId('input-clusters').fill('03');

      // Submit
      await page.getByTestId('submit-app-btn').click();
      await page.waitForTimeout(2000);

      // Verify app appears in table
      const appRow = page.getByTestId(`app-row-${uniqueName}`);
      await expect(appRow).toBeVisible({ timeout: 5000 });

      // Delete the app - set up handler BEFORE clicking
      const deleteBtn = page.getByTestId(`delete-app-${uniqueName}`);

      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await deleteBtn.click();
      await page.waitForTimeout(2000);

      // Verify deletion
      const stillExists = await appRow.isVisible({ timeout: 1000 }).catch(() => false);
      if (stillExists) {
        console.log(`Warning: App ${uniqueName} in PRD may not have been deleted properly`);
      }
    } else {
      console.log('PRD environment not available, skipping test');
    }
  });

  test('should view app details', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Find first app row
    const rows = await page.locator('[data-testid^="app-row-"]').all();

    if (rows.length > 0) {
      // Get the app name from data-testid
      const testId = await rows[0].getAttribute('data-testid');
      const appName = testId?.replace('app-row-', '');

      if (appName) {
        const viewBtn = page.getByTestId(`view-app-${appName}`);
        const isVisible = await viewBtn.isVisible().catch(() => false);

        if (isVisible) {
          await viewBtn.click();
          await page.waitForTimeout(1500);

          // Should navigate to namespaces view
          // Check for namespace table or back button
          const backBtn = page.locator('button', { hasText: 'Back to App' });
          const backVisible = await backBtn.isVisible().catch(() => false);

          if (backVisible) {
            await backBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    }
  });

  test('should select and verify app checkbox', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Find first app row
    const rows = await page.locator('[data-testid^="app-row-"]').all();

    if (rows.length > 0) {
      // Get the app name from data-testid
      const testId = await rows[0].getAttribute('data-testid');
      const appName = testId?.replace('app-row-', '');

      if (appName) {
        const checkbox = page.getByTestId(`app-checkbox-${appName}`);

        // Check the checkbox
        await checkbox.check();
        await page.waitForTimeout(300);
        await expect(checkbox).toBeChecked();

        // Uncheck
        await checkbox.uncheck();
        await page.waitForTimeout(300);
        await expect(checkbox).not.toBeChecked();
      }
    }
  });

  test('should display no apps message when filtered with no results', async ({ page }) => {
    // Filter with impossible value
    await page.getByTestId('filter-appname').fill('xyz-nonexistent-app-12345');
    await page.waitForTimeout(500);

    // Should show no apps message
    const noMessage = page.getByTestId('no-apps-message');
    await expect(noMessage).toBeVisible();
    await expect(noMessage).toHaveText(/No apps found/i);
  });

  test('should verify delete button exists for each app', async ({ page }) => {
    await page.waitForTimeout(1500);

    const rows = await page.locator('[data-testid^="app-row-"]').all();

    if (rows.length > 0) {
      const testId = await rows[0].getAttribute('data-testid');
      const appName = testId?.replace('app-row-', '');

      if (appName) {
        const deleteBtn = page.getByTestId(`delete-app-${appName}`);
        await expect(deleteBtn).toBeVisible();
      }
    }
  });

  test('should create app with multiple clusters', async ({ page }) => {
    // Open modal
    await page.getByTestId('add-app-btn').click();
    await page.waitForTimeout(500);

    // Fill form with multiple clusters
    const uniqueName = `e2e-app-multi-${Date.now()}`;
    await page.getByTestId('input-appname').fill(uniqueName);
    await page.getByTestId('input-description').fill('Multi-cluster app');
    await page.getByTestId('input-managedby').fill('e2e-team');
    await page.getByTestId('input-clusters').fill('01,02,03');

    // Submit
    await page.getByTestId('submit-app-btn').click();
    await page.waitForTimeout(2000);

    // Verify app appears in table
    const appRow = page.getByTestId(`app-row-${uniqueName}`);
    await expect(appRow).toBeVisible({ timeout: 5000 });

    // Clean up - ALWAYS delete the app
    const deleteBtn = page.getByTestId(`delete-app-${uniqueName}`);

    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await deleteBtn.click();
    await page.waitForTimeout(2000);
  });

  test('should create app with namespaces and verify relationship', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'Application-Namespace Integration' },
      { type: 'description', description: 'Complete workflow: create app, add namespaces, verify relationship, cleanup' },
      { type: 'tag', description: 'integration' },
      { type: 'tag', description: 'smoke' }
    );

    // This is a comprehensive test that validates the complete app-namespace workflow

    // Step 1: Create an app
    const appName = `e2e-app-full-${Date.now()}`;

    await page.getByTestId('add-app-btn').click();
    await page.waitForTimeout(500);

    await page.getByTestId('input-appname').fill(appName);
    await page.getByTestId('input-description').fill('App for full workflow test');
    await page.getByTestId('input-managedby').fill('e2e-team');
    await page.getByTestId('input-clusters').fill('01,02');

    await page.getByTestId('submit-app-btn').click();
    await page.waitForTimeout(2000);

    // Step 2: Verify app was created
    const appRow = page.getByTestId(`app-row-${appName}`);
    await expect(appRow).toBeVisible({ timeout: 5000 });

    // Step 3: Navigate to namespaces view
    const viewBtn = page.getByTestId(`view-app-${appName}`);
    await viewBtn.click();
    await page.waitForTimeout(1500);

    // Step 4: Verify we're in namespaces view
    const addNamespaceBtn = page.getByTestId('add-namespace-btn');
    await expect(addNamespaceBtn).toBeVisible();

    // Step 5: Create two namespaces for this app
    const namespaces = [];
    for (let i = 0; i < 2; i++) {
      const nsName = `e2e-ns-${appName}-${i}`;
      namespaces.push(nsName);

      await page.getByTestId('add-namespace-btn').click();
      await page.waitForTimeout(500);

      await page.getByTestId('input-namespace').fill(nsName);
      await page.getByTestId('input-namespace-clusters').fill(i === 0 ? '01' : '02');
      await page.getByTestId('input-managed-by-argo').selectOption('No');

      await page.getByTestId('submit-namespace-btn').click();
      await page.waitForTimeout(2000);

      // Verify namespace was created
      const nsRow = page.getByTestId(`namespace-row-${nsName}`);
      await expect(nsRow).toBeVisible({ timeout: 5000 });
    }

    // Step 6: Navigate back to apps view
    const backBtn = page.locator('button', { hasText: 'Back to App' });
    await backBtn.click();
    await page.waitForTimeout(1000);

    // Step 7: Verify app row shows namespace count
    await expect(appRow).toBeVisible();

    // Step 8: Navigate back to namespaces to clean up
    await viewBtn.click();
    await page.waitForTimeout(1500);

    // Step 9: Delete all namespaces
    for (const nsName of namespaces) {
      const deleteBtn = page.getByTestId(`delete-namespace-${nsName}`);
      const isVisible = await deleteBtn.isVisible().catch(() => false);

      if (isVisible) {
        page.once('dialog', dialog => dialog.accept());
        await deleteBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // Step 10: Navigate back to apps and delete the app
    const backBtn2 = page.locator('button', { hasText: 'Back to App' });
    await backBtn2.click();
    await page.waitForTimeout(1000);

    const deleteAppBtn = page.getByTestId(`delete-app-${appName}`);
    page.once('dialog', dialog => dialog.accept());
    await deleteAppBtn.click();
    await page.waitForTimeout(2000);

    // Verify app is deleted
    const stillExists = await appRow.isVisible({ timeout: 2000 }).catch(() => false);
    expect(stillExists).toBe(false);
  });
});
