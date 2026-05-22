import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Arc Task Verifier');
});

test('leaderboard page shows title', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.locator('h1')).toContainText('Arc Leaderboard');
});

test('can evaluate text input', async ({ page }) => {
  await page.goto('/');
  await page.fill('textarea', 'My test project with npm install');
  await page.click('button:has-text("Evaluate")');
  await expect(page.locator('text=Score')).toBeVisible({ timeout: 10000 });
});
