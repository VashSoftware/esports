import { user } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { getMatchFull, submitRoll, pickMap, cancelMatch } from '$lib/server/match/engine';
import { playPickedMap, closeLobby, forceStartGame } from '$lib/server/match/orchestrator';
import { getLobby } from '$lib/server/bancho/client';
import { error, redirect } from '@sveltejs/kit';
import { getBeatmap } from '$lib/server/osu/api';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';


export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/');

	let m;
	try {
		m = await getMatchFull(params.id);
	} catch {
		error(404, 'Match not found');
	}

	// Build beatmap metadata cache for all slots in the mappool
	const beatmapCache: Record<string, any> = {};
	if (m.mappool?.slots) {
		await Promise.allSettled(
			m.mappool.slots.map(async (slot) => {
				try {
					const bm = await getBeatmap(slot.beatmapId);
					beatmapCache[slot.beatmapId] = {
						title: bm.beatmapset.title,
						artist: bm.beatmapset.artist,
						version: bm.version,
						starRating: bm.difficulty_rating,
						bpm: bm.bpm,
						totalLength: bm.total_length,
						coverUrl: bm.beatmapset.covers['card@2x'],
						listCoverUrl: bm.beatmapset.covers['list@2x']
					};
				} catch { /* skip */ }
			})
		);
	}

	return { match: m, beatmapCache, userId: locals.user.id };
};

export const actions: Actions = {
	reinvite: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');

		const lobby = getLobby(params.id);
		if (!lobby) return { error: 'No active IRC lobby for this match' };

		const m = await getMatchFull(params.id);

		const invited: string[] = [];
		for (const p of m.participants) {
			for (const pl of p.players) {
				const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
				if (u?.name) {
					await lobby.invite(u.name);
					invited.push(u.name);
				}
			}
		}

		return { reinvited: invited };
	},

	roll: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');

		const m = await getMatchFull(params.id);

		// Find the participant linked to the current user
		let myParticipant = m.participants.find((p) =>
			p.players.some((pl) => pl.userId === locals.user!.id)
		);

		if (!myParticipant) {
			return { error: 'You are not in this match' };
		}

		// For same-team testing: if user is on both sides, pick the one that hasn't rolled yet
		if (myParticipant.rollValue !== null) {
			const unrolled = m.participants.find((p) => p.rollValue === null);
			if (unrolled) {
				myParticipant = unrolled;
			} else {
				return { error: 'All participants have already rolled' };
			}
		}

		const value = Math.floor(Math.random() * 100) + 1;
		await submitRoll(params.id, myParticipant.id, value);

		// Announce in IRC lobby
		const lobby = getLobby(params.id);
		if (lobby) {
			lobby.chat(`${myParticipant.team?.name ?? 'Player'} rolled ${value} (via web)`).catch(() => {});

			// Check if all rolled → announce pick order
			const updated = await getMatchFull(params.id);
			if (updated.state === 'PICKING') {
				const sorted = [...updated.participants].sort(
					(a: any, b: any) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
				);
				lobby.chat(
					`Rolls complete! ${sorted[0]?.team.name} picks first. Use !pick <slot> (e.g. !pick NM1) or pick in web UI.`
				).catch(() => {});
			}
		}

		return { rolled: value, participantId: myParticipant.id };
	},

	pick: async ({ params, request, locals }) => {
		if (!locals.user) redirect(302, '/');

		const form = await request.formData();
		const slotId = form.get('slotId')?.toString();
		if (!slotId) return { error: 'No map selected' };

		const m = await getMatchFull(params.id);

		// Find the expected picker based on pick order and game count
		const sorted = [...m.participants].sort(
			(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
		);
		const expectedIdx = m.games.length % sorted.length;
		const expectedPicker = sorted[expectedIdx];

		if (!expectedPicker) return { error: 'Cannot determine picker' };

		try {
			const game = await pickMap(params.id, expectedPicker.id, slotId);

			// Set map + mods in IRC lobby and start game (background)
			playPickedMap(params.id, game.id).catch((err) =>
				console.error('[Match] IRC play failed:', err.message)
			);

			return { picked: true, gameId: game.id };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	forceStart: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');
		await forceStartGame(params.id);
		return { started: true };
	},

	cancel: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');

		await cancelMatch(params.id);
		await closeLobby(params.id);
		redirect(303, '/matches');
	}
};
