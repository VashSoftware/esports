// src/lib/server/metrics.ts
// In-memory counters for request and query stats.
// Resets on server restart — that's fine for a single-VM setup.

export const metrics = {
	requestCount: 0,
	totalResponseTime: 0,
	slowRequests: 0,
	slowQueries: 0,
	totalQueries: 0,
	totalQueryTime: 0,
	startedAt: Date.now(),

	get avgResponseTime() {
		return this.requestCount > 0 ? Math.round(this.totalResponseTime / this.requestCount) : 0;
	},

	get avgQueryTime() {
		return this.totalQueries > 0 ? Math.round(this.totalQueryTime / this.totalQueries) : 0;
	}
};
