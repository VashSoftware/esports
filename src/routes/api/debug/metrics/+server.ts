import { json, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { metrics } from '$lib/server/metrics';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// In production, require admin role
	if (!dev) {
		if (!locals.user || locals.user.role !== 'admin') {
			throw error(403, 'Forbidden');
		}
	}

	return json({
		uptime: Math.round(process.uptime()),
		startedAt: new Date(metrics.startedAt).toISOString(),
		requests: {
			total: metrics.requestCount,
			avgResponseMs: metrics.avgResponseTime,
			slowRequests: metrics.slowRequests
		},
		database: {
			totalQueries: metrics.totalQueries,
			slowQueries: metrics.slowQueries,
			avgQueryMs: metrics.avgQueryTime
		},
		memory: {
			heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
			heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
			rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
		}
	});
};
