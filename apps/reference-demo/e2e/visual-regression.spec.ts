import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('homepage.png', { fullPage: true });
  });

  test('component gallery screenshot', async ({ page }) => {
    await page.goto('/#/components');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('component-gallery.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});
