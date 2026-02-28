// src/routes/(app)/admin/+page.server.ts
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { playerRating } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireRole, setUserRole, isRootAdmin } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	const users = await db.query.user.findMany({
		orderBy: desc(user.createdAt)
	});

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
				losses: rating?.losses ?? 0,
				isRootAdmin: isRootAdmin(u.email)
			};
		})
	);

	return {
		users: usersWithRatings,
		actorIsRootAdmin: isRootAdmin(locals.user!.email)
	};
};

export const actions: Actions = {
	setRole: async ({ request, locals }) => {
		requireRole(locals, 'admin');

		const form = await request.formData();
		const userId = form.get('userId')?.toString();
		const role = form.get('role')?.toString();

		if (!userId || !role) return { error: 'User ID and role are required' };
		if (!['player', 'referee', 'admin'].includes(role)) {
			return { error: 'Invalid role' };
		}

		try {
			await setUserRole(locals, userId, role as any);
		} catch (e: any) {
			// setUserRole throws SvelteKit errors; extract the message
			return { error: e.body?.message ?? e.message ?? 'Failed to update role' };
		}

		return { success: true };
	}
};
