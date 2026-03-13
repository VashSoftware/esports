import { db } from '$lib/server/db';
import {
	match,
	matchParticipant,
	matchParticipantPlayer,
	matchQueue,
	playerRating
} from '$lib/server/db/schema';
import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { MATCH_STATES } from './types';
import { createMatch } from './engine';

const QUEUE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

async function purgeExpiredQueueEntries() {
	const cutoff = new Date(Date.now() - QUEUE_TIMEOUT_MS);
	const deleted = await db.delete(matchQueue).where(lt(matchQueue.joinedAt, cutoff)).returning();

	if (deleted.length > 0) {
		console.log(
			`[Queue] Purged ${deleted.length} expired queue entr${deleted.length === 1 ? 'y' : 'ies'}`
		);
	}
}

export async function joinQueue(userId: string, teamId: string) {
	await purgeExpiredQueueEntries();
	const activeMatchId = await findRecentActiveMatch(userId);
	if (activeMatchId) throw new Error('You are already in an active match');

	const rating = await db.query.playerRating.findFirst({
		where: eq(playerRating.userId, userId)
	});

	if (!rating) throw new Error('No rating found — please re-register');

	const existing = await db.query.matchQueue.findFirst({
		where: eq(matchQueue.userId, userId)
	});

	if (existing) throw new Error('Already in queue');

	await db.insert(matchQueue).values({
		userId,
		teamId,
		elo: rating.elo
	});

	return tryMatchFromQueue();
}

export async function leaveQueue(userId: string) {
	await db.delete(matchQueue).where(eq(matchQueue.userId, userId));
}

export async function getQueueStatus(userId: string) {
	await purgeExpiredQueueEntries();
	const entry = await db.query.matchQueue.findFirst({
		where: eq(matchQueue.userId, userId)
	});

	const count = await db.select({ count: sql<number>`count(*)` }).from(matchQueue);

	// If NOT in queue, check if there's a recent active match for this user
	// (they may have been matched while polling)
	let matchedMatchId: string | null = null;
	if (!entry) {
		matchedMatchId = await findRecentActiveMatch(userId);
	}

	return {
		inQueue: !!entry,
		queueSize: Number(count[0].count),
		joinedAt: entry?.joinedAt ?? null,
		matchedMatchId
	};
}

/**
 * Find a recent active (non-finished) match for this user.
 * Used to redirect players who were matched via queue while polling.
 */
async function findRecentActiveMatch(userId: string): Promise<string | null> {
	const activeStates = [
		MATCH_STATES.CREATED,
		MATCH_STATES.LOBBY,
		MATCH_STATES.ROLLING,
		MATCH_STATES.PICKING,
		MATCH_STATES.PLAYING
	];

	const [activeMatch] = await db
		.select({ id: match.id })
		.from(matchParticipantPlayer)
		.innerJoin(matchParticipant, eq(matchParticipantPlayer.participantId, matchParticipant.id))
		.innerJoin(match, eq(matchParticipant.matchId, match.id))
		.where(and(eq(matchParticipantPlayer.userId, userId), inArray(match.state, activeStates)))
		.orderBy(desc(match.createdAt))
		.limit(1);

	return activeMatch?.id ?? null;
}

const MAX_CONCURRENT_MATCHES = 4;

async function tryMatchFromQueue() {
	// Hard cap: osu! non-bot accounts can only host a limited number of lobbies
	const [{ activeCount }] = await db
		.select({ activeCount: sql<number>`count(*)` })
		.from(match)
		.where(
			inArray(match.state, [
				MATCH_STATES.LOBBY,
				MATCH_STATES.ROLLING,
				MATCH_STATES.PICKING,
				MATCH_STATES.PLAYING
			])
		);

	if (Number(activeCount) >= MAX_CONCURRENT_MATCHES) return null;

	const queue = await db.query.matchQueue.findMany({
		orderBy: asc(matchQueue.elo),
		with: {
			team: true
		}
	});

	if (queue.length < 2) return null;

	// Find closest ELO pair
	let bestPair: [(typeof queue)[0], (typeof queue)[0]] | null = null;
	let smallestGap = Infinity;

	for (let i = 0; i < queue.length - 1; i++) {
		const gap = Math.abs(queue[i].elo - queue[i + 1].elo);
		if (gap < smallestGap) {
			smallestGap = gap;
			bestPair = [queue[i], queue[i + 1]];
		}
	}

	if (!bestPair) return null;

	// Pick mappool based on average player rating
	const avgElo = (bestPair[0].elo + bestPair[1].elo) / 2;
	const selectedPool = await selectMappoolForRating(avgElo);

	if (!selectedPool) throw new Error('No mappools available');

	// Remove both from queue
	await db.delete(matchQueue).where(eq(matchQueue.userId, bestPair[0].userId));
	await db.delete(matchQueue).where(eq(matchQueue.userId, bestPair[1].userId));

	const created = await createMatch({
		name: `VASH: ${bestPair[0].team.name} vs ${bestPair[1].team.name}`,
		config: { bestOf: 5, teamSize: 1, scoringType: 'score_v2' },
		mappoolId: selectedPool.id,
		teams: [bestPair[0].teamId, bestPair[1].teamId],
		createdBy: 'system'
	});

	// Start the IRC lobby in the background
	// Import dynamically to avoid circular dependency
	try {
		const { initMatchLobby } = await import('./orchestrator');
		initMatchLobby(created.id).catch((err) => {
			console.error('[Queue] IRC lobby creation failed:', err.message);
		});
	} catch (err: any) {
		console.error('[Queue] Failed to import orchestrator:', err.message);
	}

	return created;
}

async function selectMappoolForRating(avgElo: number) {
	// Only use verified mappools
	const pools = await db.query.mappool.findMany({
		where: (m, { isNotNull }) => isNotNull(m.verifiedAt),
		with: { slots: true }
	});

	if (pools.length === 0) return null;

	// Map ELO range (0-3500) to star rating range (2-8)
	const targetStars = 2 + avgElo / 700;

	let bestPool = pools[0];
	for (const pool of pools) {
		const avgSR = getAverageMappoolSR(pool);
		const diff = Math.abs(avgSR - targetStars);
		if (diff < Math.abs(getAverageMappoolSR(bestPool) - targetStars)) {
			bestPool = pool;
		}
	}

	return bestPool;
}

function getAverageMappoolSR(pool: { slots: { starRating: number | null }[] }): number {
	return (
		pool.slots.reduce(
			(acc: number, slot: { starRating: number | null }) => acc + (slot.starRating ?? 0),
			0
		) / pool.slots.length
	);
}
