import { describe, expect, test, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: { query: { match: { findFirst: vi.fn() } } }
}));

vi.mock('$lib/server/db/schema', () => ({ match: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => ({})) }));

const { getExpectedPicker, assertState } = await import('./helpers');

describe('getExpectedPicker', () => {
	const participants = [
		{ id: 'p1', pickOrder: 2, score: 0 },
		{ id: 'p2', pickOrder: 1, score: 0 }
	];

	test('returns participant with lowest pickOrder on game 0', () => {
		const result = getExpectedPicker(participants, 0);
		expect(result.id).toBe('p2');
	});

	test('alternates picker based on game count', () => {
		expect(getExpectedPicker(participants, 0).id).toBe('p2');
		expect(getExpectedPicker(participants, 1).id).toBe('p1');
		expect(getExpectedPicker(participants, 2).id).toBe('p2');
		expect(getExpectedPicker(participants, 3).id).toBe('p1');
	});

	test('wraps around with more than 2 participants', () => {
		const three = [
			{ id: 'a', pickOrder: 1, score: 0 },
			{ id: 'b', pickOrder: 2, score: 0 },
			{ id: 'c', pickOrder: 3, score: 0 }
		];
		expect(getExpectedPicker(three, 0).id).toBe('a');
		expect(getExpectedPicker(three, 1).id).toBe('b');
		expect(getExpectedPicker(three, 2).id).toBe('c');
		expect(getExpectedPicker(three, 3).id).toBe('a');
	});

	test('sorts by pickOrder regardless of array order', () => {
		const reversed = [
			{ id: 'z', pickOrder: 3, score: 0 },
			{ id: 'y', pickOrder: 1, score: 0 },
			{ id: 'x', pickOrder: 2, score: 0 }
		];
		expect(getExpectedPicker(reversed, 0).id).toBe('y');
		expect(getExpectedPicker(reversed, 1).id).toBe('x');
		expect(getExpectedPicker(reversed, 2).id).toBe('z');
	});

	test('treats null pickOrder as 99 (last)', () => {
		const withNull = [
			{ id: 'a', pickOrder: null, score: 0 },
			{ id: 'b', pickOrder: 1, score: 0 }
		];
		expect(getExpectedPicker(withNull, 0).id).toBe('b');
		expect(getExpectedPicker(withNull, 1).id).toBe('a');
	});

	test('does not mutate the input array', () => {
		const input = [
			{ id: 'p1', pickOrder: 2, score: 0 },
			{ id: 'p2', pickOrder: 1, score: 0 }
		];
		getExpectedPicker(input, 0);
		expect(input[0].id).toBe('p1');
		expect(input[1].id).toBe('p2');
	});
});

describe('assertState', () => {
	test('does not throw when states match', () => {
		expect(() => assertState('PICKING', 'PICKING')).not.toThrow();
	});

	test('throws with descriptive message when states differ', () => {
		expect(() => assertState('LOBBY', 'PICKING')).toThrow('Match is LOBBY, expected PICKING');
	});

	test('throws for each mismatch combination', () => {
		expect(() => assertState('CREATED', 'LOBBY')).toThrow('Match is CREATED, expected LOBBY');
		expect(() => assertState('FINISHED', 'PLAYING')).toThrow('Match is FINISHED, expected PLAYING');
	});
});
