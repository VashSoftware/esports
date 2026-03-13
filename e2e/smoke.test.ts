import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
	test('landing page loads with sign-in link', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: /Vash Esports/i })).toBeVisible();
		await expect(
			page.getByRole('banner').getByRole('link', { name: 'Sign in with osu!' })
		).toBeVisible();
	});

	test('protected API returns 401 without auth', async ({ request }) => {
		const response = await request.get('/api/matches');
		expect(response.status()).toBe(401);
	});

	test('health endpoint responds', async ({ request }) => {
		const response = await request.get('/api/health');
		// 200 if DB is up, 503 if not — both are valid from the endpoint
		expect([200, 503]).toContain(response.status());
		const body = await response.json();
		expect(body).toHaveProperty('status');
		expect(body).toHaveProperty('timestamp');
	});

	test('leaderboard page renders', async ({ page }) => {
		await page.goto('/leaderboard');
		await expect(page.locator('h1')).toContainText('Leaderboard');
	});

	test('privacy and terms pages render', async ({ page }) => {
		for (const path of ['/privacy', '/terms']) {
			const response = await page.goto(path);
			expect(response?.ok()).toBe(true);
		}
	});
});
