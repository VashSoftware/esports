<script lang="ts">
	import type { PageProps } from './$types';
	import './layout.css';

	let { data }: PageProps = $props();

	let joining = $state(false);
	let leaving = $state(false);
	let queueTimer = $state('');
	let queueInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (data.queueStatus?.inQueue && data.queueStatus.joinedAt) {
			const start = new Date(data.queueStatus.joinedAt).getTime();
			queueInterval = setInterval(() => {
				const elapsed = Math.floor((Date.now() - start) / 1000);
				const m = Math.floor(elapsed / 60);
				const s = elapsed % 60;
				queueTimer = `${m}:${s.toString().padStart(2, '0')}`;
			}, 1000);
		}

		return () => {
			if (queueInterval) clearInterval(queueInterval);
		};
	});

	async function joinQueue() {
		joining = true;
		try {
			const res = await fetch('/api/queue', { method: 'POST' });
			const result = await res.json();
			if (result.matched && result.match) {
				window.location.href = `/matches/${result.match.id}`;
			} else {
				window.location.reload();
			}
		} catch {
			joining = false;
		}
	}

	async function leaveQueue() {
		leaving = true;
		await fetch('/api/queue', { method: 'DELETE' });
		window.location.reload();
	}

	function stateLabel(state: string) {
		const map: Record<string, string> = {
			CREATED: 'Created', LOBBY: 'In Lobby', ROLLING: 'Rolling',
			PICKING: 'Picking', PLAYING: 'Playing', FINISHED: 'Finished', CANCELLED: 'Cancelled'
		};
		return map[state] ?? state;
	}

	function stateColor(state: string) {
		const map: Record<string, string> = {
			CREATED: 'text-text-secondary', LOBBY: 'text-yellow-400', ROLLING: 'text-yellow-400',
			PICKING: 'text-blue-400', PLAYING: 'text-green-400', FINISHED: 'text-text-secondary', CANCELLED: 'text-red-400'
		};
		return map[state] ?? 'text-text-secondary';
	}
</script>

<div class="mx-auto max-w-4xl">
	{#if !data.user}
		<div class="mt-20 text-center">
			<h1 class="text-4xl font-800 tracking-tight"><span class="text-accent">VASH</span></h1>
			<p class="mt-3 text-text-secondary">Automated esports match management for osu!</p>
			<a href="/api/auth/osu/login" class="mt-6 inline-block rounded-md bg-accent px-6 py-2.5 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover">
				Sign in with osu!
			</a>
		</div>
	{:else}
		<!-- Stats -->
		<div class="flex items-center gap-6">
			<h1 class="text-2xl font-700 tracking-tight">
				Welcome back, <span class="text-accent">{data.user.name}</span>
			</h1>
			<div class="ml-auto flex items-center gap-4">
				<div class="rounded-lg border border-border bg-surface-800 px-4 py-2 text-center">
					<p class="text-xs text-text-secondary">ELO</p>
					<p class="text-lg font-700 tabular-nums">{data.rating?.elo ?? 1000}</p>
				</div>
				<div class="rounded-lg border border-border bg-surface-800 px-4 py-2 text-center">
					<p class="text-xs text-text-secondary">W / L</p>
					<p class="text-lg font-700 tabular-nums">
						<span class="text-green-400">{data.rating?.wins ?? 0}</span>
						<span class="text-text-secondary">/</span>
						<span class="text-red-400">{data.rating?.losses ?? 0}</span>
					</p>
				</div>
			</div>
		</div>

		<!-- Queue -->
		<div class="mt-6 rounded-lg border border-border bg-surface-800 p-6">
			{#if data.queueStatus?.inQueue}
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-sm font-600">In Queue</h2>
						<p class="mt-1 text-sm text-text-secondary">
							Searching for opponent...
							<span class="ml-2 font-mono text-accent">{queueTimer}</span>
						</p>
						<p class="mt-1 text-xs text-text-secondary">
							{data.queueStatus.queueSize} player{data.queueStatus.queueSize !== 1 ? 's' : ''} in queue
						</p>
					</div>
					<button onclick={leaveQueue} disabled={leaving} class="rounded-md border border-red-500/30 px-4 py-2 text-sm font-600 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50">
						{leaving ? 'Leaving...' : 'Leave Queue'}
					</button>
				</div>
				<div class="mt-4 flex items-center gap-2">
					<div class="relative h-2.5 w-2.5">
						<div class="absolute inset-0 animate-ping rounded-full bg-accent opacity-75"></div>
						<div class="relative h-2.5 w-2.5 rounded-full bg-accent"></div>
					</div>
					<span class="text-xs text-text-secondary">Matchmaking active</span>
				</div>
			{:else}
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-sm font-600">Ranked Queue</h2>
						<p class="mt-1 text-xs text-text-secondary">
							{#if data.poolCount > 0}
								1v1 · Best of 7 ·
								{data.queueStatus?.queueSize ?? 0} searching
							{:else}
								<span class="text-yellow-400">No mappools available — create one first</span>
							{/if}
						</p>
					</div>
					<button onclick={joinQueue} disabled={joining || data.poolCount === 0} class="rounded-md bg-accent px-6 py-2.5 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50">
						{joining ? 'Joining...' : 'Find Match'}
					</button>
				</div>
			{/if}
		</div>

		<!-- Recent Matches -->
		<div class="mt-6">
			<h2 class="text-sm font-600">Recent Matches</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each data.recentMatches as m}
					{@const p1 = m.participants[0]}
					{@const p2 = m.participants[1]}
					{@const isUserP1 = p1?.players.some((pl) => pl.userId === data.user?.id)}
					{@const userP = isUserP1 ? p1 : p2}
					{@const oppP = isUserP1 ? p2 : p1}
					{@const won = m.winnerId === userP?.teamId}
					{@const lost = m.winnerId && m.winnerId !== userP?.teamId}

					<a href="/matches/{m.id}" class="flex items-center gap-4 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/30 hover:bg-surface-700">
						<div class="h-10 w-1 rounded-full {won ? 'bg-green-400' : lost ? 'bg-red-400' : 'bg-text-secondary/30'}"></div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm font-600">{m.name}</span>
								<span class="text-xs {stateColor(m.state)}">{stateLabel(m.state)}</span>
							</div>
							<div class="mt-0.5 text-xs text-text-secondary">
								{userP?.team.name ?? '?'} vs {oppP?.team.name ?? '?'}
							</div>
						</div>
						{#if p1 && p2}
							<div class="flex items-center gap-1 font-mono text-sm font-700 tabular-nums">
								<span class="{isUserP1 ? 'text-accent' : 'text-text-primary'}">{p1.score}</span>
								<span class="text-text-secondary">-</span>
								<span class="{!isUserP1 ? 'text-accent' : 'text-text-primary'}">{p2.score}</span>
							</div>
						{/if}
						<span class="text-xs text-text-secondary">{new Date(m.createdAt).toLocaleDateString()}</span>
					</a>
				{:else}
					<div class="rounded-lg border border-dashed border-border py-8 text-center">
						<p class="text-sm text-text-secondary">No matches yet. Join the queue!</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="mt-6 grid grid-cols-3 gap-4">
			<a href="/matches" class="group rounded-lg border border-border bg-surface-800 p-5 transition-colors hover:border-accent/40 hover:bg-surface-700">
				<div class="text-2xl">⚔</div>
				<h2 class="mt-3 text-sm font-600">All Matches</h2>
				<p class="mt-1 text-xs text-text-secondary">View and manage matches</p>
			</a>
			<a href="/mappools" class="group rounded-lg border border-border bg-surface-800 p-5 transition-colors hover:border-accent/40 hover:bg-surface-700">
				<div class="text-2xl">♫</div>
				<h2 class="mt-3 text-sm font-600">Mappools</h2>
				<p class="mt-1 text-xs text-text-secondary">Build beatmap pools</p>
			</a>
			<a href="/teams" class="group rounded-lg border border-border bg-surface-800 p-5 transition-colors hover:border-accent/40 hover:bg-surface-700">
				<div class="text-2xl">⚑</div>
				<h2 class="mt-3 text-sm font-600">Teams</h2>
				<p class="mt-1 text-xs text-text-secondary">Manage your teams</p>
			</a>
		</div>
	{/if}
</div>
