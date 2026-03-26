import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentStaff } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const staff = await db.query.tournamentStaff.findMany({
		where: eq(tournamentStaff.tournamentId, params.id)
	});
	return json(staff);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// only organizers can add staff
	const actor = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, params.id), eq(tournamentStaff.userId, user.id))
	});
	if (!actor || (actor.role !== 'organizer' && actor.role !== 'admin')) {
		error(403, 'Only organizers can manage staff');
	}

	const body = await request.json();
	if (!body.userId || !body.role) error(400, 'Missing userId or role');

	const validRoles = ['organizer', 'admin', 'referee', 'pooler', 'streamer'];
	if (!validRoles.includes(body.role)) {
		error(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
	}

	try {
		const [created] = await db
			.insert(tournamentStaff)
			.values({
				tournamentId: params.id,
				userId: body.userId,
				role: body.role
			})
			.returning();
		return json(created, { status: 201 });
	} catch (e: any) {
		error(400, 'User is already a staff member');
	}
};
