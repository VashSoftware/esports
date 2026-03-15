import { describe, expect, test } from 'vitest';
import {
	rankToElo,
	getKFactor,
	expectedScore,
	computeNewElo,
	eloToTargetStars
} from './rating-math';

describe('rankToElo', () => {
	test('rank 1 → 3500', () => {
		expect(rankToElo(1)).toBe(3500);
	});

	test('rank 1000 → 2000', () => {
		expect(rankToElo(1000)).toBe(2000);
	});

	test('rank 100000 → 1000', () => {
		expect(rankToElo(100_000)).toBe(1000);
	});

	test('rank 1000000 → 500', () => {
		expect(rankToElo(1_000_000)).toBe(500);
	});

	test('extremely high rank clamps to 0', () => {
		expect(rankToElo(10 ** 8)).toBe(0);
	});

	test('rank 0 or negative returns 1000 (fallback)', () => {
		expect(rankToElo(0)).toBe(1000);
		expect(rankToElo(-5)).toBe(1000);
	});
});

describe('getKFactor', () => {
	test('K=40 for new players (<10 games)', () => {
		expect(getKFactor(0)).toBe(40);
		expect(getKFactor(9)).toBe(40);
	});

	test('K=32 for intermediate players (10-29 games)', () => {
		expect(getKFactor(10)).toBe(32);
		expect(getKFactor(29)).toBe(32);
	});

	test('K=24 for experienced players (30+ games)', () => {
		expect(getKFactor(30)).toBe(24);
		expect(getKFactor(100)).toBe(24);
	});
});

describe('expectedScore', () => {
	test('equal ratings → ~0.5', () => {
		expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
	});

	test('400 point advantage → ~0.909', () => {
		expect(expectedScore(1900, 1500)).toBeCloseTo(0.909, 2);
	});

	test('400 point disadvantage → ~0.091', () => {
		expect(expectedScore(1100, 1500)).toBeCloseTo(0.091, 2);
	});

	test('symmetric: E(a,b) + E(b,a) ≈ 1', () => {
		const a = expectedScore(1800, 1400);
		const b = expectedScore(1400, 1800);
		expect(a + b).toBeCloseTo(1, 10);
	});
});

describe('computeNewElo', () => {
	test('winning against equal opponent increases ELO', () => {
		const newElo = computeNewElo(1500, 1500, true, 0);
		expect(newElo).toBeGreaterThan(1500);
	});

	test('losing against equal opponent decreases ELO', () => {
		const newElo = computeNewElo(1500, 1500, false, 0);
		expect(newElo).toBeLessThan(1500);
	});

	test('winning against much weaker opponent gives small gain', () => {
		const gain = computeNewElo(2000, 1200, true, 50) - 2000;
		expect(gain).toBeLessThan(5);
		expect(gain).toBeGreaterThanOrEqual(0);
	});

	test('losing against much weaker opponent gives large loss', () => {
		const loss = 2000 - computeNewElo(2000, 1200, false, 50);
		expect(loss).toBeGreaterThan(20);
	});

	test('ELO never goes below 0', () => {
		// With only 5 ELO vs 3000, expected score is ~1 so loss penalty is tiny
		// Use a case where the loss actually pushes below 0
		expect(computeNewElo(1, 1, false, 0)).toBe(0); // 1 - 40*0.5 = -19 → clamped to 0
	});

	test('K factor affects magnitude of change', () => {
		const newPlayer = computeNewElo(1500, 1500, true, 0); // K=40
		const veteran = computeNewElo(1500, 1500, true, 50); // K=24
		expect(newPlayer - 1500).toBeGreaterThan(veteran - 1500);
	});
});

describe('eloToTargetStars', () => {
	test('ELO 0 → 2 stars', () => {
		expect(eloToTargetStars(0)).toBe(2);
	});

	test('ELO 700 → 3 stars', () => {
		expect(eloToTargetStars(700)).toBe(3);
	});

	test('ELO 3500 → 7 stars', () => {
		expect(eloToTargetStars(3500)).toBe(7);
	});

	test('ELO 1400 → 4 stars', () => {
		expect(eloToTargetStars(1400)).toBe(4);
	});
});
