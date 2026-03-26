import { db } from '$lib/server/db';
import {
	tournament,
	tournamentStaff,
	tournamentRound,
	tournamentRegistration,
	tournamentMatch,
	tournamentGroup,
	tournamentGroupEntry,
	match
} from '$lib/server/db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import {
	TOURNAMENT_STATES,
	TOURNAMENT_MATCH_STATES,
	TOURNAMENT_STAFF_ROLES,
	type TournamentConfig,
	type TournamentFormat
} from './types';
import {
	generateSingleElimBracket,
	generateDoubleElimBracket,
	generateGroupAssignments,
	generateGroupStageMatches,
	nextPowerOf2,
	getRoundName,
	type BracketSlot
} from './bracket';
import { processByes } from './progression';

// ── Create Tournament ──────────────────────────────────────────────────

export async function createTournament(opts: {
	name: string;
	description?: string;
	format: TournamentFormat;
	config: TournamentConfig;
	maxSlots: number;
	bannerUrl?: string;
	createdBy: string;
	registrationOpenAt?: Date;
	registrationCloseAt?: Date;
	startAt?: Date;
}) {
	const [created] = await db
		.insert(tournament)
		.values({
			name: opts.name,
			description: opts.description,
			format: opts.format,
			config: opts.config,
			maxSlots: opts.maxSlots,
			bannerUrl: opts.bannerUrl,
			createdBy: opts.createdBy,
			registrationOpenAt: opts.registrationOpenAt,
			registrationCloseAt: opts.registrationCloseAt,
			startAt: opts.startAt,
			state: TOURNAMENT_STATES.DRAFT
		})
		.returning();

	// add creator as organizer
	await db.insert(tournamentStaff).values({
		tournamentId: created.id,
		userId: opts.createdBy,
		role: TOURNAMENT_STAFF_ROLES.ORGANIZER
	});

	log.tournament.info({ tournamentId: created.id, name: opts.name }, 'tournament created');
	return created;
}

// ── Open Registration ──────────────────────────────────────────────────

export async function openRegistration(tournamentId: string) {
	const t = await getTournamentOrThrow(tournamentId);
	assertTournamentState(t.state, TOURNAMENT_STATES.DRAFT);

	// validate at least one round exists
	const rounds = await db.query.tournamentRound.findMany({
		where: eq(tournamentRound.tournamentId, tournamentId)
	});
	if (rounds.length === 0) {
		throw new Error('Cannot open registration: no rounds configured');
	}

	await db
		.update(tournament)
		.set({
			state: TOURNAMENT_STATES.REGISTRATION,
			registrationOpenAt: new Date()
		})
		.where(eq(tournament.id, tournamentId));

	log.tournament.info({ tournamentId }, 'registration opened');
}

// ── Close Registration ─────────────────────────────────────────────────

export async function closeRegistration(tournamentId: string) {
	const t = await getTournamentOrThrow(tournamentId);
	assertTournamentState(t.state, TOURNAMENT_STATES.REGISTRATION);

	const config = t.config as TournamentConfig;
	const nextState = config.qualifiers?.enabled
		? TOURNAMENT_STATES.QUALIFIERS
		: TOURNAMENT_STATES.SEEDING;

	await db
		.update(tournament)
		.set({
			state: nextState,
			registrationCloseAt: new Date()
		})
		.where(eq(tournament.id, tournamentId));

	log.tournament.info({ tournamentId, nextState }, 'registration closed');
}

// ── Register for Tournament ────────────────────────────────────────────

export async function registerForTournament(tournamentId: string, teamId: string, userId: string) {
	const t = await getTournamentOrThrow(tournamentId);
	assertTournamentState(t.state, TOURNAMENT_STATES.REGISTRATION);

	// check max slots
	const registrations = await db.query.tournamentRegistration.findMany({
		where: and(
			eq(tournamentRegistration.tournamentId, tournamentId),
			inArray(tournamentRegistration.status, ['registered', 'confirmed'])
		)
	});

	const config = t.config as TournamentConfig;
	const hasQualifiers = config.qualifiers?.enabled;

	// if no qualifiers, cap at maxSlots. with qualifiers, allow more signups
	if (!hasQualifiers && registrations.length >= t.maxSlots) {
		throw new Error('Tournament is full');
	}

	// check not already registered
	const existing = await db.query.tournamentRegistration.findFirst({
		where: and(
			eq(tournamentRegistration.tournamentId, tournamentId),
			eq(tournamentRegistration.teamId, teamId)
		)
	});
	if (existing) {
		throw new Error('Already registered for this tournament');
	}

	const [reg] = await db
		.insert(tournamentRegistration)
		.values({
			tournamentId,
			teamId,
			userId,
			status: 'registered'
		})
		.returning();

	log.tournament.info({ tournamentId, teamId }, 'team registered');
	return reg;
}

// ── Withdraw from Tournament ───────────────────────────────────────────

export async function withdrawFromTournament(tournamentId: string, teamId: string) {
	const reg = await db.query.tournamentRegistration.findFirst({
		where: and(
			eq(tournamentRegistration.tournamentId, tournamentId),
			eq(tournamentRegistration.teamId, teamId)
		)
	});
	if (!reg) throw new Error('Not registered for this tournament');

	await db
		.update(tournamentRegistration)
		.set({ status: 'withdrawn' })
		.where(eq(tournamentRegistration.id, reg.id));

	log.tournament.info({ tournamentId, teamId }, 'team withdrew');
}

// ── Finalize Seeding ───────────────────────────────────────────────────

export async function finalizeSeeding(tournamentId: string) {
	const t = await getTournamentOrThrow(tournamentId);
	if (t.state !== TOURNAMENT_STATES.SEEDING && t.state !== TOURNAMENT_STATES.QUALIFIERS) {
		throw new Error(`Cannot finalize seeding in state ${t.state}`);
	}

	const registrations = await db.query.tournamentRegistration.findMany({
		where: and(
			eq(tournamentRegistration.tournamentId, tournamentId),
			inArray(tournamentRegistration.status, ['registered', 'confirmed'])
		),
		orderBy: [asc(tournamentRegistration.seed), asc(tournamentRegistration.registeredAt)]
	});

	if (registrations.length < 2) {
		throw new Error('Need at least 2 teams to generate bracket');
	}

	// cap to maxSlots if needed (qualifiers should have already reduced)
	const activeTeams = registrations.slice(0, t.maxSlots);

	// assign seeds if not already set (from qualifiers)
	for (let i = 0; i < activeTeams.length; i++) {
		if (!activeTeams[i].seed) {
			await db
				.update(tournamentRegistration)
				.set({ seed: i + 1 })
				.where(eq(tournamentRegistration.id, activeTeams[i].id));
			activeTeams[i] = { ...activeTeams[i], seed: i + 1 };
		}
	}

	// eliminate teams that didn't make the cut
	const eliminated = registrations.slice(t.maxSlots);
	for (const reg of eliminated) {
		await db
			.update(tournamentRegistration)
			.set({ status: 'eliminated' })
			.where(eq(tournamentRegistration.id, reg.id));
	}

	const format = t.format as TournamentFormat;
	const config = t.config as TournamentConfig;

	// build seed → teamId map
	const seedToTeam = new Map<number, string>();
	for (const reg of activeTeams) {
		seedToTeam.set(reg.seed!, reg.teamId);
	}

	if (format === 'groups_bracket' && config.groupStage) {
		await generateGroupsAndBracket(tournamentId, activeTeams.length, config, seedToTeam);
	} else if (format === 'double_elim') {
		await generateDoubleElimFromSeeds(tournamentId, activeTeams.length, seedToTeam);
	} else {
		await generateSingleElimFromSeeds(tournamentId, activeTeams.length, seedToTeam);
	}

	await db
		.update(tournament)
		.set({ state: TOURNAMENT_STATES.BRACKET })
		.where(eq(tournament.id, tournamentId));

	// auto-advance BYE matches
	await processByes(tournamentId);

	log.tournament.info({ tournamentId, teamCount: activeTeams.length, format }, 'bracket generated');
}

// ── Cancel Tournament ──────────────────────────────────────────────────

export async function cancelTournament(tournamentId: string) {
	const t = await getTournamentOrThrow(tournamentId);
	if (t.state === TOURNAMENT_STATES.FINISHED || t.state === TOURNAMENT_STATES.CANCELLED) {
		throw new Error(`Tournament is already ${t.state}`);
	}

	// cancel any active matches
	const activeMatches = await db.query.tournamentMatch.findMany({
		where: and(
			eq(tournamentMatch.tournamentId, tournamentId),
			inArray(tournamentMatch.state, [
				TOURNAMENT_MATCH_STATES.SCHEDULED,
				TOURNAMENT_MATCH_STATES.LIVE
			])
		)
	});

	for (const tm of activeMatches) {
		if (tm.matchId) {
			await db
				.update(match)
				.set({ state: 'CANCELLED', finishedAt: new Date() })
				.where(eq(match.id, tm.matchId));
		}
		await db
			.update(tournamentMatch)
			.set({ state: TOURNAMENT_MATCH_STATES.FINISHED })
			.where(eq(tournamentMatch.id, tm.id));
	}

	await db
		.update(tournament)
		.set({ state: TOURNAMENT_STATES.CANCELLED, finishedAt: new Date() })
		.where(eq(tournament.id, tournamentId));

	log.tournament.info({ tournamentId }, 'tournament cancelled');
}

// ── Check Tournament Completion ────────────────────────────────────────

export async function checkTournamentCompletion(tournamentId: string) {
	const allMatches = await db.query.tournamentMatch.findMany({
		where: eq(tournamentMatch.tournamentId, tournamentId)
	});

	const incomplete = allMatches.filter(
		(m) => m.state !== TOURNAMENT_MATCH_STATES.FINISHED && m.state !== TOURNAMENT_MATCH_STATES.BYE
	);

	if (incomplete.length > 0) return false;

	// find the final match winner
	// for single/double elim, it's the last match with no winnerGoesToId
	const finalMatch = allMatches.find((m) => !m.winnerGoesToId && m.winnerId);
	const winnerId = finalMatch?.winnerId;

	await db
		.update(tournament)
		.set({
			state: TOURNAMENT_STATES.FINISHED,
			finishedAt: new Date(),
			winnerId
		})
		.where(eq(tournament.id, tournamentId));

	log.tournament.info({ tournamentId, winnerId }, 'tournament finished');
	return true;
}

// ── Internal: Generate Single Elim from Seeds ──────────────────────────

async function generateSingleElimFromSeeds(
	tournamentId: string,
	teamCount: number,
	seedToTeam: Map<number, string>
) {
	const bracketSlots = generateSingleElimBracket(teamCount);
	const bracketSize = nextPowerOf2(teamCount);
	const totalRounds = Math.log2(bracketSize);

	// get or create rounds
	const rounds = await getOrCreateRounds(tournamentId, totalRounds, 'winners');

	// create tournament matches
	await insertBracketMatches(tournamentId, bracketSlots, rounds, seedToTeam, 'winners');
}

// ── Internal: Generate Double Elim from Seeds ──────────────────────────

async function generateDoubleElimFromSeeds(
	tournamentId: string,
	teamCount: number,
	seedToTeam: Map<number, string>
) {
	const bracketSlots = generateDoubleElimBracket(teamCount);
	const bracketSize = nextPowerOf2(teamCount);
	const wbRounds = Math.log2(bracketSize);
	const lbRounds = 2 * (wbRounds - 1);

	// create rounds for WB, LB, and GF
	const wbRoundRecords = await getOrCreateRounds(tournamentId, wbRounds, 'winners');
	const lbRoundRecords = await getOrCreateRounds(tournamentId, lbRounds, 'losers');
	const gfRoundRecords = await getOrCreateRounds(tournamentId, 2, 'grand_final');

	// build round map: bracketType + roundIndex → round record
	const roundMap = new Map<string, { id: string }>();
	for (let i = 0; i < wbRoundRecords.length; i++) {
		roundMap.set(`winners-${i}`, wbRoundRecords[i]);
	}
	for (let i = 0; i < lbRoundRecords.length; i++) {
		roundMap.set(`losers-${i}`, lbRoundRecords[i]);
	}
	for (let i = 0; i < gfRoundRecords.length; i++) {
		roundMap.set(`grand_final-${i}`, gfRoundRecords[i]);
	}

	// insert all bracket matches (in two passes: first create, then link)
	// first pass: create all matches without progression links
	const slotToMatchId = new Map<string, string>();

	for (const slot of bracketSlots) {
		const roundKey = `${slot.bracketType}-${slot.roundIndex}`;
		const round = roundMap.get(roundKey);
		if (!round) continue;

		const team1Id = slot.team1Seed ? (seedToTeam.get(slot.team1Seed) ?? null) : null;
		const team2Id = slot.team2Seed ? (seedToTeam.get(slot.team2Seed) ?? null) : null;
		const isBye = slot.isBye;

		let state: string = TOURNAMENT_MATCH_STATES.PENDING;
		if (isBye) state = TOURNAMENT_MATCH_STATES.BYE;
		else if (team1Id && team2Id) state = TOURNAMENT_MATCH_STATES.READY;

		const [created] = await db
			.insert(tournamentMatch)
			.values({
				tournamentId,
				roundId: round.id,
				bracketPosition: slot.bracketPosition,
				team1Id: team1Id,
				team2Id: team2Id,
				state
			})
			.returning();

		const key = `${slot.bracketType}-${slot.roundIndex}-${slot.bracketPosition}`;
		slotToMatchId.set(key, created.id);
	}

	// second pass: link progression
	for (const slot of bracketSlots) {
		const key = `${slot.bracketType}-${slot.roundIndex}-${slot.bracketPosition}`;
		const matchId = slotToMatchId.get(key);
		if (!matchId) continue;

		const updates: Record<string, unknown> = {};

		if (slot.winnerGoesTo) {
			const targetKey = `${slot.winnerGoesTo.roundIndex === 0 && slot.bracketType !== 'grand_final' ? slot.bracketType : slot.winnerGoesTo.roundIndex >= 0 ? '' : ''}`;
			// determine target bracket type from the slot's winnerGoesTo
			let targetBracketType = slot.bracketType;
			if (
				slot.bracketType === 'winners' &&
				slot.roundIndex ===
					Math.log2(
						nextPowerOf2(bracketSlots.filter((s) => s.bracketType === 'winners').length + 1)
					) -
						1
			) {
				targetBracketType = 'grand_final';
			}
			if (slot.bracketType === 'losers') {
				const maxLbRound = Math.max(
					...bracketSlots.filter((s) => s.bracketType === 'losers').map((s) => s.roundIndex)
				);
				if (slot.roundIndex === maxLbRound) {
					targetBracketType = 'grand_final';
				}
			}

			// actually, the winnerGoesTo already encodes which round/position, we just need to find the bracket type
			// the bracket generator already set winnerGoesTo correctly, we need to figure out the target bracket type
			// for WB final → GF: winnerGoesTo points to GF roundIndex 0
			// for LB final → GF: winnerGoesTo points to GF roundIndex 0
			// for GF1 → GF2: winnerGoesTo points to GF roundIndex 1

			// let's use a simpler approach: try all bracket types
			const wgt = slot.winnerGoesTo;
			let targetId: string | undefined;
			for (const bt of ['winners', 'losers', 'grand_final'] as const) {
				const tKey = `${bt}-${wgt.roundIndex}-${wgt.bracketPosition}`;
				targetId = slotToMatchId.get(tKey);
				if (targetId) break;
			}
			if (targetId) {
				updates.winnerGoesToId = targetId;
				updates.winnerSlot = wgt.slot;
			}
		}

		if (slot.loserGoesTo) {
			const lgt = slot.loserGoesTo;
			let targetId: string | undefined;
			for (const bt of ['winners', 'losers', 'grand_final'] as const) {
				const tKey = `${bt}-${lgt.roundIndex}-${lgt.bracketPosition}`;
				targetId = slotToMatchId.get(tKey);
				if (targetId) break;
			}
			if (targetId) {
				updates.loserGoesToId = targetId;
				updates.loserSlot = lgt.slot;
			}
		}

		if (Object.keys(updates).length > 0) {
			await db.update(tournamentMatch).set(updates).where(eq(tournamentMatch.id, matchId));
		}
	}
}

// ── Internal: Generate Groups + Bracket ────────────────────────────────

async function generateGroupsAndBracket(
	tournamentId: string,
	teamCount: number,
	config: TournamentConfig,
	seedToTeam: Map<number, string>
) {
	const { groupCount, advanceCount } = config.groupStage!;
	const { groups, matches } = generateGroupStageMatches(teamCount, groupCount);

	// get or create group stage round
	const existingRounds = await db.query.tournamentRound.findMany({
		where: and(
			eq(tournamentRound.tournamentId, tournamentId),
			eq(tournamentRound.bracketType, 'group')
		)
	});

	let groupRound: { id: string };
	if (existingRounds.length > 0) {
		groupRound = existingRounds[0];
	} else {
		const [created] = await db
			.insert(tournamentRound)
			.values({
				tournamentId,
				name: 'Group Stage',
				abbreviation: 'GS',
				roundOrder: 0,
				bestOf: 5, // default, can be configured per round
				bracketType: 'group'
			})
			.returning();
		groupRound = created;
	}

	// create groups and entries
	for (const group of groups) {
		const [createdGroup] = await db
			.insert(tournamentGroup)
			.values({
				tournamentId,
				name: `Group ${String.fromCharCode(65 + group.groupIndex)}`,
				groupOrder: group.groupIndex
			})
			.returning();

		for (let i = 0; i < group.teamSeeds.length; i++) {
			const teamId = seedToTeam.get(group.teamSeeds[i]);
			if (!teamId) continue;

			await db.insert(tournamentGroupEntry).values({
				groupId: createdGroup.id,
				teamId,
				seed: i + 1
			});
		}
	}

	// create group stage matches
	let position = 0;
	for (const gm of matches) {
		const team1Id = seedToTeam.get(gm.team1Seed) ?? null;
		const team2Id = seedToTeam.get(gm.team2Seed) ?? null;

		await db.insert(tournamentMatch).values({
			tournamentId,
			roundId: groupRound.id,
			bracketPosition: position++,
			team1Id,
			team2Id,
			state: team1Id && team2Id ? TOURNAMENT_MATCH_STATES.READY : TOURNAMENT_MATCH_STATES.PENDING
		});
	}

	// bracket stage will be generated after groups finish
	// (via progression.ts when all group matches are done)
}

// ── Internal: Get or Create Rounds ─────────────────────────────────────

async function getOrCreateRounds(
	tournamentId: string,
	count: number,
	bracketType: string
): Promise<{ id: string }[]> {
	const existing = await db.query.tournamentRound.findMany({
		where: and(
			eq(tournamentRound.tournamentId, tournamentId),
			eq(tournamentRound.bracketType, bracketType)
		),
		orderBy: [asc(tournamentRound.roundOrder)]
	});

	if (existing.length >= count) {
		return existing.slice(0, count);
	}

	const rounds: { id: string }[] = [...existing];

	for (let i = existing.length; i < count; i++) {
		// calculate matches in this round for naming
		const bracketSize = 1 << count; // 2^count for winners
		const matchesInRound = bracketType === 'grand_final' ? 1 : bracketSize / (2 << i);

		const name =
			bracketType === 'grand_final'
				? i === 0
					? 'Grand Finals'
					: 'Grand Finals (Reset)'
				: getRoundName(
						Math.max(matchesInRound, 1),
						bracketType as 'winners' | 'losers' | 'grand_final'
					);

		const prefix = bracketType === 'winners' ? 'WB' : bracketType === 'losers' ? 'LB' : 'GF';

		const [created] = await db
			.insert(tournamentRound)
			.values({
				tournamentId,
				name,
				abbreviation: `${prefix}${i + 1}`,
				roundOrder: rounds.length,
				bestOf: 5, // default, organizer can change later
				bracketType
			})
			.returning();

		rounds.push(created);
	}

	return rounds;
}

// ── Internal: Insert Bracket Matches (for single elim) ─────────────────

async function insertBracketMatches(
	tournamentId: string,
	bracketSlots: BracketSlot[],
	rounds: { id: string }[],
	seedToTeam: Map<number, string>,
	bracketType: string
) {
	// first pass: create all matches
	const slotToMatchId = new Map<string, string>();

	for (const slot of bracketSlots) {
		if (slot.bracketType !== bracketType) continue;

		const round = rounds[slot.roundIndex];
		if (!round) continue;

		const team1Id = slot.team1Seed ? (seedToTeam.get(slot.team1Seed) ?? null) : null;
		const team2Id = slot.team2Seed ? (seedToTeam.get(slot.team2Seed) ?? null) : null;
		const isBye = slot.isBye;

		let state: string = TOURNAMENT_MATCH_STATES.PENDING;
		if (isBye) state = TOURNAMENT_MATCH_STATES.BYE;
		else if (team1Id && team2Id) state = TOURNAMENT_MATCH_STATES.READY;

		const [created] = await db
			.insert(tournamentMatch)
			.values({
				tournamentId,
				roundId: round.id,
				bracketPosition: slot.bracketPosition,
				team1Id,
				team2Id,
				state
			})
			.returning();

		const key = `${slot.roundIndex}-${slot.bracketPosition}`;
		slotToMatchId.set(key, created.id);
	}

	// second pass: link progression
	for (const slot of bracketSlots) {
		if (slot.bracketType !== bracketType) continue;

		const key = `${slot.roundIndex}-${slot.bracketPosition}`;
		const matchId = slotToMatchId.get(key);
		if (!matchId) continue;

		const updates: Record<string, unknown> = {};

		if (slot.winnerGoesTo) {
			const targetKey = `${slot.winnerGoesTo.roundIndex}-${slot.winnerGoesTo.bracketPosition}`;
			const targetId = slotToMatchId.get(targetKey);
			if (targetId) {
				updates.winnerGoesToId = targetId;
				updates.winnerSlot = slot.winnerGoesTo.slot;
			}
		}

		if (Object.keys(updates).length > 0) {
			await db.update(tournamentMatch).set(updates).where(eq(tournamentMatch.id, matchId));
		}
	}
}

// ── Helpers ────────────────────────────────────────────────────────────

export async function getTournamentOrThrow(tournamentId: string) {
	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, tournamentId)
	});
	if (!t) throw new Error('Tournament not found');
	return t;
}

export function assertTournamentState(current: string, expected: string) {
	if (current !== expected) {
		throw new Error(`Tournament is in state ${current}, expected ${expected}`);
	}
}

export async function getTournamentFull(tournamentId: string) {
	return db.query.tournament.findFirst({
		where: eq(tournament.id, tournamentId),
		with: {
			rounds: {
				orderBy: [asc(tournamentRound.roundOrder)]
			},
			registrations: true,
			matches: true,
			groups: {
				with: { entries: true }
			},
			staff: true
		}
	});
}
