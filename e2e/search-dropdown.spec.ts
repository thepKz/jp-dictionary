import { test, expect } from '@playwright/test';

const LOCAL_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Search Box Dropdown', () => {
  test('preset buttons should NOT auto-search', async ({ page }) => {
    await page.goto(LOCAL_BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click preset button "経済的"
    const presetButton = page.locator('button:has-text("経済的")').first();
    await presetButton.click();
    
    // Check that search input has the value
    const searchInput = page.getByPlaceholder('Ví dụ: 経済的, keizaiteki, economic...');
    await expect(searchInput).toHaveValue('経済的');
    
    // Check that NO results are shown (should be empty)
    const noResultsMessage = page.locator('text="Không tìm thấy kết quả"');
    await expect(noResultsMessage).not.toBeVisible();
    
    // Check that results section is empty
    const resultsSection = page.locator('.space-y-4');
    await expect(resultsSection).not.toBeVisible();
  });

  test('search button should trigger search', async ({ page }) => {
    await page.goto(LOCAL_BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Type in search input
    const searchInput = page.getByPlaceholder('Ví dụ: 経済的, keizaiteki, economic...');
    await searchInput.fill('経済的');
    
    // Click search button
    const searchButton = page.locator('button:has-text("Tìm kiếm")');
    await searchButton.click();
    
    // Wait for results to load
    await page.waitForTimeout(1000);
    
    // Check that results are shown
    const resultsSection = page.locator('.space-y-4');
    await expect(resultsSection).toBeVisible();
    
    // Check that we have at least one result
    const resultCards = page.locator('.space-y-4 .card');
    const count = await resultCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dropdown suggestions should work', async ({ page }) => {
    await page.goto(LOCAL_BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Type in search input to trigger dropdown
    const searchInput = page.getByPlaceholder('Ví dụ: 経済的, keizaiteki, economic...');
    await searchInput.fill('経済');
    
    // Check that dropdown appears
    const dropdown = page.locator('.absolute.top-full.left-0.right-0.z-10');
    await expect(dropdown).toBeVisible();
    
    // Check that suggestions are shown
    const suggestions = page.locator('.absolute.top-full .p-3');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);
    
    // Click on first suggestion
    await suggestions.first().click();
    
    // Check that input is filled and results are shown
    await expect(searchInput).toHaveValue(/経済/);
    
    // Check that results are shown
    const resultsSection = page.locator('.space-y-4');
    await expect(resultsSection).toBeVisible();
  });

  test('Enter key should trigger search', async ({ page }) => {
    await page.goto(LOCAL_BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Type in search input
    const searchInput = page.getByPlaceholder('Ví dụ: 経済的, keizaiteki, economic...');
    await searchInput.fill('経済的');
    
    // Press Enter
    await searchInput.press('Enter');
    
    // Wait for results to load
    await page.waitForTimeout(1000);
    
    // Check that results are shown
    const resultsSection = page.locator('.space-y-4');
    await expect(resultsSection).toBeVisible();
  });
});
