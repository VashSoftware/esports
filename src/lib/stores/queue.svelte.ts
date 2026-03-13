// Shared queue state — used by Sidebar and Dashboard
import { invalidateAll } from '$app/navigation';

type QueueStatus = {
	inQueue: boolean;
	queueSize: number;
	matchedMatchId?: string | null;
};

const queue = $state({
	status: null as QueueStatus | null,
	loading: false
});

let pollInterval: ReturnType<typeof setInterval> | null = null;

async function fetchQueueStatus() {
	try {
		const res = await fetch('/api/queue');
		if (res.ok) {
			const status: QueueStatus = await res.json();
			const wasInQueue = queue.status?.inQueue;
			queue.status = status;

			if (wasInQueue && !status.inQueue && status.matchedMatchId) {
				await invalidateAll();
			}
		}
	} catch {}
}

async function joinQueue() {
	queue.loading = true;
	try {
		const res = await fetch('/api/queue', { method: 'POST' });
		const result = await res.json();
		if (result.matched && result.match) {
			await invalidateAll();
			queue.status = { inQueue: false, queueSize: 0, matchedMatchId: result.match.id };
			queue.loading = false;
			return;
		}
		await fetchQueueStatus();
	} catch {}
	queue.loading = false;
}

async function leaveQueue() {
	queue.loading = true;
	try {
		await fetch('/api/queue', { method: 'DELETE' });
		await fetchQueueStatus();
	} catch {}
	queue.loading = false;
}

function startPolling() {
	if (pollInterval) return;
	fetchQueueStatus();
	pollInterval = setInterval(fetchQueueStatus, 4000);
}

function stopPolling() {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}

export { queue, fetchQueueStatus, joinQueue, leaveQueue, startPolling, stopPolling };
