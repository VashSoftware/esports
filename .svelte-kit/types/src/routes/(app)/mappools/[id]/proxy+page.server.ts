// @ts-nocheck
import { db } from '$lib/server/db';
import { mappool, mappoolSlot } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { getBeatmap } from '$lib/server/osu/api';
import { requireAuth, requireOwnerOrAdmin } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load = async ({ params, locals }: Parameters<PageServerLoad>[0]) => {
	requireAuth(locals);

	const pool = await db.query.mappool.findFirst({
		where: eq(mappool.id, params.id),
		with: {
			slots: {
				orderBy: (s, { asc }) => [asc(s.category), asc(s.orderInCategory)]
			}
		}
	});

	if (!pool) error(404, 'Mappool not found');

	// Fetch beatmap metadata for all slots
	const slotsWithBeatmaps = await Promise.all(
		pool.slots.map(async (slot) => {
			try {
				const beatmap = await getBeatmap(slot.beatmapId);
				return {
					...slot,
					beatmap: {
						title: beatmap.beatmapset.title,
						artist: beatmap.beatmapset.artist,
						version: beatmap.version,
						starRating: beatmap.difficulty_rating,
						bpm: beatmap.bpm,
						totalLength: beatmap.total_length,
						coverUrl: beatmap.beatmapset.covers['card@2x'],
						url: beatmap.url
					}
				};
			} catch {
				return { ...slot, beatmap: null };
			}
		})
	);

	const isOwner = pool.createdBy === locals.user!.id;
	const isAdmin = locals.user!.role === 'admin';

	return {
		pool: { ...pool, slots: slotsWithBeatmaps },
		canEdit: isOwner || isAdmin
	};
};

export const actions = {
	rename: async ({ params, request, locals }: import('./$types').RequestEvent) => {
		const pool = await db.query.mappool.findFirst({
			where: eq(mappool.id, params.id)
		});
		if (!pool) error(404, 'Mappool not found');
		requireOwnerOrAdmin(locals, pool.createdBy);

		const form = await request.formData();
		const name = form.get('name')?.toString()?.trim();
		if (!name) return { error: 'Name is required' };

		await db.update(mappool).set({ name }).where(eq(mappool.id, params.id));
		return { success: true };
	},

	addSlot: async ({ params, request, locals }: import('./$types').RequestEvent) => {
		const pool = await db.query.mappool.findFirst({
			where: eq(mappool.id, params.id)
		});
		if (!pool) error(404, 'Mappool not found');
		requireOwnerOrAdmin(locals, pool.createdBy);

		const form = await request.formData();
		let beatmapId = form.get('beatmapId')?.toString()?.trim();
		const category = form.get('category')?.toString()?.trim()?.toUpperCase();

		if (!beatmapId || !category) {
			return { error: 'Beatmap ID and category are required' };
		}

		const urlMatch = beatmapId.match(/beatmaps\/(\d+)/);
		const setMatch = beatmapId.match(/beatmapsets\/\d+#\w+\/(\d+)/);
		if (urlMatch) beatmapId = urlMatch[1];
		else if (setMatch) beatmapId = setMatch[1];

		if (!/^\d+$/.test(beatmapId)) {
			return { error: 'Invalid beatmap ID' };
		}

		let beatmap;
		try {
			beatmap = await getBeatmap(beatmapId);
		} catch {
			return { error: 'Beatmap not found on osu!' };
		}

		const existing = await db.query.mappoolSlot.findMany({
			where: and(eq(mappoolSlot.mappoolId, params.id), eq(mappoolSlot.category, category))
		});

		await db.insert(mappoolSlot).values({
			mappoolId: params.id,
			beatmapId,
			category,
			orderInCategory: existing.length + 1,
			starRating: beatmap.difficulty_rating,
			mods: category === 'NM' || category === 'TB' || category === 'FM' ? [] : [category]
		});

		return { success: true };
	},

	removeSlot: async ({ params, request, locals }: import('./$types').RequestEvent) => {
		const pool = await db.query.mappool.findFirst({
			where: eq(mappool.id, params.id)
		});
		if (!pool) error(404, 'Mappool not found');
		requireOwnerOrAdmin(locals, pool.createdBy);

		const form = await request.formData();
		const slotId = form.get('slotId')?.toString();
		if (!slotId) return { error: 'Missing slot ID' };

		await db.delete(mappoolSlot).where(eq(mappoolSlot.id, slotId));
		return { success: true };
	},

	deletePool: async ({ params, locals }: import('./$types').RequestEvent) => {
		const pool = await db.query.mappool.findFirst({
			where: eq(mappool.id, params.id)
		});
		if (!pool) error(404, 'Mappool not found');
		requireOwnerOrAdmin(locals, pool.createdBy);

		await db.delete(mappool).where(eq(mappool.id, params.id));
		redirect(303, '/mappools');
	}
};
;null as any as Actions;