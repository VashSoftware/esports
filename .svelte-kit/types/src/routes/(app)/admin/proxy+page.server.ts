// @ts-nocheck
// src/routes/(app)/admin/+page.server.ts
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { playerRating } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect, error } from '@sveltejs/kit';
import { requireRole, setUserRole } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	requireRole(locals, 'admin');

	const users = await db.query.user.findMany({
		orderBy: desc(user.createdAt)
	});

	// Fetch ratings for all users
	const usersWithRatings = await Promise.all(
		users.map(async (u) => {
			const rating = await db.query.playerRating.findFirst({
				where: eq(playerRating.userId, u.id)
			});
			return {
				id: u.id,
				name: u.name,
				email: u.email,
				image: u.image,
				role: u.role ?? 'player',
				createdAt: u.createdAt,
				elo: rating?.elo ?? 1000,
				wins: rating?.wins ?? 0,
				losses: rating?.losses ?? 0
			};
		})
	);

	return { users: usersWithRatings };
};

export const actions = {
	setRole: async ({ request, locals }: import('./$types').RequestEvent) => {
		requireRole(locals, 'admin');

		const form = await request.formData();
		const userId = form.get('userId')?.toString();
		const role = form.get('role')?.toString();

		if (!userId || !role) return { error: 'User ID and role are required' };
		if (!['player', 'referee', 'admin'].includes(role)) {
			return { error: 'Invalid role' };
		}

		// Prevent demoting yourself
		if (userId === locals.user!.id && role !== 'admin') {
			return { error: "You can't demote yourself" };
		}

		await setUserRole(userId, role as any);
		return { success: true };
	}
};
;null as any as Actions;