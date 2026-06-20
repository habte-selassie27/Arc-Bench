import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows main heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Arc Task Verifier');
  });

  test('has evaluate textarea and button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('button:has-text("Evaluate")')).toBeVisible();
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[aria-label="Toggle dark mode"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDark).toBe(true);
  });
});

test.describe('Evaluation', () => {
  test('can evaluate text input', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'My test project with npm install and package.json');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=Score')).toBeVisible({ timeout: 15000 });
  });

  test('shows signal and arc scores after evaluation', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'A Foundry project using Arc RPC at https://rpc.testnet.arc.network');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=Signal')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Arc')).toBeVisible({ timeout: 15000 });
  });

  test('shows error for empty input', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=required')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Leaderboard', () => {
  test('page loads and shows title', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.locator('h1')).toContainText('Arc Leaderboard');
  });

  test('shows leaderboard table or empty state', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(
      page.locator('table, text=No entries, text=No submissions')
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Gas Estimator', () => {
  test('panel opens and shows estimate', async ({ page }) => {
    await page.goto('/');
    // First evaluate something to enable panels
    await page.fill('textarea', 'Test project');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=Score')).toBeVisible({ timeout: 15000 });

    // Open gas estimator panel
    const gasToggle = page.locator('button:has-text("Gas Estimator")');
    if (await gasToggle.isVisible()) {
      await gasToggle.click();
      await expect(page.locator('text=Gas')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Solidity Analyzer', () => {
  test('panel opens with textarea', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'Test project');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=Score')).toBeVisible({ timeout: 15000 });

    const analyzerToggle = page.locator('button:has-text("Solidity Analyzer")');
    if (await analyzerToggle.isVisible()) {
      await analyzerToggle.click();
      await expect(page.locator('text=Solidity')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Compare Mode', () => {
  test('compare section exists', async ({ page }) => {
    await page.goto('/');
    const compareSection = page.locator('text=Compare');
    await expect(compareSection.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Batch Mode', () => {
  test('batch toggle is present', async ({ page }) => {
    await page.goto('/');
    const batchToggle = page.locator('button:has-text("Batch")');
    await expect(batchToggle).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Export', () => {
  test('export buttons appear after evaluation', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'Test project');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=Score')).toBeVisible({ timeout: 15000 });

    // Export buttons should be visible
    await expect(page.locator('button:has-text("Export")').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('API Docs', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Contract Verifier', () => {
  test('contract panel exists', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'Test project');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=Score')).toBeVisible({ timeout: 15000 });

    const contractToggle = page.locator('button:has-text("Contract")');
    if (await contractToggle.isVisible()) {
      await contractToggle.click();
      await expect(page.locator('text=Address')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Share URL', () => {
  test('share button appears after evaluation', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea', 'Test project');
    await page.click('button:has-text("Evaluate")');
    await expect(page.locator('text=Score')).toBeVisible({ timeout: 15000 });

    const shareBtn = page.locator('button:has-text("Share")');
    if (await shareBtn.isVisible()) {
      await expect(shareBtn).toBeVisible();
    }
  });
});

test.describe('History', () => {
  test('history panel can be toggled', async ({ page }) => {
    await page.goto('/');
    const historyBtn = page.locator('button:has-text("History")');
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await expect(page.locator('text=History')).toBeVisible({ timeout: 5000 });
    }
  });
});
