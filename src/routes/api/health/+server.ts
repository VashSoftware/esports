// src/routes/api/health/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { isBanchoConnected, isBanchoReconnecting, getActiveLobbyCount } from '$lib/server/bancho/client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Check DB connectivity
		await db.execute(sql`SELECT 1`);

		return json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			irc: {
				connected: isBanchoConnected(),
				reconnecting: isBanchoReconnecting(),
				activeLobbies: getActiveLobbyCount(),
				maxLobbies: 4
			}
		});
	} catch (e: any) {
		return json(
			{
				status: 'error',
				error: 'Database connection failed',
				timestamp: new Date().toISOString()
			},
			{ status: 503 }
		);
	}
};
