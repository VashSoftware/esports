import { db } from '$lib/server/db';
import { team, teamMember, matchParticipant, profileComment } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq, and, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { requireAuth, requireOwnerOrAdmin } from '$lib/server/permissions';
import { uploadImage } from '$lib/server/storage/r2';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const t = await db.query.team.findFirst({
		where: eq(team.id, params.id),
		with: { members: true }
	});

	if (!t) error(404, 'Team not found');

	// Fetch member user details
	const membersWithUsers = await Promise.all(
		t.members.map(async (m) => {
			const usr = await db.query.user.findFirst({
				where: eq(user.id, m.userId)
			});
			return { ...m, user: usr ? { id: usr.id, name: usr.name, image: usr.image } : null };
		})
	);

	// Fetch recent matches for this team
	const participants = await db.query.matchParticipant.findMany({
		where: eq(matchParticipant.teamId, params.id),
		with: {
			match: {
				with: {
					participants: { with: { team: true } }
				}
			}
		}
	});

	const recentMatches = participants
		.map((p) => p.match)
		.filter((m) => m.state === 'FINISHED' || m.state === 'CANCELLED')
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 20);

	const wins = recentMatches.filter((m) => m.winnerId === params.id).length;
	const losses = recentMatches.filter(
		(m) => m.state === 'FINISHED' && m.winnerId !== params.id
	).length;

	const isOwner = locals.user ? t.ownerId === locals.user.id : false;
	const isAdmin = locals.user?.role === 'admin';

	// Comments
	const comments = await db.query.profileComment.findMany({
		where: and(eq(profileComment.targetType, 'team'), eq(profileComment.targetId, params.id)),
		with: { author: true },
		orderBy: desc(profileComment.createdAt)
	});

	return {
		team: { ...t, members: membersWithUsers },
		recentMatches,
		wins,
		losses,
		canManage: isOwner || isAdmin,
		comments
	};
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const actions: Actions = {
	comment: async ({ params, request, locals }) => {
		const u = requireAuth(locals);
		const form = await request.formData();
		const content = form.get('content')?.toString()?.trim();
		if (!content) return { error: 'Comment cannot be empty' };
		if (content.length > 1000) return { error: 'Comment too long (max 1000 characters)' };

		await db.insert(profileComment).values({
			targetType: 'team',
			targetId: params.id,
			authorId: u.id,
			content
		});

		return { success: true };
	},

	uploadAvatar: async ({ params, request, locals }) => {
		const t = await db.query.team.findFirst({ where: eq(team.id, params.id) });
		if (!t) error(404, 'Team not found');
		requireOwnerOrAdmin(locals, t.ownerId);

		const form = await request.formData();
		const file = form.get('avatar');
		if (!(file instanceof File) || file.size === 0) return { error: 'No file provided' };

		if (!ALLOWED_TYPES.includes(file.type)) {
			return { error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' };
		}
		if (file.size > MAX_AVATAR_SIZE) {
			return { error: 'File too large. Max 2 MB.' };
		}

		const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
		const key = `teams/${params.id}/avatar.${ext}`;
		const buf = await file.arrayBuffer();
		const cdnUrl = await uploadImage(key, buf, file.type);

		if (!cdnUrl) return { error: 'Upload failed. Try again later.' };

		await db.update(team).set({ avatarUrl: cdnUrl }).where(eq(team.id, params.id));
		return { success: true };
	}
};
