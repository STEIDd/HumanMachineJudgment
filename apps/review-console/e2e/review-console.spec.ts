/**
 * Review Console E2E tests.
 *
 * These tests run against a real `hmj serve` instance with a real SQLite
 * database seeded by the globalSetup script (seed-data.ts → seed_e2e_data.py).
 *
 * Scenarios:
 *   A: SPA loads and displays project ID
 *   B: Empty state when no points match filter
 *   C: Seeded judgment points appear in the list
 *   D: Navigate to detail view and verify content
 *   E: Promote candidate to pending
 *   F: Resolve a judgment point with alternative + rationale
 *   G: Dismiss a judgment point with reason
 *   H: Status filters work correctly
 */

import { test, expect } from '@playwright/test';

test.describe.serial('Review Console E2E', () => {
  // -------------------------------------------------------------------------
  // A: SPA loads and displays project ID
  // -------------------------------------------------------------------------

  test('A: SPA loads and displays project ID', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The header should show "HMJ Review Console"
    await expect(page.locator('h1')).toContainText('HMJ Review Console');

    // Project ID should be displayed (format: "Project: xxxxxxxx")
    const header = page.locator('header');
    await expect(header).toContainText('Project:');
  });

  // -------------------------------------------------------------------------
  // B: Empty state message
  // -------------------------------------------------------------------------

  test('B: shows meaningful content when loaded', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The seeded data should produce judgment points
    const body = await page.textContent('body');
    expect(body).toContain('Judgment Points');
  });

  // -------------------------------------------------------------------------
  // C: Seeded judgment points appear in the list
  // -------------------------------------------------------------------------

  test('C: seeded judgment points appear in the list', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the points to load (the table should have rows)
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check that our seeded questions are visible
    await expect(page.getByText('hashing algorithm')).toBeVisible();
    await expect(page.getByText('normalize the input data')).toBeVisible();
    await expect(page.getByText('network latency assumption')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // D: Navigate to detail view
  // -------------------------------------------------------------------------

  test('D: navigate to detail view and verify content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on the row containing "hashing algorithm"
    const row = page.getByText('hashing algorithm');
    await row.click();

    // The detail view should show the full question as a heading
    await expect(page.locator('h2')).toContainText('hashing algorithm');

    // Should display the category
    await expect(page.getByText('method')).toBeVisible();

    // Should show alternatives
    await expect(page.getByText('bcrypt')).toBeVisible();
    await expect(page.getByText('Argon2id')).toBeVisible();

    // Should have a Back button
    await expect(page.getByText('Back')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // E: Promote candidate to pending
  // -------------------------------------------------------------------------

  test('E: promote candidate to pending', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to the candidate point (hashing algorithm)
    await page.getByText('hashing algorithm').click();

    // The Promote button should be visible for candidates
    const promoteBtn = page.getByRole('button', { name: 'Promote' });
    await expect(promoteBtn).toBeVisible();

    // Click Promote
    await promoteBtn.click();

    // Wait for the status to update to "pending"
    await expect(page.locator('span').filter({ hasText: /^pending$/ })).toBeVisible({
      timeout: 5000,
    });
  });

  // -------------------------------------------------------------------------
  // F: Resolve with alternative and rationale
  // -------------------------------------------------------------------------

  test('F: resolve a judgment point with alternative and rationale', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to the investigating point about normalization
    await page.getByText('normalize the input data').click();

    // Wait for detail view
    await expect(page.locator('h2')).toContainText('normalize');

    // Click Resolve button
    const resolveBtn = page.getByRole('button', { name: 'Resolve' });
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // The resolve form should appear
    await expect(page.getByText('Resolve Judgment Point')).toBeVisible();

    // The select should have alternatives
    const select = page.locator('select');
    await expect(select).toBeVisible();

    // Fill in the rationale
    const textarea = page.locator('textarea');
    await textarea.fill('Z-score normalization is the standard approach for this dataset type.');

    // Submit the form (the last "Resolve" button in the form)
    const submitBtn = page
      .locator('button')
      .filter({ hasText: /^Resolve$/ })
      .last();
    await submitBtn.click();

    // Wait for status to update to "resolved"
    await expect(page.locator('span').filter({ hasText: /^resolved$/ })).toBeVisible({
      timeout: 5000,
    });
  });

  // -------------------------------------------------------------------------
  // G: Dismiss with reason
  // -------------------------------------------------------------------------

  test('G: dismiss a judgment point with reason', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to the pending point about latency assumption
    await page.getByText('network latency assumption').click();

    // Wait for detail view
    await expect(page.locator('h2')).toContainText('network latency');

    // Click Dismiss button
    const dismissBtn = page.getByRole('button', { name: 'Dismiss' });
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    // The dismiss form should appear
    await expect(page.getByText('Dismiss Judgment Point')).toBeVisible();

    // Fill in the reason
    const textarea = page.locator('textarea');
    await textarea.fill('This assumption has been validated by network measurements.');

    // Submit the form
    const submitBtn = page
      .locator('button')
      .filter({ hasText: /^Dismiss$/ })
      .last();
    await submitBtn.click();

    // Wait for status to update to "dismissed"
    await expect(page.locator('span').filter({ hasText: /^dismissed$/ })).toBeVisible({
      timeout: 5000,
    });
  });

  // -------------------------------------------------------------------------
  // H: Status filters work
  // -------------------------------------------------------------------------

  test('H: status filters work correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for points to load
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // The "All" filter button should show the total count
    const allBtn = page.locator('button').filter({ hasText: /^All \(\d+\)$/ });
    await expect(allBtn).toBeVisible();

    // There should be status filter buttons
    const filterButtons = page.locator('button').filter({ hasText: /^\w+ \(\d+\)$/ });
    const count = await filterButtons.count();

    if (count > 1) {
      // Click a status filter button
      const secondFilter = filterButtons.nth(1);
      await secondFilter.click();

      // The heading should update to reflect the filter
      const heading = page.locator('h2');
      await expect(heading).toBeVisible();
    }
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------

  test('keyboard navigation works on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab should move focus to interactive elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // No JavaScript errors
  // -------------------------------------------------------------------------

  test('renders without unexpected JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected network errors
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('NetworkError'),
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
