import { describe, expect, test, vi, beforeEach } from 'vitest';

// Mock the env module before importing permissions
vi.mock('$env/dynamic/private', () => ({
	env: { ROOT_ADMIN_EMAIL: 'root@example.com' }
}));

vi.mock('$lib/server/db', () => ({
	db: { query: { user: { findFirst: vi.fn() } }, update: vi.fn() }
}));

vi.mock('$lib/server/db/auth.schema', () => ({ user: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => ({})) }));

// SvelteKit error function mock — throws an object with status/body like the real one
vi.mock('@sveltejs/kit', () => ({
	error: (status: number, body: string) => {
		throw { status, body };
	}
}));

const { hasRole, isRootAdmin } = await import('./permissions');

describe('hasRole', () => {
	test('player meets player requirement', () => {
		expect(hasRole('player', 'player')).toBe(true);
	});

	test('admin meets player requirement', () => {
		expect(hasRole('admin', 'player')).toBe(true);
	});

	test('admin meets referee requirement', () => {
		expect(hasRole('admin', 'referee')).toBe(true);
	});

	test('player does not meet referee requirement', () => {
		expect(hasRole('player', 'referee')).toBe(false);
	});

	test('player does not meet admin requirement', () => {
		expect(hasRole('player', 'admin')).toBe(false);
	});

	test('referee meets referee requirement', () => {
		expect(hasRole('referee', 'referee')).toBe(true);
	});

	test('referee does not meet admin requirement', () => {
		expect(hasRole('referee', 'admin')).toBe(false);
	});

	test('undefined role defaults to player level (0)', () => {
		expect(hasRole(undefined, 'player')).toBe(true);
		expect(hasRole(undefined, 'referee')).toBe(false);
	});

	test('unknown role string defaults to player level', () => {
		expect(hasRole('bogus', 'player')).toBe(true);
		expect(hasRole('bogus', 'referee')).toBe(false);
	});
});

describe('isRootAdmin', () => {
	test('returns true for matching email', () => {
		expect(isRootAdmin('root@example.com')).toBe(true);
	});

	test('case insensitive comparison', () => {
		expect(isRootAdmin('ROOT@EXAMPLE.COM')).toBe(true);
		expect(isRootAdmin('Root@Example.Com')).toBe(true);
	});

	test('returns false for different email', () => {
		expect(isRootAdmin('other@example.com')).toBe(false);
	});

	test('returns false for null/undefined', () => {
		expect(isRootAdmin(null)).toBe(false);
		expect(isRootAdmin(undefined)).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(isRootAdmin('')).toBe(false);
	});
});
