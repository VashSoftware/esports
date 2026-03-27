import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { tournamentStaff } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import {
	ROLE_PERMISSIONS,
	TOURNAMENT_ROLE_PERMISSIONS,
	type GlobalPermission,
	type TournamentPermission
} from './constants';

export * from './constants';

// ── Legacy role types (kept for backward compat) ───────────────────────
export type UserRole = 'player' | 'referee' | 'admin';

const ROLE_HIERARCHY: Record<UserRole, number> = {
	player: 0,
	referee: 1,
	admin: 2
};

// ── Permission-based checks (preferred) ────────────────────────────────

export function hasPermission(userRole: string | undefined, permission: GlobalPermission): boolean {
	const perms = ROLE_PERMISSIONS[userRole ?? 'player'];
	return perms?.has(permission) ?? false;
}

export function requirePermission(
	locals: App.Locals,
	permission: GlobalPermission,
	message = 'Insufficient permissions'
) {
	if (!locals.user) {
		error(401, 'Not logged in');
	}
	if (!hasPermission(locals.user.role, permission)) {
		error(403, message);
	}
	return locals.user;
}

export async function requireTournamentPermission(
	tournamentId: string,
	userId: string,
	permission: TournamentPermission,
	message = 'Not authorized for this tournament action'
) {
	const staff = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, tournamentId), eq(tournamentStaff.userId, userId))
	});
	if (!staff) {
		error(403, 'Not a staff member of this tournament');
	}

	const perms = TOURNAMENT_ROLE_PERMISSIONS[staff.role];
	if (!perms?.has(permission)) {
		error(403, message);
	}
	return staff;
}

export async function requireTournamentStaffOrAdmin(
	locals: App.Locals,
	tournamentId: string,
	permission: TournamentPermission,
	message = 'Not authorized for this tournament action'
) {
	const u = requireAuth(locals);
	if (hasRole(u.role, 'admin')) return u;
	await requireTournamentPermission(tournamentId, u.id, permission, message);
	return u;
}

// ── Legacy role-based checks (still functional, prefer permission-based) ─

/** @deprecated Use hasPermission() for granular checks */
export function hasRole(userRole: string | undefined, minRole: UserRole): boolean {
	const level = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
	const required = ROLE_HIERARCHY[minRole];
	return level >= required;
}

/** @deprecated Use requirePermission() for granular checks */
export function requireRole(
	locals: App.Locals,
	minRole: UserRole,
	message = 'Insufficient permissions'
) {
	if (!locals.user) {
		error(401, 'Not logged in');
	}
	if (!hasRole(locals.user.role, minRole)) {
		error(403, message);
	}
}

export function requireAuth(locals: App.Locals) {
	if (!locals.user) {
		error(401, 'Not logged in');
	}
	return locals.user;
}

export function requireOwnerOrAdmin(
	locals: App.Locals,
	ownerId: string | null | undefined,
	message = 'Not authorized'
) {
	const u = requireAuth(locals);
	if (u.id !== ownerId && !hasRole(u.role, 'admin')) {
		error(403, message);
	}
	return u;
}

// ── Root admin ─────────────────────────────────────────────────────────

export function isRootAdmin(email: string | undefined | null): boolean {
	if (!email || !env.ROOT_ADMIN_EMAIL) return false;
	return email.toLowerCase() === env.ROOT_ADMIN_EMAIL.toLowerCase();
}

export async function setUserRole(
	actorLocals: App.Locals,
	targetUserId: string,
	newRole: UserRole
) {
	const actor = requireAuth(actorLocals);

	if (!hasRole(actor.role, 'admin')) {
		error(403, 'Only admins can change roles');
	}

	const target = await db.query.user.findFirst({
		where: eq(user.id, targetUserId)
	});
	if (!target) error(404, 'User not found');

	if (isRootAdmin(target.email)) {
		error(403, "Cannot change the root admin's role");
	}

	if (newRole === 'admin' && !isRootAdmin(actor.email)) {
		error(403, 'Only the root admin can promote users to admin');
	}

	if (target.role === 'admin' && newRole !== 'admin' && !isRootAdmin(actor.email)) {
		error(403, 'Only the root admin can demote admins');
	}

	await db.update(user).set({ role: newRole }).where(eq(user.id, targetUserId));
}

export async function getUserRole(userId: string): Promise<UserRole> {
	const u = await db.query.user.findFirst({
		where: eq(user.id, userId)
	});
	return (u?.role as UserRole) ?? 'player';
}

export async function ensureRootAdminRole(userRecord: { id: string; email: string; role: string }) {
	if (isRootAdmin(userRecord.email) && userRecord.role !== 'admin') {
		await db.update(user).set({ role: 'admin' }).where(eq(user.id, userRecord.id));
		return 'admin';
	}
	return userRecord.role;
}
