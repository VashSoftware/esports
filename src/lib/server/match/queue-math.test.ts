import { describe, expect, test } from 'vitest';
import { getAverageMappoolSR, findClosestPair, scoreMappools } from './queue-math';

describe('getAverageMappoolSR', () => {
	test('averages star ratings', () => {
		const slots = [{ starRating: 4 }, { starRating: 6 }];
		expect(getAverageMappoolSR(slots)).toBe(5);
	});

	test('treats null starRating as 0', () => {
		const slots = [{ starRating: 4 }, { starRating: null }];
		expect(getAverageMappoolSR(slots)).toBe(2);
	});

	test('returns 0 for empty slots', () => {
		expect(getAverageMappoolSR([])).toBe(0);
	});

	test('single slot returns its value', () => {
		expect(getAverageMappoolSR([{ starRating: 5.5 }])).toBe(5.5);
	});

	test('handles many slots', () => {
		const slots = Array.from({ length: 10 }, (_, i) => ({ starRating: i + 1 }));
		expect(getAverageMappoolSR(slots)).toBe(5.5);
	});
});

describe('findClosestPair', () => {
	test('returns null for fewer than 2 entries', () => {
		expect(findClosestPair([])).toBeNull();
		expect(findClosestPair([{ elo: 1500 }])).toBeNull();
	});

	test('returns the only pair when exactly 2 entries', () => {
		const queue = [{ elo: 1000 }, { elo: 2000 }];
		const pair = findClosestPair(queue);
		expect(pair).toEqual([{ elo: 1000 }, { elo: 2000 }]);
	});

	test('finds closest pair in sorted list', () => {
		const queue = [
			{ elo: 1000, id: 'a' },
			{ elo: 1100, id: 'b' },
			{ elo: 1500, id: 'c' },
			{ elo: 2000, id: 'd' }
		];
		const pair = findClosestPair(queue)!;
		expect(pair[0].id).toBe('a');
		expect(pair[1].id).toBe('b');
	});

	test('picks first closest pair when tied gap', () => {
		const queue = [{ elo: 100 }, { elo: 200 }, { elo: 300 }];
		const pair = findClosestPair(queue)!;
		expect(pair[0].elo).toBe(100);
		expect(pair[1].elo).toBe(200);
	});

	test('handles equal ELOs', () => {
		const queue = [{ elo: 1500 }, { elo: 1500 }, { elo: 2000 }];
		const pair = findClosestPair(queue)!;
		expect(pair[0].elo).toBe(1500);
		expect(pair[1].elo).toBe(1500);
	});
});

describe('scoreMappools', () => {
	const pool = (sr: number[]) => ({
		id: sr.join('-'),
		slots: sr.map((s) => ({ starRating: s }))
	});

	test('returns null for empty pool list', () => {
		expect(scoreMappools([], 5)).toBeNull();
	});

	test('returns null when all pools have empty slots', () => {
		expect(scoreMappools([{ id: 'x', slots: [] }], 5)).toBeNull();
	});

	test('returns the closest pool to target', () => {
		const pools = [pool([3, 3]), pool([5, 5]), pool([7, 7])];
		expect(scoreMappools(pools, 5)!.id).toBe('5-5');
	});

	test('returns closest when target is between pools', () => {
		const pools = [pool([2, 2]), pool([6, 6])];
		expect(scoreMappools(pools, 3)!.id).toBe('2-2');
	});

	test('handles single pool', () => {
		const pools = [pool([4, 4])];
		expect(scoreMappools(pools, 10)!.id).toBe('4-4');
	});

	test('skips pools with empty slots', () => {
		const pools = [{ id: 'empty', slots: [] as { starRating: number | null }[] }, pool([5, 5])];
		expect(scoreMappools(pools, 5)!.id).toBe('5-5');
	});
});
