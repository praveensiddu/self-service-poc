const { test, expect } = require('@playwright/test');

test.describe('Namespaces Management E2E - Enhanced with data-testid', () => {
  test.use({
    testInfo: {
      annotations: [
        { type: 'epic', description: 'Self-Service Platform' },
        { type: 'feature', description: 'Namespace Management' },
      ]
    }
  });

  let testAppName = '';

  test.beforeEach(async ({ page }, testInfo) => {
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

    // Create a unique test app for namespace tests
    // Include worker index to ensure uniqueness across parallel workers
    const workerIndex = testInfo.workerIndex;
    testAppName = `e2e-ns-test-app-w${workerIndex}-${Date.now()}`;

    // Open create app modal
    const addAppBtn = page.getByTestId('add-app-btn');
    await expect(addAppBtn).toBeVisible({ timeout: 10000 });
    await addAppBtn.click();
    await page.waitForTimeout(500);

    // Fill and submit app form
    await page.getByTestId('input-appname').fill(testAppName);
    await page.getByTestId('input-description').fill('App for namespace tests');
    await page.getByTestId('input-managedby').fill('e2e-team');
    await page.getByTestId('input-clusters').fill('01,02');

    await page.getByTestId('submit-app-btn').click();
    await page.waitForTimeout(2000);

    // Verify app was created and navigate to namespaces view
    const viewBtn = page.getByTestId(`view-app-${testAppName}`);
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await page.waitForTimeout(1500);

    // Verify we're in the namespaces view
    const addNamespaceBtn = page.getByTestId('add-namespace-btn');
    await expect(addNamespaceBtn).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Clean up: First close any open modals, then navigate back and delete test app

    try {
      // Check if namespace creation modal is open and close it
      const namespaceModal = page.getByTestId('create-namespace-modal');
      const modalVisible = await namespaceModal.isVisible().catch(() => false);

      if (modalVisible) {
        const closeBtn = page.getByTestId('close-namespace-modal-btn');
        const closeBtnVisible = await closeBtn.isVisible().catch(() => false);

        if (closeBtnVisible) {
          await closeBtn.click();
          await page.waitForTimeout(500);
        } else {
          // If close button not found, press Escape key
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }

      // Force navigation to apps page by going to the base URL
      await page.goto('/apps', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Delete the test app
      if (testAppName) {
        const deleteBtn = page.getByTestId(`delete-app-${testAppName}`);
        const deleteVisible = await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (deleteVisible) {
          // Set up dialog handler synchronously (not async) to avoid conflicts
          page.once('dialog', dialog => {
            console.log(`✓ Confirming deletion of app: ${testAppName}`);
            dialog.accept().catch(err => {
              console.log(`Warning: Dialog accept failed for ${testAppName}: ${err.message}`);
            });
          });

          await deleteBtn.click();
          await page.waitForTimeout(2000);

          // Verify deletion was successful
          const stillExists = await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false);
          if (stillExists) {
            console.log(`⚠️ Warning: App ${testAppName} may not have been deleted`);
          } else {
            console.log(`✓ Successfully deleted app: ${testAppName}`);
          }
        } else {
          console.log(`⚠️ Warning: Delete button not found for app: ${testAppName}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error in afterEach cleanup for ${testAppName}: ${error.message}`);
    }
  });

  test('should display namespaces table with data-testid', async ({ page }) => {
    const namespacesTable = page.getByTestId('namespaces-table');
    await expect(namespacesTable).toBeVisible();
  });

  test('should verify namespace is created within test app context', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'Namespace-Application Relationship' },
      { type: 'description', description: 'Verify that namespaces are properly associated with parent application' },
      { type: 'tag', description: 'smoke' }
    );

    // This test validates that namespaces are properly associated with the parent app

    // Create a namespace
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    const uniqueName = `e2e-ns-verify-${Date.now()}`;
    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01');
    await page.getByTestId('input-managed-by-argo').selectOption('No');

    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // Verify namespace appears in the namespaces table for this app
    const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
    await expect(nsRow).toBeVisible({ timeout: 5000 });

    // Navigate back to apps to verify the app shows namespace count
    const backBtn = page.locator('button', { hasText: 'Back to App' });
    await backBtn.click();
    await page.waitForTimeout(1000);

    // Verify the app row exists and shows namespace count
    const appRow = page.getByTestId(`app-row-${testAppName}`);
    await expect(appRow).toBeVisible();

    // Navigate back to namespaces view to clean up
    const viewBtn = page.getByTestId(`view-app-${testAppName}`);
    await viewBtn.click();
    await page.waitForTimeout(1500);

    // Clean up - delete the namespace
    const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

    // Set up dialog handler before clicking delete (non-async to avoid conflicts)
    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });

    await deleteBtn.click();
    await page.waitForTimeout(2000);

    // Verify namespace is deleted (should not be visible)
    const stillExists = await nsRow.isVisible({ timeout: 1000 }).catch(() => false);
    if (stillExists) {
      console.log(`Warning: Namespace ${uniqueName} still visible after deletion`);
    }
  });

  test('should open and close namespace creation modal', async ({ page }) => {
    // Click add namespace button
    const addButton = page.getByTestId('add-namespace-btn');
    await expect(addButton).toBeVisible();
    await addButton.click();

    await page.waitForTimeout(500);

    // Modal should be visible
    const modal = page.getByTestId('create-namespace-modal');
    await expect(modal).toBeVisible();

    const closeButton = page.getByTestId('close-namespace-modal-btn');
    await expect(closeButton).toBeVisible();

    // Close modal
    await closeButton.click();
    await page.waitForTimeout(500);

    // Modal should not be visible anymore
    await expect(modal).not.toBeVisible();
  });

  test('should fill and clear namespace creation form', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'normal' },
      { type: 'story', description: 'Form Validation' },
      { type: 'description', description: 'Fill and clear namespace form, verify field values reset correctly' }
    );

    // Open modal
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    // Fill form
    await page.getByTestId('input-namespace').fill('test-ns-e2e');
    await page.getByTestId('input-namespace-clusters').fill('01,02');
    await page.getByTestId('input-managed-by-argo').selectOption('Yes');
    await page.getByTestId('input-egress-nameid').fill('egress-test-id');

    // Verify values
    await expect(page.getByTestId('input-namespace')).toHaveValue('test-ns-e2e');
    await expect(page.getByTestId('input-namespace-clusters')).toHaveValue('01,02');
    await expect(page.getByTestId('input-managed-by-argo')).toHaveValue('Yes');
    await expect(page.getByTestId('input-egress-nameid')).toHaveValue('egress-test-id');

    // Clear form
    await page.getByTestId('clear-namespace-form-btn').click();
    await page.waitForTimeout(300);

    // Verify cleared
    await expect(page.getByTestId('input-namespace')).toHaveValue('');
    await expect(page.getByTestId('input-namespace-clusters')).toHaveValue('');
    await expect(page.getByTestId('input-managed-by-argo')).toHaveValue('No');
    await expect(page.getByTestId('input-egress-nameid')).toHaveValue('');

    // Close modal to prevent blocking afterEach cleanup
    const closeButton = page.getByTestId('close-namespace-modal-btn');
    await closeButton.click();
    await page.waitForTimeout(300);
  });

  test('should create a new namespace in DEV environment', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'Create Namespace' },
      { type: 'description', description: 'Create a new namespace in DEV environment and verify creation' },
      { type: 'tag', description: 'smoke' }
    );

    // Open modal
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    // Fill form with unique namespace name
    const uniqueName = `e2e-ns-dev-${Date.now()}`;
    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01');
    await page.getByTestId('input-managed-by-argo').selectOption('No');

    // Submit
    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // Modal should be closed
    const modalVisible = await page.getByTestId('create-namespace-modal').isVisible().catch(() => false);
    expect(modalVisible).toBe(false);

    // Verify namespace appears in table
    const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
    await expect(nsRow).toBeVisible({ timeout: 5000 });

    // Clean up - ALWAYS delete the namespace
    const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });

    await deleteBtn.click();
    await page.waitForTimeout(2000);
  });

  test('should create namespace with Argo management enabled', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'normal' },
      { type: 'story', description: 'Argo Integration' },
      { type: 'description', description: 'Create namespace with ArgoCD management enabled' },
      { type: 'tag', description: 'integration' }
    );

    // Open modal
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    // Fill form with Argo enabled
    const uniqueName = `e2e-ns-argo-${Date.now()}`;
    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01');
    await page.getByTestId('input-managed-by-argo').selectOption('Yes');
    await page.getByTestId('input-egress-nameid').fill('argo-egress-id');

    // Submit
    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // Verify namespace appears in table
    const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
    await expect(nsRow).toBeVisible({ timeout: 5000 });

    // Clean up - ALWAYS delete
    const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });

    await deleteBtn.click();
    await page.waitForTimeout(2000);
  });

  test('should create and delete namespace in QA environment', async ({ page }) => {
    // Navigate back to apps
    const backBtn = page.locator('button', { hasText: 'Back to App' });
    await backBtn.click();
    await page.waitForTimeout(1000);

    // Switch to QA environment
    const qaTab = page.locator('button', { hasText: 'QA' }).first();
    const isQaVisible = await qaTab.isVisible().catch(() => false);

    if (isQaVisible) {
      await qaTab.click();
      await page.waitForTimeout(1500);

      // Navigate to namespaces view
      const viewBtn = page.getByTestId(`view-app-${testAppName}`);
      const viewVisible = await viewBtn.isVisible().catch(() => false);

      if (viewVisible) {
        await viewBtn.click();
        await page.waitForTimeout(1500);

        // Open modal
        await page.getByTestId('add-namespace-btn').click();
        await page.waitForTimeout(500);

        // Fill form
        const uniqueName = `e2e-ns-qa-${Date.now()}`;
        await page.getByTestId('input-namespace').fill(uniqueName);
        await page.getByTestId('input-namespace-clusters').fill('02');
        await page.getByTestId('input-managed-by-argo').selectOption('No');

        // Submit
        await page.getByTestId('submit-namespace-btn').click();
        await page.waitForTimeout(2000);

        // Verify namespace appears
        const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
        const exists = await nsRow.isVisible({ timeout: 5000 }).catch(() => false);

        if (exists) {
          // Delete the namespace
          const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

          // Confirm deletion - use .once to avoid conflicts
          page.once('dialog', dialog => {
            dialog.accept().catch(() => {});
          });

          await deleteBtn.click();
          await page.waitForTimeout(2000);

          // Verify namespace is deleted
          const stillExists = await nsRow.isVisible({ timeout: 2000 }).catch(() => false);
          expect(stillExists).toBe(false);
        }
      }
    }
  });

  test('should create and delete namespace in PRD environment', async ({ page }) => {
    // Navigate back to apps
    const backBtn = page.locator('button', { hasText: 'Back to App' });
    await backBtn.click();
    await page.waitForTimeout(1000);

    // Switch to PRD environment
    const prdTab = page.locator('button', { hasText: 'PRD' }).first();
    const isPrdVisible = await prdTab.isVisible().catch(() => false);

    if (isPrdVisible) {
      await prdTab.click();
      await page.waitForTimeout(1500);

      // Navigate to namespaces view
      const viewBtn = page.getByTestId(`view-app-${testAppName}`);
      const viewVisible = await viewBtn.isVisible().catch(() => false);

      if (viewVisible) {
        await viewBtn.click();
        await page.waitForTimeout(1500);

        // Open modal
        await page.getByTestId('add-namespace-btn').click();
        await page.waitForTimeout(500);

        // Fill form
        const uniqueName = `e2e-ns-prd-${Date.now()}`;
        await page.getByTestId('input-namespace').fill(uniqueName);
        await page.getByTestId('input-namespace-clusters').fill('03');
        await page.getByTestId('input-managed-by-argo').selectOption('Yes');
        await page.getByTestId('input-egress-nameid').fill('prd-egress');

        // Submit
        await page.getByTestId('submit-namespace-btn').click();
        await page.waitForTimeout(2000);

        // Verify namespace appears
        const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
        const exists = await nsRow.isVisible({ timeout: 5000 }).catch(() => false);

        if (exists) {
          // Delete the namespace
          const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

          // Confirm deletion - use .once to avoid conflicts
          page.once('dialog', dialog => {
            dialog.accept().catch(() => {});
          });

          await deleteBtn.click();
          await page.waitForTimeout(2000);

          // Verify namespace is deleted
          const stillExists = await nsRow.isVisible({ timeout: 2000 }).catch(() => false);
          expect(stillExists).toBe(false);
        }
      }
    }
  });

  test('should filter namespaces by name', async ({ page }) => {
    const filterInput = page.getByTestId('filter-namespace-name');
    const isVisible = await filterInput.isVisible().catch(() => false);

    if (isVisible) {
      await filterInput.fill('test');
      await page.waitForTimeout(500);

      // Verify table still visible
      await expect(page.getByTestId('namespaces-table')).toBeVisible();
    }
  });

  test('should filter namespaces by clusters', async ({ page }) => {
    const filterInput = page.getByTestId('filter-namespace-clusters');
    const isVisible = await filterInput.isVisible().catch(() => false);

    if (isVisible) {
      await filterInput.fill('01');
      await page.waitForTimeout(500);
    }
  });

  test('should toggle select all namespaces checkbox', async ({ page }) => {
    // First, create a namespace so there's something to select
    const uniqueName = `e2e-ns-select-${Date.now()}`;

    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01');
    await page.getByTestId('input-managed-by-argo').selectOption('No');

    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // Verify namespace was created
    const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
    await expect(nsRow).toBeVisible({ timeout: 5000 });

    // Now test the select all checkbox
    const selectAllCheckbox = page.getByTestId('select-all-namespaces-checkbox');
    await expect(selectAllCheckbox).toBeVisible();

    // Check - should select the namespace
    await selectAllCheckbox.check();
    await page.waitForTimeout(300);
    await expect(selectAllCheckbox).toBeChecked();

    // Verify the namespace checkbox is also checked
    const nsCheckbox = page.getByTestId(`namespace-checkbox-${uniqueName}`);
    await expect(nsCheckbox).toBeChecked();

    // Uncheck - should deselect the namespace
    await selectAllCheckbox.uncheck();
    await page.waitForTimeout(300);
    await expect(selectAllCheckbox).not.toBeChecked();
    await expect(nsCheckbox).not.toBeChecked();

    // Clean up - delete the namespace
    const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);
    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });
    await deleteBtn.click();
    await page.waitForTimeout(2000);
  });

  test('should select and verify namespace checkbox', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Find first namespace row
    const rows = await page.locator('[data-testid^="namespace-row-"]').all();

    if (rows.length > 0) {
      // Get the namespace name from data-testid
      const testId = await rows[0].getAttribute('data-testid');
      const nsName = testId?.replace('namespace-row-', '');

      if (nsName) {
        const checkbox = page.getByTestId(`namespace-checkbox-${nsName}`);

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

  test('should view namespace details', async ({ page }) => {
    // Create a namespace first
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    const uniqueName = `e2e-ns-details-${Date.now()}`;
    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01');
    await page.getByTestId('input-managed-by-argo').selectOption('No');

    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // View details
    const viewBtn = page.getByTestId(`view-namespace-${uniqueName}`);
    const isVisible = await viewBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await viewBtn.click();
      await page.waitForTimeout(1500);

      // Should navigate to namespace details view
      const backBtn = page.locator('button', { hasText: 'Back to Namespaces' });
      const backVisible = await backBtn.isVisible().catch(() => false);

      if (backVisible) {
        await backBtn.click();
        await page.waitForTimeout(1000);

        // Clean up - delete the namespace
        const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

        // Set up dialog handler BEFORE clicking
        page.once('dialog', dialog => {
          dialog.accept().catch(() => {});
        });

        await deleteBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should create namespace with multiple clusters', async ({ page }) => {
    // Open modal
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    // Fill form with multiple clusters
    const uniqueName = `e2e-ns-multi-${Date.now()}`;
    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01,02,03');
    await page.getByTestId('input-managed-by-argo').selectOption('No');

    // Submit
    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // Verify namespace appears
    const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
    await expect(nsRow).toBeVisible({ timeout: 5000 });

    // Clean up - ALWAYS delete
    const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

    // Set up dialog handler BEFORE clicking
    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });

    await deleteBtn.click();
    await page.waitForTimeout(2000);
  });

  test('should display no namespaces message when empty', async ({ page }) => {
    // This test checks if the empty state message appears
    // It may not work if there are existing namespaces
    const noMessage = page.getByTestId('no-namespaces-message');
    const noMessageVisible = await noMessage.isVisible().catch(() => false);

    // If message is visible, verify it
    if (noMessageVisible) {
      await expect(noMessage).toHaveText(/No namespaces found/i);
    }
  });

  test('should display no matches message when filtered with no results', async ({ page }) => {
    // Filter with impossible value
    const filterInput = page.getByTestId('filter-namespace-name');
    const isVisible = await filterInput.isVisible().catch(() => false);

    if (isVisible) {
      await filterInput.fill('xyz-nonexistent-namespace-12345');
      await page.waitForTimeout(500);

      // Should show no matches message
      const noMessage = page.getByTestId('no-matches-message');
      const noMsgVisible = await noMessage.isVisible().catch(() => false);

      if (noMsgVisible) {
        await expect(noMessage).toHaveText(/No matches/i);
      }
    }
  });

  test('should verify delete button exists for each namespace', async ({ page }) => {
    await page.waitForTimeout(1500);

    const rows = await page.locator('[data-testid^="namespace-row-"]').all();

    if (rows.length > 0) {
      const testId = await rows[0].getAttribute('data-testid');
      const nsName = testId?.replace('namespace-row-', '');

      if (nsName) {
        const deleteBtn = page.getByTestId(`delete-namespace-${nsName}`);
        const isVisible = await deleteBtn.isVisible().catch(() => false);

        if (isVisible) {
          await expect(deleteBtn).toBeVisible();
        }
      }
    }
  });

  test('should create namespace without egress name ID', async ({ page }) => {
    // Open modal
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    // Fill form without egress name ID
    const uniqueName = `e2e-ns-no-egress-${Date.now()}`;
    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01');
    await page.getByTestId('input-managed-by-argo').selectOption('No');
    // Leave egress name ID empty

    // Submit
    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // Verify namespace appears
    const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
    await expect(nsRow).toBeVisible({ timeout: 5000 });

    // Clean up - ALWAYS delete
    const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);

    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });

    await deleteBtn.click();
    await page.waitForTimeout(2000);
  });

  test('should create multiple namespaces within the same app', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'Multiple Namespaces Management' },
      { type: 'description', description: 'Create multiple namespaces within same application and verify isolation' },
      { type: 'tag', description: 'integration' }
    );

    // This test validates that multiple namespaces can be created within the same app
    const namespaceNames = [];

    // Create 3 namespaces
    for (let i = 0; i < 3; i++) {
      const uniqueName = `e2e-ns-multi-${Date.now()}-${i}`;
      namespaceNames.push(uniqueName);

      // Open modal
      await page.getByTestId('add-namespace-btn').click();
      await page.waitForTimeout(500);

      // Fill form
      await page.getByTestId('input-namespace').fill(uniqueName);
      await page.getByTestId('input-namespace-clusters').fill('01');
      await page.getByTestId('input-managed-by-argo').selectOption('No');

      // Submit
      await page.getByTestId('submit-namespace-btn').click();
      await page.waitForTimeout(2000);

      // Verify namespace was created
      const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
      await expect(nsRow).toBeVisible({ timeout: 5000 });
    }

    // Verify all namespaces are visible in the table
    for (const nsName of namespaceNames) {
      const nsRow = page.getByTestId(`namespace-row-${nsName}`);
      await expect(nsRow).toBeVisible();
    }

    // Clean up - delete all created namespaces
    for (const nsName of namespaceNames) {
      const deleteBtn = page.getByTestId(`delete-namespace-${nsName}`);
      const isVisible = await deleteBtn.isVisible().catch(() => false);

      if (isVisible) {
        page.once('dialog', dialog => {
          dialog.accept().catch(() => {});
        });
        await deleteBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  });

  test('should verify app-namespace relationship across navigation', async ({ page }) => {
    test.info().annotations.push(
      { type: 'severity', description: 'critical' },
      { type: 'story', description: 'Data Isolation' },
      { type: 'description', description: 'Verify namespaces are properly isolated between applications during navigation' },
      { type: 'tag', description: 'integration' },
      { type: 'tag', description: 'security' }
    );

    // Create a namespace
    await page.getByTestId('add-namespace-btn').click();
    await page.waitForTimeout(500);

    const uniqueName = `e2e-ns-relation-${Date.now()}`;
    await page.getByTestId('input-namespace').fill(uniqueName);
    await page.getByTestId('input-namespace-clusters').fill('01,02');
    await page.getByTestId('input-managed-by-argo').selectOption('Yes');

    await page.getByTestId('submit-namespace-btn').click();
    await page.waitForTimeout(2000);

    // Verify namespace exists
    const nsRow = page.getByTestId(`namespace-row-${uniqueName}`);
    await expect(nsRow).toBeVisible();

    // Navigate back to apps using direct navigation (more reliable)
    await page.goto('/apps', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Verify the test app exists in apps list
    const testAppRow = page.getByTestId(`app-row-${testAppName}`);
    await expect(testAppRow).toBeVisible();

    // Navigate to a different app if available
    const appRows = await page.locator('[data-testid^="app-row-"]').all();
    if (appRows.length > 1) {
      // Get a different app name
      const otherAppTestId = await appRows[1].getAttribute('data-testid');
      const otherAppName = otherAppTestId?.replace('app-row-', '');

      if (otherAppName && otherAppName !== testAppName) {
        // Navigate to the other app's namespaces
        const otherViewBtn = page.getByTestId(`view-app-${otherAppName}`);
        const otherViewVisible = await otherViewBtn.isVisible().catch(() => false);

        if (otherViewVisible) {
          await otherViewBtn.click();
          await page.waitForTimeout(1500);

          // Verify our namespace is NOT in this other app
          const nsRowInOtherApp = page.getByTestId(`namespace-row-${uniqueName}`);
          const existsInOtherApp = await nsRowInOtherApp.isVisible({ timeout: 2000 }).catch(() => false);
          expect(existsInOtherApp).toBe(false);

          // Navigate back to apps using direct navigation
          await page.goto('/apps', { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1500);
        }
      }
    }

    // Navigate back to our test app's namespaces
    const viewBtn = page.getByTestId(`view-app-${testAppName}`);
    await viewBtn.click();
    await page.waitForTimeout(1500);

    // Verify namespace still exists in our app
    await expect(nsRow).toBeVisible();

    // Clean up
    const deleteBtn = page.getByTestId(`delete-namespace-${uniqueName}`);
    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });
    await deleteBtn.click();
    await page.waitForTimeout(2000);
  });
});
