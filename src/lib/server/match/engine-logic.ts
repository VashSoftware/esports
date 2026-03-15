/**
 * Pure match engine logic — no DB, no side effects.
 */

/** Check if all participants are at match point (winsNeeded - 1). */
export function isMatchPoint(scores: number[], winsNeeded: number): boolean {
	return scores.every((s) => s === winsNeeded - 1);
}

/** Validate a map pick against tiebreaker rules. Returns an error string or null. */
export function validateTiebreakerPick(
	slotCategory: string | null,
	allAtMatchPoint: boolean
): string | null {
	if (slotCategory === 'TB' && !allAtMatchPoint) {
		return 'Tiebreaker can only be picked at match point';
	}
	if (allAtMatchPoint && slotCategory !== 'TB') {
		return 'Only tiebreaker maps can be picked at match point';
	}
	return null;
}

/**
 * Given per-participant aggregate scores for a game,
 * return the participant ID with the highest total, or null on empty input.
 */
export function determineGameWinner(participantScores: Map<string, number>): string | null {
	let winnerId: string | null = null;
	let highScore = -1;

	for (const [pid, total] of participantScores) {
		if (total > highScore) {
			highScore = total;
			winnerId = pid;
		}
	}

	return winnerId;
}

/**
 * Detect a tie in roll values — returns true if any two participants
 * rolled the same value.
 */
export function hasRollTie(rollValues: number[]): boolean {
	return new Set(rollValues).size < rollValues.length;
}

/**
 * Sort participants by roll value descending and return pick-order assignments.
 * Returns array of { participantId, pickOrder }.
 */
export function assignPickOrder(
	rolls: { id: string; rollValue: number }[]
): { participantId: string; pickOrder: number }[] {
	const sorted = [...rolls].sort((a, b) => b.rollValue - a.rollValue);
	return sorted.map((r, i) => ({ participantId: r.id, pickOrder: i + 1 }));
}

/** Calculate wins needed from bestOf config. */
export function winsNeeded(bestOf: number): number {
	return Math.ceil(bestOf / 2);
}
