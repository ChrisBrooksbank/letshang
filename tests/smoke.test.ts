import { expect, test } from '@playwright/test';

test('home page loads', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Welcome to LetsHang');
});

test('page has correct title', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/LetsHang/);
});
