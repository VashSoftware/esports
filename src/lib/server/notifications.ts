import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function createNotification(
	userId: string,
	type: string,
	title: string,
	message?: string,
	referenceId?: string
) {
	const [n] = await db
		.insert(notification)
		.values({ userId, type, title, message, referenceId })
		.returning();
	return n;
}

export async function getUnreadCount(userId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)` })
		.from(notification)
		.where(and(eq(notification.userId, userId), eq(notification.read, false)));
	return Number(row.count);
}

export async function getNotifications(userId: string, opts?: { limit?: number; offset?: number }) {
	return db.query.notification.findMany({
		where: eq(notification.userId, userId),
		orderBy: desc(notification.createdAt),
		limit: opts?.limit ?? 50,
		offset: opts?.offset ?? 0
	});
}

export async function markRead(notificationId: string, userId: string) {
	await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.id, notificationId), eq(notification.userId, userId)));
}

export async function markAllRead(userId: string) {
	await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.userId, userId), eq(notification.read, false)));
}

export async function markActioned(notificationId: string, userId: string) {
	await db
		.update(notification)
		.set({ read: true, actionedAt: new Date() })
		.where(and(eq(notification.id, notificationId), eq(notification.userId, userId)));
}

export async function markActionedByReference(referenceId: string, userId: string) {
	await db
		.update(notification)
		.set({ read: true, actionedAt: new Date() })
		.where(and(eq(notification.referenceId, referenceId), eq(notification.userId, userId)));
}
