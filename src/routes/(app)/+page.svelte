<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	const liveStates = ['LOBBY', 'ROLLING', 'PICKING', 'PLAYING'];

	const stateConfig: Record<string, { label: string; color: string; dot?: string }> = {
		CREATED: { label: 'Created', color: 'text-text-secondary' },
		LOBBY: { label: 'In Lobby', color: 'text-yellow-400' },
		ROLLING: { label: 'Rolling', color: 'text-yellow-400', dot: 'bg-yellow-400' },
		PICKING: { label: 'Picking', color: 'text-blue-400', dot: 'bg-blue-400' },
		PLAYING: { label: 'Live', color: 'text-green-400', dot: 'bg-green-400' },
		FINISHED: { label: 'Finished', color: 'text-text-secondary' },
		CANCELLED: { label: 'Cancelled', color: 'text-red-400' }
	};

	// Queue state
	let queueStatus = $state<{
		inQueue: boolean;
		queueSize: number;
		matchedMatchId?: string | null;
	} | null>(null);
	let queueLoading = $state(false);

	async function fetchQueueStatus() {
		try {
			const res = await fetch('/api/queue');
			if (res.ok) {
				const status = await res.json();
				const wasInQueue = queueStatus?.inQueue;
				queueStatus = status;

				// If we were in queue and now got matched, refresh the layout to show the active match banner
				if (wasInQueue && !status.inQueue && status.matchedMatchId) {
					await invalidateAll();
				}
			}
		} catch {}
	}

	async function joinQueue() {
		queueLoading = true;
		try {
			const res = await fetch('/api/queue', { method: 'POST' });
			const result = await res.json();
			if (result.matched && result.match) {
				// Refresh layout to show banner instead of hard redirecting
				await invalidateAll();
				queueStatus = { inQueue: false, queueSize: 0, matchedMatchId: result.match.id };
				queueLoading = false;
				return;
			}
			await fetchQueueStatus();
		} catch {}
		queueLoading = false;
	}

	async function leaveQueue() {
		queueLoading = true;
		try {
			await fetch('/api/queue', { method: 'DELETE' });
			await fetchQueueStatus();
		} catch {}
		queueLoading = false;
	}

	// Poll queue status while on dashboard (faster when in queue)
	$effect(() => {
		if (data.user) {
			fetchQueueStatus();
			const interval = setInterval(fetchQueueStatus, queueStatus?.inQueue ? 2000 : 5000);
			return () => clearInterval(interval);
		}
	});

	function timeAgo(date: string | Date) {
		const d = new Date(date);
		const diff = Date.now() - d.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>Vash Esports — osu! Tournament Platform</title>
	<meta name="description" content="Run osu! tournaments with automated lobbies, live scoring, mappools, and team management. Built for serious competition." />
	<meta property="og:title" content="Vash Esports — osu! Tournament Platform" />
	<meta property="og:description" content="Run osu! tournaments with automated lobbies, live scoring, mappools, and team management." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content="/og-image.png" />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<!-- ── LANDING PAGE (not logged in) ── -->
{#if !data.user}
	<div class="flex min-h-[70vh] flex-col items-center justify-center text-center">
		<div
			class="font-800 mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-2xl text-surface-900"
		>
			V
		</div>
		<h1 class="text-4xl font-800 tracking-tight">
			Welcome to <span class="text-accent">Vash Esports</span>
		</h1>
		<p class="mt-3 max-w-md text-text-secondary">
			Automated tournament match management for osu! — lobbies, mappools, picks, bans, and ELO
			tracking all in one place.
		</p>
		<a
			href="/login"
			class="font-600 mt-8 rounded-lg bg-accent px-6 py-3 text-surface-900 transition-colors hover:bg-accent-hover"
		>
			Sign in with osu!
		</a>
		<p class="mt-4 text-xs text-text-secondary">
			Uses your osu! account. No extra registration needed.
		</p>
	</div>

	<!-- ── DASHBOARD (logged in) ── -->
{:else}
	<div class="mx-auto max-w-5xl">
		<div>
			<h1 class="text-2xl font-700 tracking-tight">
				Welcome back, <span class="text-accent">{data.user.name}</span>
			</h1>
			<p class="mt-1 text-sm text-text-secondary">Automated esports match management for osu!</p>
		</div>

		<!-- Stats -->
		<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="text-2xl font-800 tabular-nums text-text-primary">{data.stats.matches}</p>
				<p class="mt-1 text-xs text-text-secondary">Total Matches</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="text-2xl font-800 tabular-nums text-green-400">{data.stats.finished}</p>
				<p class="mt-1 text-xs text-text-secondary">Completed</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="text-2xl font-800 tabular-nums text-text-primary">{data.stats.teams}</p>
				<p class="mt-1 text-xs text-text-secondary">Teams</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="text-2xl font-800 tabular-nums text-text-primary">{data.stats.mappools}</p>
				<p class="mt-1 text-xs text-text-secondary">Mappools</p>
			</div>
		</div>

		<!-- Live Matches -->
		{#if data.liveMatches.length > 0}
			<div class="mt-8">
				<div class="flex items-center gap-2">
					<div class="relative h-2 w-2">
						<div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div>
						<div class="relative h-2 w-2 rounded-full bg-green-400"></div>
					</div>
					<h2 class="text-sm font-600">Live Now</h2>
				</div>
				<div class="mt-3 flex flex-col gap-2">
					{#each data.liveMatches as m}
						{@const p1 = m.participants[0]}
						{@const p2 = m.participants[1]}
						{@const sc = stateConfig[m.state]}
						<a
							href="/matches/{m.id}"
							class="flex items-center gap-4 rounded-lg border border-green-500/20 bg-surface-800 p-4 transition-all hover:border-green-500/40 hover:bg-surface-700"
						>
							<div class="flex flex-1 items-center gap-3">
								{#if p1?.team.avatarUrl}
									<img src={p1.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
								{/if}
								<span class="text-sm font-600">{p1?.team.name ?? '?'}</span>
							</div>
							<div class="flex items-center gap-3">
								<span class="text-xl font-800 tabular-nums">{p1?.score ?? 0}</span>
								<span class="text-xs text-text-secondary">vs</span>
								<span class="text-xl font-800 tabular-nums">{p2?.score ?? 0}</span>
							</div>
							<div class="flex flex-1 items-center justify-end gap-3">
								<span class="text-sm font-600">{p2?.team.name ?? '?'}</span>
								{#if p2?.team.avatarUrl}
									<img src={p2.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
								{/if}
							</div>
							<span class="flex items-center gap-1.5 text-xs font-500 {sc?.color ?? ''}">
								{#if sc?.dot}
									<span class="h-1.5 w-1.5 rounded-full {sc.dot}"></span>
								{/if}
								{sc?.label}
							</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Queue -->
		<div class="mt-6 rounded-lg border border-border bg-surface-800 p-5">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-sm font-600">Ranked Queue</h2>
					<p class="mt-0.5 text-xs text-text-secondary">Find a match at your skill level</p>
				</div>
				{#if queueStatus?.inQueue}
					<div class="flex items-center gap-3">
						<span class="flex items-center gap-2 text-xs text-yellow-400">
							<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400"></span>
							In queue ({queueStatus.queueSize} searching)
						</span>
						<button
							onclick={leaveQueue}
							disabled={queueLoading}
							class="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
						>
							Leave Queue
						</button>
					</div>
				{:else}
					<button
						onclick={joinQueue}
						disabled={queueLoading}
						class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50"
					>
						{queueLoading ? 'Joining...' : 'Find Match'}
					</button>
				{/if}
			</div>
		</div>

		<div class="mt-8 grid gap-4 lg:grid-cols-3">
			<!-- Quick Actions -->
			<div class="lg:col-span-1">
				<h2 class="text-sm font-600">Quick Actions</h2>
				<div class="mt-3 flex flex-col gap-2">
					<a
						href="/matches"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent"
							>⚔</span
						>
						<div>
							<p class="text-sm font-600">Matches</p>
							<p class="text-xs text-text-secondary">View all matches</p>
						</div>
					</a>
					<a
						href="/mappools"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400"
							>♫</span
						>
						<div>
							<p class="text-sm font-600">Mappools</p>
							<p class="text-xs text-text-secondary">Build a pool</p>
						</div>
					</a>
					<a
						href="/teams"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400"
							>⚑</span
						>
						<div>
							<p class="text-sm font-600">Teams</p>
							<p class="text-xs text-text-secondary">Manage rosters</p>
						</div>
					</a>
					<a
						href="/leaderboard"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500/10 text-yellow-400"
							>🏆</span
						>
						<div>
							<p class="text-sm font-600">Leaderboard</p>
							<p class="text-xs text-text-secondary">Rankings & stats</p>
						</div>
					</a>
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="lg:col-span-2">
				<h2 class="text-sm font-600">Recent Matches</h2>
				<div class="mt-3 flex flex-col gap-2">
					{#each data.recentMatches as m}
						{@const p1 = m.participants[0]}
						{@const p2 = m.participants[1]}
						{@const config = m.config as { bestOf: number }}
						{@const sc = stateConfig[m.state]}
						<a
							href="/matches/{m.id}"
							class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/30 hover:bg-surface-700"
						>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-600">{p1?.team.name ?? '?'}</span>
									{#if m.state === 'FINISHED'}
										<span
											class="text-xs font-700 tabular-nums {(p1?.score ?? 0) > (p2?.score ?? 0)
												? 'text-green-400'
												: 'text-text-secondary'}">{p1?.score ?? 0}</span
										>
										<span class="text-xs text-text-secondary">-</span>
										<span
											class="text-xs font-700 tabular-nums {(p2?.score ?? 0) > (p1?.score ?? 0)
												? 'text-green-400'
												: 'text-text-secondary'}">{p2?.score ?? 0}</span
										>
									{:else}
										<span class="text-xs text-text-secondary">vs</span>
									{/if}
									<span class="text-sm font-600">{p2?.team.name ?? '?'}</span>
								</div>
								<p class="mt-0.5 text-xs text-text-secondary">
									{m.name ? `${m.name} · ` : ''}BO{config.bestOf}
									&middot; {timeAgo(m.finishedAt ?? m.createdAt)}
								</p>
							</div>

							{#if m.state === 'FINISHED' && m.winnerId}
								{@const winner = m.participants.find((p: any) => p.teamId === m.winnerId)}
								<span class="text-xs text-green-400">🏆 {winner?.team.name}</span>
							{/if}

							<span class="text-xs {sc?.color ?? 'text-text-secondary'}">{sc?.label}</span>
						</a>
					{:else}
						<div class="rounded-lg border border-dashed border-border py-8 text-center">
							<p class="text-sm text-text-secondary">
								No matches yet. <a href="/matches" class="text-accent hover:underline"
									>Create one</a
								>
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
