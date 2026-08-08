import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Human-Machine Judgment Points')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Click "View Demo Project"
    await page.getByText('View Demo Project').click();
    await expect(page).toHaveURL(/#\/project\/demo/);

    // Navigate to Component Gallery
    await page.getByText('Components').click();
    await expect(page).toHaveURL(/#\/components/);

    // Navigate to Thermal Model
    await page.getByText('Thermal Model').click();
    await expect(page).toHaveURL(/#\/thermal-model/);
  });

  test('project selector is visible in header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox')).toBeVisible(); // project ID input
  });
});
