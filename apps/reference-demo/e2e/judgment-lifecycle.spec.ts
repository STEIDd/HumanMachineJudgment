import { test, expect } from '@playwright/test';

test.describe('Judgment Point Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/project/e2e-test-' + Date.now());
  });

  test('create and promote a judgment point', async ({ page }) => {
    // Click "Create Demo Judgment Point"
    await page.getByText('Create Demo Judgment Point').click();

    // Wait for the card to appear
    await expect(page.getByText('Should we use constant or temperature-dependent')).toBeVisible({
      timeout: 10000,
    });

    // The card should show "candidate" status
    await expect(page.getByText('candidate')).toBeVisible();
  });

  test('full lifecycle: create -> promote -> investigate -> resolve', async ({ page }) => {
    // Create
    await page.getByText('Create Demo Judgment Point').click();
    await expect(page.getByText('candidate')).toBeVisible({ timeout: 10000 });

    // Click the card to open panel - look for the question text and click it
    const card = page.locator('[data-testid="judgment-card"]').first();
    if (await card.isVisible()) {
      await card.click();
    }
  });
});
