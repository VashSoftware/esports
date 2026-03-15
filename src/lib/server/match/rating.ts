import { log } from '$lib/server/logger';
import { db } from '$lib/server/db';
import { playerRating, matchParticipantPlayer } from '$lib/server/db/schema';
import { account } from '$lib/server/db/auth.schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getUser } from '$lib/server/osu/api';
import { rankToElo, computeNewElo } from './rating-math';

// ── Initial Rating ──────────────────────────────────────────────────────

export async function calculateInitialElo(
	userId: string
): Promise<{ elo: number; osuRank: number | null }> {
	const osuAccount = await db.query.account.findFirst({
		where: and(eq(account.userId, userId), eq(account.providerId, 'osu'))
	});

	if (!osuAccount?.accountId) {
		return { elo: 1000, osuRank: null };
	}

	try {
		const osuUser = await getUser(osuAccount.accountId);
		const rank = osuUser?.statistics?.global_rank;

		if (!rank || rank <= 0) {
			return { elo: 1000, osuRank: null };
		}

		return { elo: rankToElo(rank), osuRank: rank };
	} catch (err) {
		log.rating.warn({ err, userId }, 'failed to fetch osu! rank, defaulting to 1000');
		return { elo: 1000, osuRank: null };
	}
}

// ── ELO ─────────────────────────────────────────────────────────────────

export async function updateElo(participants: { id: string; teamId: string }[], winnerId: string) {
	// Gather all players and their ratings per participant (team side)
	const sides = new Map<string, { userId: string; rating: typeof playerRating.$inferSelect }[]>();

	for (const p of participants) {
		const players = await db.query.matchParticipantPlayer.findMany({
			where: eq(matchParticipantPlayer.participantId, p.id)
		});

		const playersWithRatings = [];
		for (const player of players) {
			const rating = await db.query.playerRating.findFirst({
				where: eq(playerRating.userId, player.userId)
			});

			if (!rating) {
				log.rating.warn({ userId: player.userId }, 'no rating found, skipping');
				continue;
			}

			playersWithRatings.push({ userId: player.userId, rating });
		}
		sides.set(p.id, playersWithRatings);
	}

	// Compute average ELO per side for expected-score calculation
	const avgElo = new Map<string, number>();
	for (const [pid, players] of sides) {
		avgElo.set(pid, players.reduce((sum, p) => sum + p.rating.elo, 0) / players.length);
	}

	// Update each player's ELO using proper expected-score formula
	for (const p of participants) {
		const isWinner = p.id === winnerId;
		const opponent = participants.find((op) => op.id !== p.id)!;
		const opponentAvg = avgElo.get(opponent.id)!;

		for (const { userId, rating } of sides.get(p.id)!) {
			const gamesPlayed = rating.wins + rating.losses;
			const newElo = computeNewElo(rating.elo, opponentAvg, isWinner, gamesPlayed);

			await db
				.update(playerRating)
				.set({
					elo: newElo,
					wins: isWinner ? rating.wins + 1 : rating.wins,
					losses: isWinner ? rating.losses : rating.losses + 1,
					updatedAt: new Date()
				})
				.where(eq(playerRating.userId, userId));
		}
	}
}

// ── Mappool Selection ───────────────────────────────────────────────────

export async function selectMappoolForRating(avgElo: number) {
	// Only use verified mappools
	const pools = await db.query.mappool.findMany({
		where: (m) => isNotNull(m.verifiedAt),
		with: { slots: true }
	});

	if (pools.length === 0) return null;

	// Map ELO range (0-3500) to star rating range (2-8)
	const targetStars = 2 + avgElo / 700;
	const clampedTarget = Math.max(2, Math.min(8, targetStars));

	// Score each pool by distance from target
	const scored = pools
		.filter((p) => p.slots.length > 0)
		.map((p) => {
			const avgStars = p.slots.reduce((sum, s) => sum + (s.starRating ?? 0), 0) / p.slots.length;
			return { pool: p, diff: Math.abs(avgStars - clampedTarget) };
		})
		.sort((a, b) => a.diff - b.diff);

	if (scored.length === 0) return null;

	// Allow any pool within 1 star of the closest match, then pick randomly
	const threshold = scored[0].diff + 1.0;
	const candidates = scored.filter((s) => s.diff <= threshold);
	return candidates[Math.floor(Math.random() * candidates.length)].pool;
}
