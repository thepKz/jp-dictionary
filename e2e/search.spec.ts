import { test, expect } from '@playwright/test';

const LOCAL_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Local CSV Dictionary', () => {
  test('shows results for a JP query and renders 3 fields', async ({ page }) => {
    await page.goto(LOCAL_BASE_URL);
    const input = page.getByPlaceholder('Ví dụ: 経済的, keizaiteki, economic...');
    await input.fill('厚い');
    await page.waitForTimeout(600);
    // Find result cards specifically (not the main search card)
    const resultCards = page.locator('.space-y-4 .card');
    await expect(resultCards.first()).toBeVisible();
    const firstCard = resultCards.first();
    await expect(firstCard).toContainText('厚い');
    await expect(firstCard).toContainText(/あつい|アツイ/);
    // romaji should be visible as latin letters
    await expect(firstCard).toContainText(/atsui/i);
    // meaning exists (should contain Vietnamese text)
    await expect(firstCard).toContainText(/dày dặn/);
  });

  test('search by Vietnamese meaning works', async ({ page }) => {
    await page.goto(LOCAL_BASE_URL);
    const input = page.getByPlaceholder('Ví dụ: 経済的, keizaiteki, economic...');
    await input.fill('nguy hiểm');
    await page.waitForTimeout(600);
    const resultCards = page.locator('.space-y-4 .card');
    const count = await resultCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('no icons or extra controls are present', async ({ page }) => {
    await page.goto(LOCAL_BASE_URL);
    const input = page.getByPlaceholder('Ví dụ: 経済的, keizaiteki, economic...');
    await input.fill('厚い');
    await page.waitForTimeout(600);
    // no svg icons
    await expect(page.locator('svg')).toHaveCount(0);
    // no action buttons from old UI
    await expect(page.getByRole('button', { name: 'Sao chép' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Yêu thích' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Chi tiết' })).toHaveCount(0);
    // no compact toggle label
    await expect(page.getByText('Chế độ giản lược')).toHaveCount(0);
  });
});


