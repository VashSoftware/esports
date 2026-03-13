import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { matchInvite, teamMember, notification } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq, and, or, lt, inArray, desc } from 'drizzle-orm';
import { createNotification, markActionedByReference } from '$lib/server/notifications';
import { createMatch } from './engine';
import type { MatchConfig } from './types';
import { sendDM } from '$lib/server/bancho/client';

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createInvite(opts: {
	createdBy: string;
	creatorTeamId: string;
	invitedTeamId: string;
	config: MatchConfig;
	mappoolId: string;
	name?: string;
	message?: string;
	scheduledAt?: Date | null;
}) {
	const { createdBy, creatorTeamId, invitedTeamId, config, mappoolId, name, message, scheduledAt } = opts;

	if (creatorTeamId === invitedTeamId && !dev) {
		throw new Error('Cannot invite your own team');
	}

	// Verify user is on creator team
	const membership = await db.query.teamMember.findFirst({
		where: and(eq(teamMember.userId, createdBy), eq(teamMember.teamId, creatorTeamId))
	});
	if (!membership) throw new Error('You are not a member of the selected team');

	// Verify invited team exists and has members
	const invitedMembers = await db.query.teamMember.findMany({
		where: eq(teamMember.teamId, invitedTeamId)
	});
	if (invitedMembers.length === 0) throw new Error('Invited team has no members');

	const baseTime = scheduledAt ?? new Date();
	const expiresAt = new Date(baseTime.getTime() + DEFAULT_EXPIRY_MS);

	const [invite] = await db
		.insert(matchInvite)
		.values({
			createdBy,
			creatorTeamId,
			invitedTeamId,
			config,
			mappoolId,
			name,
			message,
			scheduledAt,
			expiresAt,
			status: 'pending'
		})
		.returning();

	// Create notification for each invited team member
	const configSummary = `BO${config.bestOf} ${config.teamSizes ? config.teamSizes.join('v') : `${config.teamSize}v${config.teamSize}`} ${config.scoringType}`;
	const title = `Match invite: ${name || configSummary}`;
	const notifMessage = message || `You've been challenged to a ${configSummary} match`;

	for (const member of invitedMembers) {
		await createNotification(member.userId, 'match_invite', title, notifMessage, invite.id);
	}

	// Send Bancho DMs (best-effort)
	for (const member of invitedMembers) {
		const u = await db.query.user.findFirst({
			where: eq(user.id, member.userId)
		});
		if (u?.name) {
			sendDM(
				u.name,
				`Match invite: ${title}. Accept/decline at https://esports.vash.software/matches or reply !accept ${invite.id.slice(0, 8)}`
			).catch(() => {}); // Silent best-effort
		}
	}

	return invite;
}

export async function acceptInvite(inviteId: string, userId: string) {
	await expireStaleInvites();

	const invite = await db.query.matchInvite.findFirst({
		where: eq(matchInvite.id, inviteId),
		with: { creatorTeam: true, invitedTeam: true, mappool: true }
	});

	if (!invite) throw new Error('Invite not found');
	if (invite.status !== 'pending') throw new Error(`Invite is ${invite.status}`);

	// Verify user is on invited team
	const membership = await db.query.teamMember.findFirst({
		where: and(eq(teamMember.userId, userId), eq(teamMember.teamId, invite.invitedTeamId))
	});
	if (!membership) throw new Error('You are not on the invited team');

	// Check if expired
	if (new Date() > invite.expiresAt) {
		await db.update(matchInvite).set({ status: 'expired' }).where(eq(matchInvite.id, inviteId));
		throw new Error('Invite has expired');
	}

	const config = invite.config as MatchConfig;

	// Create the match
	const created = await createMatch({
		name: invite.name || `Custom: ${invite.creatorTeam.name} vs ${invite.invitedTeam.name}`,
		config,
		mappoolId: invite.mappoolId,
		teams: [invite.creatorTeamId, invite.invitedTeamId],
		createdBy: invite.createdBy
	});

	// Update invite
	await db
		.update(matchInvite)
		.set({ status: 'accepted', matchId: created.id, respondedAt: new Date() })
		.where(eq(matchInvite.id, inviteId));

	// Mark notifications as actioned for all invited team members
	const invitedMembers = await db.query.teamMember.findMany({
		where: eq(teamMember.teamId, invite.invitedTeamId)
	});
	for (const member of invitedMembers) {
		await markActionedByReference(inviteId, member.userId);
	}

	// Notify creator
	await createNotification(
		invite.createdBy,
		'invite_accepted',
		`${invite.invitedTeam.name} accepted your match invite`,
		undefined,
		created.id
	);

	// Start lobby if immediate (no scheduledAt)
	if (!invite.scheduledAt) {
		try {
			const { initMatchLobby } = await import('./orchestrator');
			initMatchLobby(created.id).catch((err) => {
				console.error('[Invites] IRC lobby creation failed:', err.message);
			});
		} catch (err: any) {
			console.error('[Invites] Failed to import orchestrator:', err.message);
		}
	}

	return created;
}

export async function declineInvite(inviteId: string, userId: string) {
	const invite = await db.query.matchInvite.findFirst({
		where: eq(matchInvite.id, inviteId),
		with: { invitedTeam: true }
	});

	if (!invite) throw new Error('Invite not found');
	if (invite.status !== 'pending') throw new Error(`Invite is ${invite.status}`);

	const membership = await db.query.teamMember.findFirst({
		where: and(eq(teamMember.userId, userId), eq(teamMember.teamId, invite.invitedTeamId))
	});
	if (!membership) throw new Error('You are not on the invited team');

	await db
		.update(matchInvite)
		.set({ status: 'declined', respondedAt: new Date() })
		.where(eq(matchInvite.id, inviteId));

	// Mark notifications as actioned
	const invitedMembers = await db.query.teamMember.findMany({
		where: eq(teamMember.teamId, invite.invitedTeamId)
	});
	for (const member of invitedMembers) {
		await markActionedByReference(inviteId, member.userId);
	}

	// Notify creator
	await createNotification(
		invite.createdBy,
		'invite_declined',
		`${invite.invitedTeam.name} declined your match invite`,
		undefined,
		inviteId
	);
}

export async function cancelInvite(inviteId: string, userId: string) {
	const invite = await db.query.matchInvite.findFirst({
		where: eq(matchInvite.id, inviteId)
	});

	if (!invite) throw new Error('Invite not found');
	if (invite.status !== 'pending') throw new Error(`Invite is ${invite.status}`);
	if (invite.createdBy !== userId) throw new Error('Only the creator can cancel an invite');

	await db
		.update(matchInvite)
		.set({ status: 'cancelled', respondedAt: new Date() })
		.where(eq(matchInvite.id, inviteId));
}

export async function getInvitesForUser(userId: string) {
	await expireStaleInvites();

	// Find all teams the user belongs to
	const memberships = await db.query.teamMember.findMany({
		where: eq(teamMember.userId, userId)
	});
	const teamIds = memberships.map((m) => m.teamId);
	if (teamIds.length === 0) return { sent: [], received: [] };

	const sent = await db.query.matchInvite.findMany({
		where: eq(matchInvite.createdBy, userId),
		with: { creatorTeam: true, invitedTeam: true, mappool: true },
		orderBy: desc(matchInvite.createdAt),
		limit: 20
	});

	const received = await db.query.matchInvite.findMany({
		where: inArray(matchInvite.invitedTeamId, teamIds),
		with: { creatorTeam: true, invitedTeam: true, mappool: true },
		orderBy: desc(matchInvite.createdAt),
		limit: 20
	});

	return { sent, received };
}

export async function expireStaleInvites() {
	const now = new Date();
	await db
		.update(matchInvite)
		.set({ status: 'expired' })
		.where(and(eq(matchInvite.status, 'pending'), lt(matchInvite.expiresAt, now)));
}
