import { db } from '$lib/server/db';
import { match } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export function getExpectedPicker(
	participants: { id: string; pickOrder: number | null; score: number }[],
	gameCount: number
) {
	const sorted = [...participants].sort((a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99));
	const pickerIndex = gameCount % sorted.length;
	return sorted[pickerIndex];
}

export async function getMatchFull(matchId: string) {
	const m = await db.query.match.findFirst({
		where: eq(match.id, matchId),
		with: {
			mappool: {
				with: { slots: true }
			},
			participants: {
				with: {
					team: true,
					players: true
				}
			},
			games: {
				with: {
					slot: true,
					scores: {
						with: { player: true },
						orderBy: (s, { desc }) => [desc(s.score)]
					}
				},
				orderBy: (g, { asc }) => [asc(g.gameNumber)]
			}
		}
	});

	if (!m) throw new Error('Match not found');
	return m;
}

export async function getMatchOrThrow(matchId: string) {
	const m = await db.query.match.findFirst({
		where: eq(match.id, matchId)
	});
	if (!m) throw new Error('Match not found');
	return m;
}

export function assertState(current: string, expected: string) {
	if (current !== expected) {
		throw new Error(`Match is ${current}, expected ${expected}`);
	}
}
