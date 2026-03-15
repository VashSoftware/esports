import { describe, expect, test } from 'vitest';
import {
	isMatchPoint,
	validateTiebreakerPick,
	determineGameWinner,
	hasRollTie,
	assignPickOrder,
	winsNeeded
} from './engine-logic';

describe('winsNeeded', () => {
	test('BO1 → 1', () => {
		expect(winsNeeded(1)).toBe(1);
	});

	test('BO3 → 2', () => {
		expect(winsNeeded(3)).toBe(2);
	});

	test('BO5 → 3', () => {
		expect(winsNeeded(5)).toBe(3);
	});

	test('BO7 → 4', () => {
		expect(winsNeeded(7)).toBe(4);
	});

	test('BO9 → 5', () => {
		expect(winsNeeded(9)).toBe(5);
	});
});

describe('isMatchPoint', () => {
	test('both at winsNeeded-1 → true', () => {
		expect(isMatchPoint([2, 2], 3)).toBe(true);
	});

	test('only one at winsNeeded-1 → false', () => {
		expect(isMatchPoint([2, 1], 3)).toBe(false);
	});

	test('neither at match point → false', () => {
		expect(isMatchPoint([0, 0], 3)).toBe(false);
	});

	test('works with 3 participants', () => {
		expect(isMatchPoint([1, 1, 1], 2)).toBe(true);
		expect(isMatchPoint([1, 1, 0], 2)).toBe(false);
	});
});

describe('validateTiebreakerPick', () => {
	test('TB at match point → null (allowed)', () => {
		expect(validateTiebreakerPick('TB', true)).toBeNull();
	});

	test('TB before match point → error', () => {
		expect(validateTiebreakerPick('TB', false)).toBe(
			'Tiebreaker can only be picked at match point'
		);
	});

	test('non-TB at match point → error', () => {
		expect(validateTiebreakerPick('HD', true)).toBe(
			'Only tiebreaker maps can be picked at match point'
		);
	});

	test('non-TB before match point → null (allowed)', () => {
		expect(validateTiebreakerPick('NM', false)).toBeNull();
	});

	test('null category before match point → null (allowed)', () => {
		expect(validateTiebreakerPick(null, false)).toBeNull();
	});

	test('null category at match point → error (must pick TB)', () => {
		expect(validateTiebreakerPick(null, true)).toBe(
			'Only tiebreaker maps can be picked at match point'
		);
	});
});

describe('determineGameWinner', () => {
	test('returns participant with highest total score', () => {
		const scores = new Map([
			['p1', 500_000],
			['p2', 800_000]
		]);
		expect(determineGameWinner(scores)).toBe('p2');
	});

	test('returns null for empty map', () => {
		expect(determineGameWinner(new Map())).toBeNull();
	});

	test('handles single participant', () => {
		const scores = new Map([['p1', 100]]);
		expect(determineGameWinner(scores)).toBe('p1');
	});

	test('first participant wins on equal score (iteration order)', () => {
		const scores = new Map([
			['p1', 500],
			['p2', 500]
		]);
		// Map iterates in insertion order; p1 is set first, but p2 doesn't beat p1's score
		// so p1 stays as winner (> not >=)
		expect(determineGameWinner(scores)).toBe('p1');
	});

	test('handles zero scores', () => {
		const scores = new Map([
			['p1', 0],
			['p2', 0]
		]);
		expect(determineGameWinner(scores)).toBe('p1');
	});
});

describe('hasRollTie', () => {
	test('no tie with distinct values', () => {
		expect(hasRollTie([50, 80])).toBe(false);
	});

	test('tie with duplicate values', () => {
		expect(hasRollTie([50, 50])).toBe(true);
	});

	test('tie with some duplicates in larger set', () => {
		expect(hasRollTie([10, 50, 50, 90])).toBe(true);
	});

	test('no tie with single value', () => {
		expect(hasRollTie([42])).toBe(false);
	});

	test('empty array → no tie', () => {
		expect(hasRollTie([])).toBe(false);
	});
});

describe('assignPickOrder', () => {
	test('highest roll gets pickOrder 1', () => {
		const rolls = [
			{ id: 'a', rollValue: 30 },
			{ id: 'b', rollValue: 90 },
			{ id: 'c', rollValue: 60 }
		];
		const result = assignPickOrder(rolls);
		expect(result).toEqual([
			{ participantId: 'b', pickOrder: 1 },
			{ participantId: 'c', pickOrder: 2 },
			{ participantId: 'a', pickOrder: 3 }
		]);
	});

	test('does not mutate input', () => {
		const rolls = [
			{ id: 'a', rollValue: 10 },
			{ id: 'b', rollValue: 20 }
		];
		assignPickOrder(rolls);
		expect(rolls[0].id).toBe('a');
	});

	test('single participant gets order 1', () => {
		expect(assignPickOrder([{ id: 'x', rollValue: 50 }])).toEqual([
			{ participantId: 'x', pickOrder: 1 }
		]);
	});
});
