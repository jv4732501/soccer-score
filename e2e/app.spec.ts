import { test, expect } from '@playwright/test';

test('home page renders the Teams tab and matches baseline screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
  await expect(page).toHaveScreenshot('app-home.png');
});
