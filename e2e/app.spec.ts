import { test, expect } from '@playwright/test';

test('home page renders and matches baseline screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
  await expect(page).toHaveScreenshot('app-home.png');
});
