/**
 * Pure queue matching math — no DB, no side effects.
 */

/** Compute the average star-rating of a mappool's slots. */
export function getAverageMappoolSR(slots: { starRating: number | null }[]): number {
	if (slots.length === 0) return 0;
	return slots.reduce((acc, slot) => acc + (slot.starRating ?? 0), 0) / slots.length;
}

/** Find the index pair with the smallest ELO gap in a sorted list. */
export function findClosestPair<T extends { elo: number }>(queue: T[]): [T, T] | null {
	if (queue.length < 2) return null;

	let bestPair: [T, T] | null = null;
	let smallestGap = Infinity;

	for (let i = 0; i < queue.length - 1; i++) {
		const gap = Math.abs(queue[i].elo - queue[i + 1].elo);
		if (gap < smallestGap) {
			smallestGap = gap;
			bestPair = [queue[i], queue[i + 1]];
		}
	}

	return bestPair;
}

/**
 * Score a list of mappools against a target star-rating and return
 * the best match. Picks the pool with the smallest distance to target.
 * If multiple pools are within 1 star of the best, returns any of them.
 */
export function scoreMappools<T extends { slots: { starRating: number | null }[] }>(
	pools: T[],
	targetStars: number
): T | null {
	const nonEmpty = pools.filter((p) => p.slots.length > 0);
	if (nonEmpty.length === 0) return null;

	let bestPool = nonEmpty[0];
	let bestDiff = Math.abs(getAverageMappoolSR(bestPool.slots) - targetStars);

	for (let i = 1; i < nonEmpty.length; i++) {
		const diff = Math.abs(getAverageMappoolSR(nonEmpty[i].slots) - targetStars);
		if (diff < bestDiff) {
			bestDiff = diff;
			bestPool = nonEmpty[i];
		}
	}

	return bestPool;
}
