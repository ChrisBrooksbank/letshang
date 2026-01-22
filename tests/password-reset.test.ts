import { expect, test } from '@playwright/test';

test.describe('Password Reset Flow', () => {
	test('forgot password page loads correctly', async ({ page }) => {
		await page.goto('/forgot-password');
		await expect(page.locator('h1')).toContainText('Reset your password');
		await expect(page.locator('form')).toBeVisible();
	});

	test('forgot password form validates email format', async ({ page }) => {
		await page.goto('/forgot-password');

		// Try invalid email
		await page.fill('input[name="email"]', 'not-an-email');
		await page.click('button[type="submit"]');

		// Should show validation error
		// Note: superforms validation happens on blur or submit
		await expect(page.locator('text=valid email')).toBeVisible({ timeout: 5000 });
	});

	test('forgot password form accepts valid email', async ({ page }) => {
		await page.goto('/forgot-password');

		// Fill valid email
		await page.fill('input[name="email"]', 'test@example.com');

		// Submit button should be enabled
		const submitButton = page.locator('button[type="submit"]');
		await expect(submitButton).toBeEnabled();
	});

	test('forgot password shows success message after submission', async ({ page }) => {
		await page.goto('/forgot-password');

		// Fill and submit valid email
		await page.fill('input[name="email"]', 'test@example.com');
		await page.click('button[type="submit"]');

		// AC: No email enumeration - same message for exists/doesn't exist
		// Should show success message regardless of whether email exists
		await expect(page.locator('text=/receive a password reset link/i')).toBeVisible({
			timeout: 5000
		});
	});

	test('forgot password page has link back to login', async ({ page }) => {
		await page.goto('/forgot-password');

		const loginLink = page.locator('a[href="/login"]');
		await expect(loginLink).toBeVisible();
		await expect(loginLink).toContainText('Sign in');
	});

	test('reset password page loads correctly', async ({ page }) => {
		await page.goto('/reset-password');
		await expect(page.locator('h1')).toContainText('Set new password');
		await expect(page.locator('form')).toBeVisible();
	});

	test('reset password form has password and confirm password fields', async ({ page }) => {
		await page.goto('/reset-password');

		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
	});

	test('reset password form validates password length', async ({ page }) => {
		await page.goto('/reset-password');

		// Try short password
		await page.fill('input[name="password"]', 'short');
		await page.fill('input[name="confirmPassword"]', 'short');
		await page.click('button[type="submit"]');

		// Should show validation error for minimum length
		await expect(page.locator('text=/at least 8 characters/i')).toBeVisible({ timeout: 5000 });
	});

	test('reset password form validates password match', async ({ page }) => {
		await page.goto('/reset-password');

		// Fill with mismatched passwords
		await page.fill('input[name="password"]', 'password123');
		await page.fill('input[name="confirmPassword"]', 'different123');
		await page.click('button[type="submit"]');

		// Should show validation error for mismatch
		await expect(page.locator('text=/passwords do not match/i')).toBeVisible({ timeout: 5000 });
	});

	test('reset password form accepts matching passwords', async ({ page }) => {
		await page.goto('/reset-password');

		// Fill matching valid passwords
		await page.fill('input[name="password"]', 'newpassword123');
		await page.fill('input[name="confirmPassword"]', 'newpassword123');

		// Submit button should be enabled
		const submitButton = page.locator('button[type="submit"]');
		await expect(submitButton).toBeEnabled();
	});

	test('reset password page has link back to login', async ({ page }) => {
		await page.goto('/reset-password');

		const loginLink = page.locator('a[href="/login"]');
		await expect(loginLink).toBeVisible();
		await expect(loginLink).toContainText('Sign in');
	});

	test('forms have proper accessibility attributes', async ({ page }) => {
		// Test forgot password form
		await page.goto('/forgot-password');
		const emailInput = page.locator('input[name="email"]');
		await expect(emailInput).toHaveAttribute('type', 'email');
		await expect(emailInput).toHaveAttribute('autocomplete', 'email');
		await expect(emailInput).toHaveAttribute('required');

		// Test reset password form
		await page.goto('/reset-password');
		const passwordInput = page.locator('input[name="password"]');
		const confirmInput = page.locator('input[name="confirmPassword"]');
		await expect(passwordInput).toHaveAttribute('type', 'password');
		await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
		await expect(passwordInput).toHaveAttribute('required');
		await expect(confirmInput).toHaveAttribute('type', 'password');
		await expect(confirmInput).toHaveAttribute('required');
	});

	test('forms show loading state during submission', async ({ page }) => {
		await page.goto('/forgot-password');

		await page.fill('input[name="email"]', 'test@example.com');

		// Click submit and check for loading state
		const submitButton = page.locator('button[type="submit"]');
		await submitButton.click();

		// Button should show loading text
		await expect(submitButton).toContainText(/sending/i);
	});
});
