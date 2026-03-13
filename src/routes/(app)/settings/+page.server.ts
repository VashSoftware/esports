// src/routes/(app)/settings/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { playerRating } from '$lib/server/db/schema';
import { account } from '$lib/server/db/auth.schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/');

	// Get player rating
	const rating = await db.query.playerRating.findFirst({
		where: eq(playerRating.userId, locals.user.id)
	});

	// Get linked osu! account info
	const osuAccount = await db.query.account.findFirst({
		where: and(eq(account.userId, locals.user.id), eq(account.providerId, 'osu'))
	});

	return {
		profile: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			image: locals.user.image,
			role: locals.user.role ?? 'player',
			createdAt: locals.user.createdAt
		},
		rating: rating ? { elo: rating.elo, wins: rating.wins, losses: rating.losses } : null,
		hasOsuLinked: !!osuAccount
	};
};

export const actions: Actions = {
	logout: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect(302, '/');
	}
};
