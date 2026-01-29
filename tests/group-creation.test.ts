import { expect, test } from '@playwright/test';

// TODO: These tests require authentication infrastructure
// The group creation page is protected and redirects to /login without auth
// Add test user setup or auth mocking before enabling
test.describe.skip('Group Creation Wizard', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/groups/create');
	});

	test('should display page title and description', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('Create a Group');
		await expect(page.locator('text=Build a community around your interests')).toBeVisible();
	});

	test('should show 3-step progress indicator', async ({ page }) => {
		// Check for 3 steps in progress indicator
		const stepCircles = page.locator('[class*="rounded-full"][class*="border-2"]');
		await expect(stepCircles).toHaveCount(3);

		// Check step labels
		await expect(page.locator('text=Basics')).toBeVisible();
		await expect(page.locator('text=Topics')).toBeVisible();
		await expect(page.locator('text=Settings')).toBeVisible();
	});

	test('should start on step 1 (Basics)', async ({ page }) => {
		await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
		await expect(page.locator('label:has-text("Group Name")')).toBeVisible();
		await expect(page.locator('label:has-text("Description")')).toBeVisible();
	});

	test('should not proceed to step 2 without required group name', async ({ page }) => {
		const nextButton = page.locator('button:has-text("Next Step")');

		// Button should be disabled when name is empty
		await expect(nextButton).toBeDisabled();

		// Fill in a name that's too short
		await page.locator('input[name="name"]').fill('ab');
		await expect(nextButton).toBeDisabled();

		// Fill in valid name
		await page.locator('input[name="name"]').fill('Test Group');
		await expect(nextButton).toBeEnabled();
	});

	test('should navigate to step 2 when clicking Next', async ({ page }) => {
		// Fill in group name
		await page.locator('input[name="name"]').fill('Test Group');

		// Click Next
		await page.locator('button:has-text("Next Step")').click();

		// Should show Topics step
		await expect(page.locator('h2:has-text("Select Topics")')).toBeVisible();
		await expect(
			page.locator('text=Choose 1-5 topics that best describe your group')
		).toBeVisible();
	});

	test('should not proceed from step 2 without selecting at least one topic', async ({ page }) => {
		// Navigate to step 2
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();

		// Next button should be disabled without topics
		const nextButton = page.locator('button:has-text("Next Step")');
		await expect(nextButton).toBeDisabled();
	});

	test('should allow selecting topics and navigate to step 3', async ({ page }) => {
		// Navigate to step 2
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();

		// Select a topic (any available topic button)
		const topicButtons = page.locator('button[aria-pressed]');
		const firstTopic = topicButtons.first();
		await firstTopic.click();

		// Verify topic is selected
		await expect(firstTopic).toHaveAttribute('aria-pressed', 'true');

		// Next button should be enabled
		const nextButton = page.locator('button:has-text("Next Step")');
		await expect(nextButton).toBeEnabled();

		// Click Next to go to step 3
		await nextButton.click();

		// Should show Settings step
		await expect(page.locator('h2:has-text("Group Settings")')).toBeVisible();
		await expect(page.locator('legend:has-text("Group Type")')).toBeVisible();
	});

	test('should limit topic selection to 5 topics', async ({ page }) => {
		// Navigate to step 2
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();

		// Get topic buttons
		const topicButtons = page.locator('button[aria-pressed="false"]');

		// Select 5 topics
		for (let i = 0; i < 5; i++) {
			await topicButtons.nth(i).click();
		}

		// Check that we see the maximum message
		await expect(page.locator('text=5 topics selected (maximum reached)')).toBeVisible();

		// Try to click a 6th topic - it should be disabled
		const sixthTopic = topicButtons.nth(5);
		await expect(sixthTopic).toBeDisabled();
	});

	test('should allow going back from step 2 to step 1', async ({ page }) => {
		// Navigate to step 2
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();

		// Click Back
		await page.locator('button:has-text("Back")').click();

		// Should be back on step 1
		await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();

		// Data should be preserved
		await expect(page.locator('input[name="name"]')).toHaveValue('Test Group');
	});

	test('should show group type options on step 3', async ({ page }) => {
		// Navigate to step 3
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();

		// Select a topic
		await page.locator('button[aria-pressed]').first().click();
		await page.locator('button:has-text("Next Step")').click();

		// Should show group type options
		await expect(page.locator('label:has-text("Public")')).toBeVisible();
		await expect(page.locator('label:has-text("Private")')).toBeVisible();

		// Should show explanations
		await expect(
			page.locator('text=Anyone can join immediately. Group is visible in search.')
		).toBeVisible();
		await expect(
			page.locator('text=Members must request to join and be approved by organizers.')
		).toBeVisible();
	});

	test('should show Create Group button on final step', async ({ page }) => {
		// Navigate to step 3
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();

		// Select a topic
		await page.locator('button[aria-pressed]').first().click();
		await page.locator('button:has-text("Next Step")').click();

		// Should show Create Group button instead of Next Step
		await expect(page.locator('button:has-text("Create Group")')).toBeVisible();
		await expect(page.locator('button:has-text("Next Step")')).not.toBeVisible();
	});

	test('should show Cancel link on step 1', async ({ page }) => {
		await expect(page.locator('a:has-text("Cancel")')).toBeVisible();
		await expect(page.locator('a:has-text("Cancel")')).toHaveAttribute('href', '/dashboard');
	});

	test('should accept optional description', async ({ page }) => {
		const descriptionField = page.locator('textarea[name="description"]');
		await expect(descriptionField).toBeVisible();

		await descriptionField.fill('This is a test group description');
		await expect(descriptionField).toHaveValue('This is a test group description');

		// Should show character count
		await expect(page.locator('text=/\\d+\\/2000 characters/')).toBeVisible();
	});

	test('should accept optional location on step 3', async ({ page }) => {
		// Navigate to step 3
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();
		await page.locator('button[aria-pressed]').first().click();
		await page.locator('button:has-text("Next Step")').click();

		const locationField = page.locator('input[name="location"]');
		await expect(locationField).toBeVisible();

		await locationField.fill('San Francisco, CA');
		await expect(locationField).toHaveValue('San Francisco, CA');

		// Should show clear button
		await expect(page.locator('button[aria-label="Clear location"]')).toBeVisible();
	});

	test('should clear location when clicking Clear button', async ({ page }) => {
		// Navigate to step 3
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('button:has-text("Next Step")').click();
		await page.locator('button[aria-pressed]').first().click();
		await page.locator('button:has-text("Next Step")').click();

		const locationField = page.locator('input[name="location"]');
		await locationField.fill('San Francisco, CA');

		// Click Clear
		await page.locator('button[aria-label="Clear location"]').click();

		// Location should be empty
		await expect(locationField).toHaveValue('');
	});

	test('should preserve form data when navigating between steps', async ({ page }) => {
		// Fill step 1
		await page.locator('input[name="name"]').fill('Test Group');
		await page.locator('textarea[name="description"]').fill('Test Description');
		await page.locator('button:has-text("Next Step")').click();

		// Fill step 2
		await page.locator('button[aria-pressed]').first().click();
		await page.locator('button:has-text("Next Step")').click();

		// Fill step 3
		await page.locator('input[value="public"]').click();
		await page.locator('input[name="location"]').fill('Test Location');

		// Go back to step 1
		await page.locator('button:has-text("Back")').click();
		await page.locator('button:has-text("Back")').click();

		// Data should be preserved
		await expect(page.locator('input[name="name"]')).toHaveValue('Test Group');
		await expect(page.locator('textarea[name="description"]')).toHaveValue('Test Description');

		// Navigate forward again
		await page.locator('button:has-text("Next Step")').click();
		await page.locator('button:has-text("Next Step")').click();

		// Step 3 data should also be preserved
		await expect(page.locator('input[value="public"]')).toBeChecked();
		await expect(page.locator('input[name="location"]')).toHaveValue('Test Location');
	});
});
