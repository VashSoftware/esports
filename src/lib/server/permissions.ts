// src/lib/server/permissions.ts
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';

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
 * Throw 403 if user doesn't have the required role.
 * Use in +page.server.ts load/actions.
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
 * Promote/demote a user's global role. Only admins can do this.
 */
export async function setUserRole(userId: string, role: UserRole) {
	await db.update(user).set({ role }).where(eq(user.id, userId));
}

/**
 * Get a user's role from the database (for fresh reads).
 */
export async function getUserRole(userId: string): Promise<UserRole> {
	const u = await db.query.user.findFirst({
		where: eq(user.id, userId)
	});
	return (u?.role as UserRole) ?? 'player';
}
