/**
 * Persistent DM command handler.
 * Players can DM the bot in osu! to interact with the system:
 *   !queue  — Join the ranked queue
 *   !leave  — Leave the queue
 *   !elo    — Check your ELO rating
 *   !help   — List available commands
 *
 * Initialized once on server startup via hooks.server.ts.
 */

import { db } from '$lib/server/db';
import { user, playerRating, teamMember, team, matchInvite } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { setDMHandler, sendDM, getClient } from './client';
import { joinQueue, leaveQueue, getQueueStatus } from '../match/queue';
import { acceptInvite, declineInvite, getInvitesForUser } from '../match/invites';

let initialized = false;

/**
 * Call once on server startup to register the DM listener.
 * Safe to call multiple times — only initializes once.
 */
export async function initDMHandler() {
	if (initialized) return;
	initialized = true;

	// Ensure IRC connection is established (this also triggers getClient)
	try {
		await getClient();
	} catch (err: any) {
		console.error('[DM] Failed to connect IRC for DM handler:', err.message);
		return;
	}

	setDMHandler(async (ircUsername: string, message: string) => {
		const text = message.trim();
		if (!text.startsWith('!')) return; // Ignore non-commands

		const [cmd, ...args] = text.split(/\s+/);
		const command = cmd.toLowerCase();

		try {
			switch (command) {
				case '!help':
					await handleHelp(ircUsername);
					break;
				case '!queue':
				case '!q':
					await handleQueue(ircUsername);
					break;
				case '!leave':
					await handleLeave(ircUsername);
					break;
				case '!elo':
				case '!rating':
				case '!rank':
					await handleElo(ircUsername);
					break;
				case '!status':
					await handleStatus(ircUsername);
					break;
				case '!invites':
					await handleInvites(ircUsername);
					break;
				case '!accept':
					await handleAccept(ircUsername, args[0]);
					break;
				case '!decline':
					await handleDecline(ircUsername, args[0]);
					break;
				default:
					await sendDM(ircUsername, `Unknown command: ${command}. Type !help for available commands.`);
			}
		} catch (err: any) {
			console.error(`[DM] Error handling "${text}" from ${ircUsername}:`, err.message);
			await sendDM(ircUsername, `Error: ${err.message}`).catch(() => {});
		}
	});

	console.log('[DM] DM command handler initialized');
}

// ── Resolve IRC username → DB user ──────────────────────────────────────

async function resolveUser(ircUsername: string) {
	// IRC uses underscores for spaces: "Cool Player" → "Cool_Player"
	const normalized = ircUsername.replace(/_/g, ' ').toLowerCase();

	const users = await db.query.user.findMany();
	const match = users.find((u) => u.name?.toLowerCase() === normalized);

	if (!match) {
		throw new Error(
			'Your osu! account is not linked. Please sign up or link your account at https://esports.vash.software/'
		);
	}

	return match;
}

// ── Command Handlers ────────────────────────────────────────────────────

async function handleHelp(ircUsername: string) {
	await sendDM(
		ircUsername,
		'Vash Esports Commands: ' +
			'!queue — Join ranked queue | ' +
			'!leave — Leave queue | ' +
			'!elo — Check your rating | ' +
			'!status — Queue status | ' +
			'!invites — Pending invites | ' +
			'!accept <id> — Accept invite | ' +
			'!decline <id> — Decline invite | ' +
			'!help — This message'
	);
}

async function handleQueue(ircUsername: string) {
	const u = await resolveUser(ircUsername);

	// Check if already in queue
	const status = await getQueueStatus(u.id);
	if (status.inQueue) {
		await sendDM(ircUsername, `You're already in queue (${status.queueSize} searching). Type !leave to exit.`);
		return;
	}

	// Find the user's solo/personal team
	const membership = await db.query.teamMember.findFirst({
		where: eq(teamMember.userId, u.id),
		with: { team: true }
	});

	if (!membership) {
		await sendDM(ircUsername, 'You need a team to queue. Please create one in the web UI first.');
		return;
	}

	const result = await joinQueue(u.id, membership.teamId);

	if (result) {
		// Matched immediately
		await sendDM(
			ircUsername,
			`Match found! You've been matched. Check osu! for the lobby invite or visit the web UI.`
		);
	} else {
		const updated = await getQueueStatus(u.id);
		await sendDM(
			ircUsername,
			`You're in the queue! (${updated.queueSize} searching). You'll get an invite when matched. Type !leave to cancel.`
		);
	}
}

async function handleLeave(ircUsername: string) {
	const u = await resolveUser(ircUsername);

	const status = await getQueueStatus(u.id);
	if (!status.inQueue) {
		await sendDM(ircUsername, "You're not in the queue.");
		return;
	}

	await leaveQueue(u.id);
	await sendDM(ircUsername, 'Left the queue.');
}

async function handleElo(ircUsername: string) {
	const u = await resolveUser(ircUsername);

	const rating = await db.query.playerRating.findFirst({
		where: eq(playerRating.userId, u.id)
	});

	if (!rating) {
		await sendDM(ircUsername, 'No rating yet. Play a ranked match to get placed!');
		return;
	}

	const record = `${rating.wins}W-${rating.losses}L`;
	await sendDM(ircUsername, `${u.name}: ${rating.elo} ELO (${record})`);
}

async function handleStatus(ircUsername: string) {
	const u = await resolveUser(ircUsername);
	const status = await getQueueStatus(u.id);

	if (status.inQueue) {
		await sendDM(ircUsername, `In queue (${status.queueSize} searching). Type !leave to cancel.`);
	} else if (status.matchedMatchId) {
		await sendDM(ircUsername, `You have an active match! Check osu! for the lobby invite.`);
	} else {
		await sendDM(ircUsername, `Not in queue. Type !queue to find a match.`);
	}
}

async function handleInvites(ircUsername: string) {
	const u = await resolveUser(ircUsername);
	const { received } = await getInvitesForUser(u.id);
	const pending = received.filter((i) => i.status === 'pending');

	if (pending.length === 0) {
		await sendDM(ircUsername, 'No pending invites.');
		return;
	}

	const lines = pending.map((i) => {
		const config = i.config as any;
		const shortId = i.id.slice(0, 8);
		return `[${shortId}] ${i.creatorTeam.name} — BO${config.bestOf} ${config.scoringType}`;
	});

	await sendDM(ircUsername, `Pending invites (${pending.length}): ${lines.join(' | ')}. Reply !accept <id> or !decline <id>`);
}

async function handleAccept(ircUsername: string, inviteIdPrefix?: string) {
	if (!inviteIdPrefix) {
		await sendDM(ircUsername, 'Usage: !accept <invite-id>');
		return;
	}

	const u = await resolveUser(ircUsername);
	const { received } = await getInvitesForUser(u.id);
	const invite = received.find((i) => i.id.startsWith(inviteIdPrefix) && i.status === 'pending');

	if (!invite) {
		await sendDM(ircUsername, `No pending invite found matching "${inviteIdPrefix}".`);
		return;
	}

	const match = await acceptInvite(invite.id, u.id);
	await sendDM(ircUsername, `Accepted! Match created. Check osu! for the lobby invite or visit the web UI.`);
}

async function handleDecline(ircUsername: string, inviteIdPrefix?: string) {
	if (!inviteIdPrefix) {
		await sendDM(ircUsername, 'Usage: !decline <invite-id>');
		return;
	}

	const u = await resolveUser(ircUsername);
	const { received } = await getInvitesForUser(u.id);
	const invite = received.find((i) => i.id.startsWith(inviteIdPrefix) && i.status === 'pending');

	if (!invite) {
		await sendDM(ircUsername, `No pending invite found matching "${inviteIdPrefix}".`);
		return;
	}

	await declineInvite(invite.id, u.id);
	await sendDM(ircUsername, 'Invite declined.');
}
