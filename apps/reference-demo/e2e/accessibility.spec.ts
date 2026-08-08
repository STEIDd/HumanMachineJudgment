import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage passes axe checks', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('component gallery passes axe checks', async ({ page }) => {
    await page.goto('/#/components');
    await page.waitForTimeout(1000);
    const results = await new AxeBuilder({ page })
      .exclude('.jp-dependency-graph') // SVG graphs may have known issues
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('project view passes axe checks', async ({ page }) => {
    await page.goto('/#/project/demo');
    await page.waitForTimeout(1000);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
