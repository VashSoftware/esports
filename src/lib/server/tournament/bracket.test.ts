import { describe, it, expect } from 'vitest';
import {
	standardBracketSeeding,
	nextPowerOf2,
	generateSingleElimBracket,
	generateDoubleElimBracket,
	generateGroupAssignments,
	generateRoundRobinPairings,
	generateGroupStageMatches
} from './bracket';

describe('nextPowerOf2', () => {
	it('returns correct values', () => {
		expect(nextPowerOf2(1)).toBe(1);
		expect(nextPowerOf2(2)).toBe(2);
		expect(nextPowerOf2(3)).toBe(4);
		expect(nextPowerOf2(5)).toBe(8);
		expect(nextPowerOf2(8)).toBe(8);
		expect(nextPowerOf2(9)).toBe(16);
		expect(nextPowerOf2(17)).toBe(32);
	});
});

describe('standardBracketSeeding', () => {
	it('returns [1, 2] for size 2', () => {
		expect(standardBracketSeeding(2)).toEqual([1, 2]);
	});

	it('returns correct seeding for size 4', () => {
		const seeds = standardBracketSeeding(4);
		expect(seeds).toEqual([1, 4, 2, 3]);
	});

	it('returns correct seeding for size 8', () => {
		const seeds = standardBracketSeeding(8);
		// 1v8, 4v5, 2v7, 3v6
		expect(seeds).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
	});

	it('ensures seed 1 and 2 are on opposite halves for size 16', () => {
		const seeds = standardBracketSeeding(16);
		expect(seeds).toHaveLength(16);
		// seed 1 should be in top half, seed 2 in bottom half
		const topHalf = seeds.slice(0, 8);
		const bottomHalf = seeds.slice(8);
		expect(topHalf).toContain(1);
		expect(bottomHalf).toContain(2);
	});
});

describe('generateSingleElimBracket', () => {
	it('generates correct bracket for 4 teams', () => {
		const slots = generateSingleElimBracket(4);
		// 4 teams, 2 rounds, 3 total matches
		expect(slots).toHaveLength(3);

		const round0 = slots.filter((s) => s.roundIndex === 0);
		const round1 = slots.filter((s) => s.roundIndex === 1);
		expect(round0).toHaveLength(2);
		expect(round1).toHaveLength(1);

		// finals has no winnerGoesTo
		expect(round1[0].winnerGoesTo).toBeNull();

		// no byes
		expect(slots.every((s) => !s.isBye)).toBe(true);
	});

	it('generates correct bracket for 8 teams', () => {
		const slots = generateSingleElimBracket(8);
		// 8 teams, 3 rounds, 7 matches
		expect(slots).toHaveLength(7);

		const round0 = slots.filter((s) => s.roundIndex === 0);
		expect(round0).toHaveLength(4);
		// all first round matches have seeds assigned
		for (const slot of round0) {
			expect(slot.team1Seed).not.toBeNull();
			expect(slot.team2Seed).not.toBeNull();
		}
	});

	it('handles 6 teams with BYEs', () => {
		const slots = generateSingleElimBracket(6);
		// bracket size = 8, so 7 matches
		expect(slots).toHaveLength(7);

		const byes = slots.filter((s) => s.isBye);
		// 2 byes (seeds 7 and 8 don't exist)
		expect(byes).toHaveLength(2);

		// verify top 2 seeds get byes
		const byeSeeds = byes.flatMap((s) => [s.team1Seed, s.team2Seed]);
		expect(byeSeeds).toContain(1);
		expect(byeSeeds).toContain(2);
	});

	it('generates correct progression links', () => {
		const slots = generateSingleElimBracket(4);
		const round0 = slots.filter((s) => s.roundIndex === 0);

		// match 0 winner goes to round 1, position 0, slot 1
		expect(round0[0].winnerGoesTo).toEqual({
			roundIndex: 1,
			bracketPosition: 0,
			slot: 1
		});
		// match 1 winner goes to round 1, position 0, slot 2
		expect(round0[1].winnerGoesTo).toEqual({
			roundIndex: 1,
			bracketPosition: 0,
			slot: 2
		});
	});

	it('all bracket types are winners', () => {
		const slots = generateSingleElimBracket(8);
		expect(slots.every((s) => s.bracketType === 'winners')).toBe(true);
	});
});

describe('generateDoubleElimBracket', () => {
	it('generates correct bracket for 4 teams', () => {
		const slots = generateDoubleElimBracket(4);
		const wb = slots.filter((s) => s.bracketType === 'winners');
		const lb = slots.filter((s) => s.bracketType === 'losers');
		const gf = slots.filter((s) => s.bracketType === 'grand_final');

		// WB: 2 rounds (2 + 1 = 3 matches)
		expect(wb).toHaveLength(3);
		// LB: 2*(2-1) = 2 rounds
		expect(lb.length).toBeGreaterThan(0);
		// GF: 2 matches (GF1 + GF2)
		expect(gf).toHaveLength(2);
	});

	it('generates correct bracket for 8 teams', () => {
		const slots = generateDoubleElimBracket(8);
		const wb = slots.filter((s) => s.bracketType === 'winners');
		const lb = slots.filter((s) => s.bracketType === 'losers');
		const gf = slots.filter((s) => s.bracketType === 'grand_final');

		// WB: 3 rounds (4 + 2 + 1 = 7 matches)
		expect(wb).toHaveLength(7);
		// GF: always 2
		expect(gf).toHaveLength(2);
		// LB: 2*(3-1) = 4 rounds
		const lbRounds = new Set(lb.map((s) => s.roundIndex));
		expect(lbRounds.size).toBe(4);
	});

	it('WB losers have loserGoesTo set', () => {
		const slots = generateDoubleElimBracket(8);
		const wb = slots.filter((s) => s.bracketType === 'winners');
		// all WB matches should have loserGoesTo pointing to LB
		for (const slot of wb) {
			expect(slot.loserGoesTo).not.toBeNull();
		}
	});

	it('GF1 links to GF2', () => {
		const slots = generateDoubleElimBracket(8);
		const gf1 = slots.find((s) => s.bracketType === 'grand_final' && s.roundIndex === 0);
		expect(gf1).toBeDefined();
		expect(gf1!.winnerGoesTo).toEqual({
			roundIndex: 1,
			bracketPosition: 0,
			slot: 1
		});
	});
});

describe('generateGroupAssignments', () => {
	it('snake seeds correctly for 8 teams, 2 groups', () => {
		const groups = generateGroupAssignments(8, 2);
		expect(groups).toHaveLength(2);
		// Group A: 1, 4, 5, 8
		expect(groups[0].teamSeeds).toEqual([1, 4, 5, 8]);
		// Group B: 2, 3, 6, 7
		expect(groups[1].teamSeeds).toEqual([2, 3, 6, 7]);
	});

	it('snake seeds correctly for 16 teams, 4 groups', () => {
		const groups = generateGroupAssignments(16, 4);
		expect(groups).toHaveLength(4);
		// Group A: 1, 8, 9, 16
		expect(groups[0].teamSeeds).toEqual([1, 8, 9, 16]);
		// Group B: 2, 7, 10, 15
		expect(groups[1].teamSeeds).toEqual([2, 7, 10, 15]);
	});

	it('handles uneven groups', () => {
		const groups = generateGroupAssignments(7, 2);
		// one group gets 4, other gets 3
		const total = groups.reduce((sum, g) => sum + g.teamSeeds.length, 0);
		expect(total).toBe(7);
	});
});

describe('generateRoundRobinPairings', () => {
	it('generates correct number of pairings for 4 teams', () => {
		const pairings = generateRoundRobinPairings([1, 2, 3, 4]);
		// C(4,2) = 6 matches
		expect(pairings).toHaveLength(6);
	});

	it('generates correct number of pairings for 3 teams', () => {
		const pairings = generateRoundRobinPairings([1, 2, 3]);
		// C(3,2) = 3 matches
		expect(pairings).toHaveLength(3);
	});

	it('every team plays every other team exactly once', () => {
		const teams = [1, 2, 3, 4];
		const pairings = generateRoundRobinPairings(teams);

		for (const a of teams) {
			for (const b of teams) {
				if (a >= b) continue;
				const found = pairings.filter(
					(p) =>
						(p.team1Seed === a && p.team2Seed === b) || (p.team1Seed === b && p.team2Seed === a)
				);
				expect(found).toHaveLength(1);
			}
		}
	});
});

describe('generateGroupStageMatches', () => {
	it('generates groups and all round-robin matches', () => {
		const { groups, matches } = generateGroupStageMatches(8, 2);
		expect(groups).toHaveLength(2);
		// 4 teams per group, C(4,2) = 6 matches per group, 12 total
		expect(matches).toHaveLength(12);
		// each match has a groupIndex
		const group0Matches = matches.filter((m) => m.groupIndex === 0);
		const group1Matches = matches.filter((m) => m.groupIndex === 1);
		expect(group0Matches).toHaveLength(6);
		expect(group1Matches).toHaveLength(6);
	});
});
