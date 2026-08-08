import { test, expect } from '@playwright/test';

test.describe('Thermal Model Demo', () => {
  test('loads and shows introduction', async ({ page }) => {
    await page.goto('/#/thermal-model');
    await expect(page.getByText(/thermal/i)).toBeVisible();
    await expect(page.getByText(/heat sink/i)).toBeVisible();
  });

  test('shows scenario description', async ({ page }) => {
    await page.goto('/#/thermal-model');
    // Check for key scenario elements
    await expect(page.getByText(/50\s*W/)).toBeVisible();
    await expect(page.getByText(/105/)).toBeVisible(); // junction temp limit
  });
});
