import { beforeEach, describe, expect, test, vi } from 'vitest';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
	beforeEach(() => {
		// Reset the module-level store between tests by reimporting would be ideal,
		// but we can use unique keys per test instead
		vi.restoreAllMocks();
	});

	test('first request is always allowed', () => {
		const result = checkRateLimit('test-first', 5, 60_000);
		expect(result.ok).toBe(true);
	});

	test('allows up to the limit', () => {
		for (let i = 0; i < 3; i++) {
			const result = checkRateLimit('test-limit', 3, 60_000);
			expect(result.ok).toBe(true);
		}
	});

	test('rejects after limit is exceeded', () => {
		for (let i = 0; i < 5; i++) {
			checkRateLimit('test-exceed', 5, 60_000);
		}
		const result = checkRateLimit('test-exceed', 5, 60_000);
		expect(result.ok).toBe(false);
		expect(result.retryAfter).toBeGreaterThan(0);
		expect(result.retryAfter).toBeLessThanOrEqual(60);
	});

	test('resets after window expires', () => {
		vi.useFakeTimers();
		try {
			checkRateLimit('test-reset', 1, 1000);
			const blocked = checkRateLimit('test-reset', 1, 1000);
			expect(blocked.ok).toBe(false);

			vi.advanceTimersByTime(1001);

			const afterReset = checkRateLimit('test-reset', 1, 1000);
			expect(afterReset.ok).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});

	test('different keys are independent', () => {
		checkRateLimit('key-a', 1, 60_000);
		const blockedA = checkRateLimit('key-a', 1, 60_000);
		expect(blockedA.ok).toBe(false);

		const allowedB = checkRateLimit('key-b', 1, 60_000);
		expect(allowedB.ok).toBe(true);
	});

	test('retryAfter is in seconds', () => {
		vi.useFakeTimers();
		try {
			checkRateLimit('test-retry', 1, 10_000);
			const result = checkRateLimit('test-retry', 1, 10_000);
			expect(result.ok).toBe(false);
			expect(result.retryAfter).toBe(10);

			vi.advanceTimersByTime(5000);

			const result2 = checkRateLimit('test-retry', 1, 10_000);
			expect(result2.ok).toBe(false);
			expect(result2.retryAfter).toBe(5);
		} finally {
			vi.useRealTimers();
		}
	});
});
