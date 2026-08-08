import { test, expect } from '@playwright/test';

test.describe('Component Gallery', () => {
  test('all component sections render', async ({ page }) => {
    await page.goto('/#/components');

    // Check that the gallery page loaded
    await expect(page.getByRole('heading', { name: /component/i })).toBeVisible();

    // Check for key component section headings
    const sections = [
      'Badges',
      'Materiality',
      'Stale',
      'Alternative',
      'Comparison',
      'Judgment Card',
      'Timeline',
    ];

    for (const section of sections) {
      await expect(page.getByRole('heading', { name: new RegExp(section, 'i') })).toBeVisible();
    }
  });

  test('no JavaScript errors on page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#/components');
    await page.waitForTimeout(2000); // Wait for any async rendering

    expect(errors).toEqual([]);
  });
});
