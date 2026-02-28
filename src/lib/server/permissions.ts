import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export type UserRole = 'player' | 'referee' | 'admin';

const ROLE_HIERARCHY: Record<UserRole, number> = {
	player: 0,
	referee: 1,
	admin: 2
};

/**
 * Check if a role meets the minimum required level.
 */
export function hasRole(userRole: string | undefined, minRole: UserRole): boolean {
	const level = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
	const required = ROLE_HIERARCHY[minRole];
	return level >= required;
}

/**
 * Check if a user is the root admin (set via ROOT_ADMIN_EMAIL env var).
 * The root admin can never be demoted and is the only one who can promote others to admin.
 */
export function isRootAdmin(email: string | undefined | null): boolean {
	if (!email || !env.ROOT_ADMIN_EMAIL) return false;
	return email.toLowerCase() === env.ROOT_ADMIN_EMAIL.toLowerCase();
}

/**
 * Throw 401/403 if user doesn't have the required role.
 */
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

/**
 * Throw 401 if not logged in. Returns the user for convenience.
 */
export function requireAuth(locals: App.Locals) {
	if (!locals.user) {
		error(401, 'Not logged in');
	}
	return locals.user;
}

/**
 * Check that the current user owns the resource OR is an admin.
 */
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

/**
 * Promote/demote a user's global role with full safety checks.
 *  - Only admins can change roles
 *  - Only root admin can promote TO admin or demote FROM admin
 *  - Root admin cannot be demoted by anyone
 */
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

	// Protect root admin from demotion
	if (isRootAdmin(target.email)) {
		error(403, "Cannot change the root admin's role");
	}

	// Only root admin can promote TO admin
	if (newRole === 'admin' && !isRootAdmin(actor.email)) {
		error(403, 'Only the root admin can promote users to admin');
	}

	// Only root admin can demote FROM admin
	if (target.role === 'admin' && newRole !== 'admin' && !isRootAdmin(actor.email)) {
		error(403, 'Only the root admin can demote admins');
	}

	await db.update(user).set({ role: newRole }).where(eq(user.id, targetUserId));
}

/**
 * Get a user's role from the database.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
	const u = await db.query.user.findFirst({
		where: eq(user.id, userId)
	});
	return (u?.role as UserRole) ?? 'player';
}

/**
 * Auto-promote root admin on login if they're still 'player'.
 */
export async function ensureRootAdminRole(userRecord: {
	id: string;
	email: string;
	role: string;
}) {
	if (isRootAdmin(userRecord.email) && userRecord.role !== 'admin') {
		await db.update(user).set({ role: 'admin' }).where(eq(user.id, userRecord.id));
		return 'admin';
	}
	return userRecord.role;
}
