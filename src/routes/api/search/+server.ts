import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { team, mappool, tournament, match } from '$lib/server/db/schema';
import { ilike, and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) return json({ results: {} });

	const pattern = `%${q}%`;
	const limit = 5;

	const [users, teams, mappools, tournaments, matches] = await Promise.all([
		db
			.select({ id: user.id, name: user.name, image: user.image })
			.from(user)
			.where(ilike(user.name, pattern))
			.limit(limit),
		db
			.select({ id: team.id, name: team.name, avatarUrl: team.avatarUrl })
			.from(team)
			.where(and(ilike(team.name, pattern), eq(team.isPersonal, false)))
			.limit(limit),
		db
			.select({ id: mappool.id, name: mappool.name })
			.from(mappool)
			.where(ilike(mappool.name, pattern))
			.limit(limit),
		db
			.select({ id: tournament.id, name: tournament.name, state: tournament.state })
			.from(tournament)
			.where(ilike(tournament.name, pattern))
			.limit(limit),
		db
			.select({ id: match.id, name: match.name, state: match.state })
			.from(match)
			.where(ilike(match.name, pattern))
			.limit(limit)
	]);

	return json({
		results: {
			users: users.map((u) => ({ ...u, type: 'user', href: `/users/${u.id}` })),
			teams: teams.map((t) => ({ ...t, type: 'team', href: `/teams/${t.id}` })),
			mappools: mappools.map((m) => ({ ...m, type: 'mappool', href: `/mappools/${m.id}` })),
			tournaments: tournaments.map((t) => ({
				...t,
				type: 'tournament',
				href: `/tournaments/${t.id}`
			})),
			matches: matches.map((m) => ({ ...m, type: 'match', href: `/matches/${m.id}` }))
		}
	});
};
