/**
 * Pure bracket generation logic - no DB, no side effects.
 * Generates the structure of tournament brackets for single elim, double elim, and group stages.
 */

export interface BracketSlot {
	roundIndex: number;
	bracketPosition: number;
	team1Seed: number | null; // null = TBD (filled by previous match winner)
	team2Seed: number | null;
	winnerGoesTo: { roundIndex: number; bracketPosition: number; slot: 1 | 2 } | null;
	loserGoesTo: { roundIndex: number; bracketPosition: number; slot: 1 | 2 } | null;
	bracketType: 'winners' | 'losers' | 'grand_final';
	isBye: boolean;
}

export interface GroupAssignment {
	groupIndex: number;
	teamSeeds: number[];
}

export interface GroupMatch {
	groupIndex: number;
	team1Seed: number;
	team2Seed: number;
}

/**
 * Standard tournament seeding placement for a bracket of given size.
 * Ensures seed 1 and 2 are on opposite sides, high seeds are spread out.
 * Returns array of seed numbers in bracket order (position 0 = top of bracket).
 */
export function standardBracketSeeding(size: number): number[] {
	if (size < 2) return [1];
	if (size === 2) return [1, 2];

	const result: number[] = new Array(size);
	result[0] = 1;
	result[1] = 2;

	// iteratively place seeds by splitting the bracket
	for (let round = 1; round < Math.log2(size); round++) {
		const count = 1 << round; // seeds already placed: 2, 4, 8...
		const nextCount = count * 2;
		const temp: number[] = new Array(nextCount);

		for (let i = 0; i < count; i++) {
			temp[i * 2] = result[i];
			temp[i * 2 + 1] = nextCount + 1 - result[i];
		}

		for (let i = 0; i < nextCount; i++) {
			result[i] = temp[i];
		}
	}

	return result;
}

/**
 * Finds the smallest power of 2 >= n
 */
export function nextPowerOf2(n: number): number {
	let p = 1;
	while (p < n) p *= 2;
	return p;
}

/**
 * Generate a single elimination bracket.
 */
export function generateSingleElimBracket(teamCount: number): BracketSlot[] {
	const bracketSize = nextPowerOf2(teamCount);
	const totalRounds = Math.log2(bracketSize);
	const seeding = standardBracketSeeding(bracketSize);
	const slots: BracketSlot[] = [];

	// generate all rounds
	for (let round = 0; round < totalRounds; round++) {
		const matchesInRound = bracketSize / (2 << round);

		for (let pos = 0; pos < matchesInRound; pos++) {
			const isFirstRound = round === 0;
			const isFinalRound = round === totalRounds - 1;

			let team1Seed: number | null = null;
			let team2Seed: number | null = null;
			let isBye = false;

			if (isFirstRound) {
				const idx1 = pos * 2;
				const idx2 = pos * 2 + 1;
				team1Seed = seeding[idx1];
				team2Seed = seeding[idx2];
				// if either seed > teamCount, it's a BYE
				isBye = team1Seed > teamCount || team2Seed > teamCount;
			}

			const winnerGoesTo = isFinalRound
				? null
				: {
						roundIndex: round + 1,
						bracketPosition: Math.floor(pos / 2),
						slot: ((pos % 2) + 1) as 1 | 2
					};

			slots.push({
				roundIndex: round,
				bracketPosition: pos,
				team1Seed,
				team2Seed,
				winnerGoesTo,
				loserGoesTo: null,
				bracketType: 'winners',
				isBye
			});
		}
	}

	return slots;
}

/**
 * Generate a double elimination bracket.
 * Winners bracket + losers bracket + grand finals (with potential bracket reset).
 */
export function generateDoubleElimBracket(teamCount: number): BracketSlot[] {
	const bracketSize = nextPowerOf2(teamCount);
	const wbRounds = Math.log2(bracketSize);
	const lbRounds = 2 * (wbRounds - 1);
	const seeding = standardBracketSeeding(bracketSize);
	const slots: BracketSlot[] = [];

	// helper to find a slot by type + round + position
	const findSlot = (type: string, round: number, pos: number) =>
		slots.find(
			(s) => s.bracketType === type && s.roundIndex === round && s.bracketPosition === pos
		);

	// ── Generate Losers Bracket first (so we can reference it from WB) ──
	// LB has alternating "feed-in" and "reduction" rounds
	// LB round 0: WB R0 losers play each other (bracketSize/4 matches)
	// LB round 1: LB R0 winners vs WB R1 losers (feed-in)
	// LB round 2: LB R1 winners play each other (reduction)
	// LB round 3: LB R2 winners vs WB R2 losers (feed-in)
	// ... and so on

	for (let lbRound = 0; lbRound < lbRounds; lbRound++) {
		const isFeedIn = lbRound % 2 === 1;
		// number of matches halves every 2 rounds
		const matchesInRound = bracketSize / (2 << Math.floor((lbRound + 1) / 2));

		for (let pos = 0; pos < matchesInRound; pos++) {
			const isLastLbRound = lbRound === lbRounds - 1;

			const winnerGoesTo = isLastLbRound
				? null // will be linked to GF later
				: {
						roundIndex: lbRound + 1,
						bracketPosition: isFeedIn ? pos : Math.floor(pos / 2),
						slot: (isFeedIn ? 1 : (pos % 2) + 1) as 1 | 2
					};

			slots.push({
				roundIndex: lbRound,
				bracketPosition: pos,
				team1Seed: null,
				team2Seed: null,
				winnerGoesTo,
				loserGoesTo: null, // losers bracket losers are eliminated
				bracketType: 'losers',
				isBye: false
			});
		}
	}

	// ── Generate Winners Bracket ──
	for (let round = 0; round < wbRounds; round++) {
		const matchesInRound = bracketSize / (2 << round);

		for (let pos = 0; pos < matchesInRound; pos++) {
			const isFirstRound = round === 0;
			const isLastWbRound = round === wbRounds - 1;

			let team1Seed: number | null = null;
			let team2Seed: number | null = null;
			let isBye = false;

			if (isFirstRound) {
				const idx1 = pos * 2;
				const idx2 = pos * 2 + 1;
				team1Seed = seeding[idx1];
				team2Seed = seeding[idx2];
				isBye = team1Seed > teamCount || team2Seed > teamCount;
			}

			const winnerGoesTo = isLastWbRound
				? null // will be linked to GF later
				: {
						roundIndex: round + 1,
						bracketPosition: Math.floor(pos / 2),
						slot: ((pos % 2) + 1) as 1 | 2
					};

			// losers go to losers bracket
			// WB R0 losers → LB R0, WB R1 losers → LB R2, WB R2 losers → LB R4, etc.
			const lbTargetRound = round === 0 ? 0 : round * 2 - 1;
			// determine position in LB - for feed-in rounds, position maps directly
			// for the first WB round, losers pair up: WB match 0,1 → LB match 0; WB match 2,3 → LB match 1
			let lbTargetPos: number;
			let lbTargetSlot: 1 | 2;

			if (round === 0) {
				// WB R0 losers pair up in LB R0
				lbTargetPos = Math.floor(pos / 2);
				lbTargetSlot = ((pos % 2) + 1) as 1 | 2;
			} else {
				// WB R1+ losers enter feed-in rounds as slot 2
				lbTargetPos = pos;
				lbTargetSlot = 2;
			}

			const loserGoesTo = {
				roundIndex: lbTargetRound,
				bracketPosition: lbTargetPos,
				slot: lbTargetSlot
			};

			slots.push({
				roundIndex: round,
				bracketPosition: pos,
				team1Seed,
				team2Seed,
				winnerGoesTo,
				loserGoesTo,
				bracketType: 'winners',
				isBye
			});
		}
	}

	// ── Grand Finals ──
	// GF1: WB winner vs LB winner
	slots.push({
		roundIndex: 0,
		bracketPosition: 0,
		team1Seed: null, // WB winner
		team2Seed: null, // LB winner
		winnerGoesTo: null, // conditionally goes to GF2
		loserGoesTo: null,
		bracketType: 'grand_final',
		isBye: false
	});

	// GF2 (bracket reset): only played if LB winner wins GF1
	slots.push({
		roundIndex: 1,
		bracketPosition: 0,
		team1Seed: null,
		team2Seed: null,
		winnerGoesTo: null,
		loserGoesTo: null,
		bracketType: 'grand_final',
		isBye: false
	});

	// ── Wire up WB finals → GF1, LB finals → GF1 ──
	const wbFinal = slots.find((s) => s.bracketType === 'winners' && s.roundIndex === wbRounds - 1);
	if (wbFinal) {
		wbFinal.winnerGoesTo = { roundIndex: 0, bracketPosition: 0, slot: 1 };
	}

	const lbFinal = slots.find((s) => s.bracketType === 'losers' && s.roundIndex === lbRounds - 1);
	if (lbFinal) {
		lbFinal.winnerGoesTo = { roundIndex: 0, bracketPosition: 0, slot: 2 };
	}

	// GF1 winner → GF2 (conditionally)
	const gf1 = slots.find((s) => s.bracketType === 'grand_final' && s.roundIndex === 0);
	if (gf1) {
		gf1.winnerGoesTo = { roundIndex: 1, bracketPosition: 0, slot: 1 };
		gf1.loserGoesTo = { roundIndex: 1, bracketPosition: 0, slot: 2 };
	}

	return slots;
}

/**
 * Generate group assignments using snake seeding.
 * e.g. 4 groups, 16 teams:
 *   Group A: 1, 8, 9, 16
 *   Group B: 2, 7, 10, 15
 *   Group C: 3, 6, 11, 14
 *   Group D: 4, 5, 12, 13
 */
export function generateGroupAssignments(teamCount: number, groupCount: number): GroupAssignment[] {
	const groups: GroupAssignment[] = Array.from({ length: groupCount }, (_, i) => ({
		groupIndex: i,
		teamSeeds: []
	}));

	for (let seed = 1; seed <= teamCount; seed++) {
		const row = Math.floor((seed - 1) / groupCount);
		const col = (seed - 1) % groupCount;
		// snake: even rows go left→right, odd rows go right→left
		const groupIdx = row % 2 === 0 ? col : groupCount - 1 - col;
		groups[groupIdx].teamSeeds.push(seed);
	}

	return groups;
}

/**
 * Generate round-robin pairings for a group of teams.
 * Uses the circle method to ensure all teams play each other exactly once.
 */
export function generateRoundRobinPairings(teamSeeds: number[]): GroupMatch[] {
	const matches: GroupMatch[] = [];
	const n = teamSeeds.length;

	// for round-robin with n teams, we need n-1 rounds (or n if n is odd, with byes)
	// using the circle method
	const teams = [...teamSeeds];
	if (teams.length % 2 !== 0) {
		teams.push(-1); // -1 = BYE
	}

	const count = teams.length;
	const rounds = count - 1;
	const half = count / 2;

	// fix team[0] and rotate the rest
	for (let round = 0; round < rounds; round++) {
		for (let i = 0; i < half; i++) {
			const home = i === 0 ? teams[0] : teams[count - i];
			const away = teams[i === 0 ? (count - 1 - round < 1 ? count - 1 : 0) : i];

			// actually let's use a simpler approach
		}
	}

	// simpler: just enumerate all unique pairs
	for (let i = 0; i < teamSeeds.length; i++) {
		for (let j = i + 1; j < teamSeeds.length; j++) {
			matches.push({
				groupIndex: 0, // caller sets this
				team1Seed: teamSeeds[i],
				team2Seed: teamSeeds[j]
			});
		}
	}

	return matches;
}

/**
 * Generate all group stage matches for a tournament.
 */
export function generateGroupStageMatches(
	teamCount: number,
	groupCount: number
): { groups: GroupAssignment[]; matches: GroupMatch[] } {
	const groups = generateGroupAssignments(teamCount, groupCount);
	const allMatches: GroupMatch[] = [];

	for (const group of groups) {
		const pairings = generateRoundRobinPairings(group.teamSeeds);
		for (const match of pairings) {
			allMatches.push({ ...match, groupIndex: group.groupIndex });
		}
	}

	return { groups, matches: allMatches };
}

/**
 * Get the round name for a single/double elim bracket based on remaining teams.
 */
export function getRoundName(
	matchesInRound: number,
	bracketType: 'winners' | 'losers' | 'grand_final'
): string {
	if (bracketType === 'grand_final') return 'Grand Finals';

	const prefix = bracketType === 'losers' ? 'LB ' : '';

	switch (matchesInRound) {
		case 1:
			return `${prefix}Finals`;
		case 2:
			return `${prefix}Semifinals`;
		case 4:
			return `${prefix}Quarterfinals`;
		default:
			return `${prefix}Round of ${matchesInRound * 2}`;
	}
}
