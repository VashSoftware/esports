/**
 * Pure ELO / rating math — no DB, no side effects.
 */

/** Convert an osu! global rank to an initial ELO rating. */
export function rankToElo(rank: number): number {
	if (rank <= 0) return 1000;
	const raw = 3500 - Math.log10(rank) * 500;
	return Math.round(Math.max(0, Math.min(3500, raw)));
}

/** Pick the K-factor based on how many games a player has completed. */
export function getKFactor(gamesPlayed: number): number {
	if (gamesPlayed < 10) return 40;
	if (gamesPlayed < 30) return 32;
	return 24;
}

/** ELO expected-score formula: probability player beats opponent avg. */
export function expectedScore(playerElo: number, opponentAvgElo: number): number {
	return 1 / (1 + Math.pow(10, (opponentAvgElo - playerElo) / 400));
}

/** Compute new ELO after a match result. */
export function computeNewElo(
	playerElo: number,
	opponentAvgElo: number,
	won: boolean,
	gamesPlayed: number
): number {
	const K = getKFactor(gamesPlayed);
	const expected = expectedScore(playerElo, opponentAvgElo);
	const actual = won ? 1 : 0;
	return Math.max(0, Math.round(playerElo + K * (actual - expected)));
}

/** Map an average ELO to a target star-rating for mappool selection. */
export function eloToTargetStars(avgElo: number): number {
	return 2 + avgElo / 700;
}
