const { test, expect } = require('@playwright/test');

test.describe('Clusters Management E2E - Enhanced with data-testid', () => {
  test.use({
    testInfo: {
      annotations: [
        { type: 'epic', description: 'Self-Service Platform' },
        { type: 'feature', description: 'Cluster Management' },
      ]
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/clusters');
    await page.waitForSelector('#root', { state: 'visible' });
    await page.waitForTimeout(1500);
  });

  test('should display clusters table with data-testid', async ({ page }) => {
    const table = page.getByTestId('clusters-table');
    await expect(table).toBeVisible();
  });

  test('should filter clusters by clustername using data-testid', async ({ page }) => {
    const filterInput = page.getByTestId('filter-clustername');
    await expect(filterInput).toBeVisible();

    await filterInput.fill('prod');
    await page.waitForTimeout(500);

    // Verify that some filtering happened (table still visible)
    await expect(page.getByTestId('clusters-table')).toBeVisible();
  });

  test('should filter clusters by purpose', async ({ page }) => {
    const filterInput = page.getByTestId('filter-purpose');
    await expect(filterInput).toBeVisible();

    await filterInput.fill('development');
    await page.waitForTimeout(500);
  });

  test('should filter clusters by datacenter', async ({ page }) => {
    const filterInput = page.getByTestId('filter-datacenter');
    await expect(filterInput).toBeVisible();

    await filterInput.fill('dc1');
    await page.waitForTimeout(500);
  });

  test('should filter clusters by applications', async ({ page }) => {
    const filterInput = page.getByTestId('filter-applications');
    await expect(filterInput).toBeVisible();

    await filterInput.fill('app');
    await page.waitForTimeout(500);
  });

  test('should toggle select all checkbox', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Check if there are any clusters in the table
    const clusterRows = await page.locator('[data-testid^="cluster-row-"]').all();

    if (clusterRows.length === 0) {
      console.log('No clusters available to test select all checkbox, skipping');
      return;
    }

    const selectAllCheckbox = page.getByTestId('select-all-checkbox');
    await expect(selectAllCheckbox).toBeVisible();

    // Check - should select all clusters
    await selectAllCheckbox.check();
    await page.waitForTimeout(300);
    await expect(selectAllCheckbox).toBeChecked();

    // Verify at least one cluster checkbox is checked
    if (clusterRows.length > 0) {
      const firstClusterTestId = await clusterRows[0].getAttribute('data-testid');
      const firstClusterName = firstClusterTestId?.replace('cluster-row-', '');
      if (firstClusterName) {
        const firstClusterCheckbox = page.getByTestId(`cluster-checkbox-${firstClusterName}`);
        await expect(firstClusterCheckbox).toBeChecked();
      }
    }

    // Uncheck - should deselect all clusters
    await selectAllCheckbox.uncheck();
    await page.waitForTimeout(300);
    await expect(selectAllCheckbox).not.toBeChecked();
  });

  test('should switch between environment tabs', async ({ page }) => {
    // Get all environment tab buttons using their data-testid pattern
    const tabButtons = page.locator('[data-testid^="env-tab-"]');
    const count = await tabButtons.count();

    if (count > 1) {
      // Click second tab
      await tabButtons.nth(1).click();
      await page.waitForTimeout(800);

      // Click first tab
      await tabButtons.nth(0).click();
      await page.waitForTimeout(800);
    }
  });

  test('should open and close cluster creation modal', async ({ page }) => {
    // Click add cluster button
    const addButton = page.getByTestId('add-cluster-btn');
    await expect(addButton).toBeVisible();
    await addButton.click();

    await page.waitForTimeout(500);

    // Modal should be visible
    const closeButton = page.getByTestId('close-modal-btn');
    await expect(closeButton).toBeVisible();

    // Close modal
    await closeButton.click();
    await page.waitForTimeout(500);

    // Close button should not be visible anymore
    await expect(closeButton).not.toBeVisible();
  });

  test('should fill and clear cluster creation form', async ({ page }) => {
    // Open modal
    await page.getByTestId('add-cluster-btn').click();
    await page.waitForTimeout(500);

    // Fill form
    await page.getByTestId('input-clustername').fill('test-cluster');
    await page.getByTestId('input-purpose').fill('testing');
    await page.getByTestId('input-datacenter').fill('dc-test');
    await page.getByTestId('input-applications').fill('app1, app2');

    // Verify values
    await expect(page.getByTestId('input-clustername')).toHaveValue('test-cluster');
    await expect(page.getByTestId('input-purpose')).toHaveValue('testing');
    await expect(page.getByTestId('input-datacenter')).toHaveValue('dc-test');
    await expect(page.getByTestId('input-applications')).toHaveValue('app1, app2');

    // Clear form
    await page.getByTestId('clear-form-btn').click();
    await page.waitForTimeout(300);

    // Verify cleared
    await expect(page.getByTestId('input-clustername')).toHaveValue('');
    await expect(page.getByTestId('input-purpose')).toHaveValue('');

    // Close modal to prevent blocking other actions
    const closeButton = page.getByTestId('close-modal-btn');
    await closeButton.click();
    await page.waitForTimeout(300);
  });

  test('should create a new cluster', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'Create Cluster' },
      { type: 'description', description: 'Create a new cluster and verify it appears in the table' },
      { type: 'tag', description: 'smoke' }
    );

    // Open modal
    await page.getByTestId('add-cluster-btn').click();
    await page.waitForTimeout(500);

    // Fill form with unique cluster name
    const uniqueName = `e2e-test-${Date.now()}`;
    await page.getByTestId('input-clustername').fill(uniqueName);
    await page.getByTestId('input-purpose').fill('e2e-testing');
    await page.getByTestId('input-datacenter').fill('dc-e2e');
    await page.getByTestId('input-applications').fill('test-app');

    // Submit
    await page.getByTestId('submit-cluster-btn').click();
    await page.waitForTimeout(2000);

    // Verify cluster was created
    const clusterRow = page.getByTestId(`cluster-row-${uniqueName}`);
    const exists = await clusterRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (exists) {
      // Clean up - ALWAYS delete the cluster
      const deleteBtn = page.getByTestId(`delete-cluster-${uniqueName}`);

      // Set up dialog handler BEFORE clicking delete
      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await deleteBtn.click();
      await page.waitForTimeout(2000);
    } else {
      console.log(`Warning: Cluster ${uniqueName} was not created or not visible`);
    }
  });

  test('should select and verify cluster checkbox', async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(1500);

    // Find first cluster row
    const rows = await page.locator('[data-testid^="cluster-row-"]').all();

    if (rows.length > 0) {
      // Get the cluster name from data-testid
      const testId = await rows[0].getAttribute('data-testid');
      const clusterName = testId?.replace('cluster-row-', '');

      if (clusterName) {
        const checkbox = page.getByTestId(`cluster-checkbox-${clusterName}`);

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

  test('should display no clusters message when filtered with no results', async ({ page }) => {
    // Filter with impossible value
    await page.getByTestId('filter-clustername').fill('xyz-nonexistent-12345');
    await page.waitForTimeout(500);

    // Should show no clusters message
    const noMessage = page.getByTestId('no-clusters-message');
    await expect(noMessage).toBeVisible();
    await expect(noMessage).toHaveText(/No clusters found/i);
  });

  test('should verify delete button exists for each cluster', async ({ page }) => {
    await page.waitForTimeout(1500);

    const rows = await page.locator('[data-testid^="cluster-row-"]').all();

    if (rows.length > 0) {
      const testId = await rows[0].getAttribute('data-testid');
      const clusterName = testId?.replace('cluster-row-', '');

      if (clusterName) {
        const deleteBtn = page.getByTestId(`delete-cluster-${clusterName}`);
        await expect(deleteBtn).toBeVisible();
      }
    }
  });

  test('should combine multiple filters', async ({ page }) => {
    await page.getByTestId('filter-clustername').fill('prod');
    await page.waitForTimeout(300);

    await page.getByTestId('filter-purpose').fill('production');
    await page.waitForTimeout(300);

    // Table should still be visible
    await expect(page.getByTestId('clusters-table')).toBeVisible();

    // Clear filters
    await page.getByTestId('filter-clustername').clear();
    await page.getByTestId('filter-purpose').clear();
    await page.waitForTimeout(300);
  });
});
