import { db } from '$lib/server/db';
import { mappool, mappoolSlot } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { getBeatmap } from '$lib/server/osu/api';
import { proxyImage } from '$lib/server/storage/r2';
import { requireAuth, requireOwnerOrAdmin } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
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

	// Use cached metadata from DB — only fall back to osu! API for legacy slots
	const slotsWithBeatmaps = await Promise.all(
		pool.slots.map(async (slot) => {
			// Fast path: metadata already stored in DB
			if (slot.title !== null) {
				// Sanitize any stale ppy.sh fallback URLs (image was unavailable when first fetched)
				const coverUrl = slot.coverUrl?.includes('ppy.sh') ? null : (slot.coverUrl ?? null);
				return {
					...slot,
					beatmap: {
						title: slot.title,
						artist: slot.artist ?? '',
						version: slot.version ?? '',
						starRating: slot.starRating ?? 0,
						bpm: slot.bpm ?? 0,
						totalLength: slot.totalLength ?? 0,
						coverUrl,
						url: `https://osu.ppy.sh/beatmaps/${slot.beatmapId}`
					}
				};
			}

			// Slow path: legacy slot without cached metadata — fetch + backfill
			try {
				const beatmap = await getBeatmap(slot.beatmapId);
				const coverUrl = await proxyImage(beatmap.beatmapset.covers['card@2x']);
				const listCoverUrl = await proxyImage(beatmap.beatmapset.covers['list@2x']);

				// Backfill the slot so future loads are instant
				await db
					.update(mappoolSlot)
					.set({
						title: beatmap.beatmapset.title,
						artist: beatmap.beatmapset.artist,
						version: beatmap.version,
						coverUrl,
						listCoverUrl,
						starRating: beatmap.difficulty_rating,
						bpm: beatmap.bpm,
						totalLength: beatmap.total_length
					})
					.where(eq(mappoolSlot.id, slot.id));

				return {
					...slot,
					beatmap: {
						title: beatmap.beatmapset.title,
						artist: beatmap.beatmapset.artist,
						version: beatmap.version,
						starRating: beatmap.difficulty_rating,
						bpm: beatmap.bpm,
						totalLength: beatmap.total_length,
						coverUrl,
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
		canEdit: isOwner || isAdmin,
		isAdmin
	};
};

export const actions: Actions = {
	rename: async ({ params, request, locals }) => {
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

	addSlot: async ({ params, request, locals }) => {
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
		const shortMatch = beatmapId.match(/\/b\/(\d+)/);
		if (urlMatch) beatmapId = urlMatch[1];
		else if (setMatch) beatmapId = setMatch[1];
		else if (shortMatch) beatmapId = shortMatch[1];

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

		// Proxy covers to R2 at insert time — pages never hit osu! again
		let coverUrl: string | null = null;
		let listCoverUrl: string | null = null;
		try {
			coverUrl = await proxyImage(beatmap.beatmapset.covers['card@2x']);
			listCoverUrl = await proxyImage(beatmap.beatmapset.covers['list@2x']);
		} catch (err: any) {
			console.warn('[Mappool] Failed to proxy covers to R2:', err.message);
		}

		await db.insert(mappoolSlot).values({
			mappoolId: params.id,
			beatmapId,
			category,
			orderInCategory: existing.length + 1,
			starRating: beatmap.difficulty_rating,
			bpm: beatmap.bpm,
			totalLength: beatmap.total_length,
			mods: category === 'NM' || category === 'TB' ? [] : [category],
			// Cached metadata — all R2 URLs
			title: beatmap.beatmapset.title,
			artist: beatmap.beatmapset.artist,
			version: beatmap.version,
			coverUrl,
			listCoverUrl
		});

		return { success: true };
	},

	removeSlot: async ({ params, request, locals }) => {
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

	verify: async ({ params, locals }) => {
		requireAuth(locals);
		if (locals.user!.role !== 'admin') error(403, 'Admins only');

		await db
			.update(mappool)
			.set({ verifiedAt: new Date() })
			.where(eq(mappool.id, params.id));

		return { success: true };
	},

	unverify: async ({ params, locals }) => {
		requireAuth(locals);
		if (locals.user!.role !== 'admin') error(403, 'Admins only');

		await db
			.update(mappool)
			.set({ verifiedAt: null })
			.where(eq(mappool.id, params.id));

		return { success: true };
	},

	deletePool: async ({ params, locals }) => {
		const pool = await db.query.mappool.findFirst({
			where: eq(mappool.id, params.id)
		});
		if (!pool) error(404, 'Mappool not found');
		requireOwnerOrAdmin(locals, pool.createdBy);

		await db.delete(mappool).where(eq(mappool.id, params.id));
		redirect(303, '/mappools');
	}
};
