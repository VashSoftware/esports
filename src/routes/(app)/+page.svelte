<script lang="ts">
	import { page } from '$app/state';
	import { queue, joinQueue, leaveQueue } from '$lib/stores/queue.svelte';

	const { data } = $props();

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

	function avgSR(mappool: any): string | null {
		const slots = mappool?.slots;
		if (!slots?.length) return null;
		const avg = slots.reduce((s: number, sl: any) => s + (sl.starRating ?? 0), 0) / slots.length;
		return avg.toFixed(2);
	}

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
	<title>Vash Esports</title>
	<meta name="description" content="very cool and awesome automated osu! matchmaking platform" />
	<meta property="og:title" content="Vash Esports" />
	<meta
		property="og:description"
		content="very cool and awesome automated osu! matchmaking platform"
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content="https://esports.vash.software/logo.png" />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<!-- ── LANDING PAGE (not logged in) ── -->
{#if !data.user}
	<div class="flex min-h-[70vh] flex-col items-center justify-center text-center">
		<img src="/logo.png" alt="Vash Esports" class="mb-6 h-16 w-16" />
		<h1 class="font-800 text-4xl tracking-tight">
			Welcome to <span class="font-semibold text-accent">Vash Esports</span>
		</h1>
		<p class="mt-3 max-w-md text-text-secondary">
			a pretty cool automated osu! matchmaking platform.
		</p>
		<p class="mt-3 max-w-md text-text-secondary">
			Please join <a
				href="https://discord.gg/n3mZgWk"
				target="_blank"
				rel="noopener"
				class="text-text-primary underline underline-offset-2 transition-colors hover:text-accent"
				>discord.gg/n3mZgWk</a
			> and give any feedback :)
		</p>
		<a
			href="/login"
			class="font-600 mt-8 rounded-lg bg-accent px-6 py-3 text-surface-900 transition-colors hover:bg-accent-hover"
		>
			Sign in with osu!
		</a>
	</div>

	<!-- ── DASHBOARD (logged in) ── -->
{:else}
	<div class="mx-auto max-w-5xl">
		<div class="rounded-lg border border-border bg-surface-800 p-5">
			<h1 class="font-800 mb-4 text-center text-3xl font-semibold tracking-tight">Vash Esports</h1>
			<p class="mt-2 text-sm leading-relaxed text-text-secondary">
				Press <span class="font-600 text-text-primary">'Find Match'</span> to join the queue to play a
				fully automated osu! match with other players in an ELO-appropriate map pool.
			</p>
			<p class="mt-2 text-sm leading-relaxed text-text-secondary">
				I'll be adding a lot more features soon, like arbitrarily large team sizes, fully automated
				tournaments, automated broadcasting, and more. Please join <a
					href="https://discord.gg/n3mZgWk"
					target="_blank"
					rel="noopener"
					class="text-text-primary underline underline-offset-2 transition-colors hover:text-accent"
					>discord.gg/n3mZgWk</a
				> and give any feedback :)
			</p>
		</div>

		<!-- Stats -->
		<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="font-800 text-2xl text-text-primary tabular-nums">{data.stats.matches}</p>
				<p class="mt-1 text-xs text-text-secondary">Total Matches</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="font-800 text-2xl text-green-400 tabular-nums">{data.stats.finished}</p>
				<p class="mt-1 text-xs text-text-secondary">Completed</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="font-800 text-2xl text-text-primary tabular-nums">{data.stats.teams}</p>
				<p class="mt-1 text-xs text-text-secondary">Teams</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<p class="font-800 text-2xl text-text-primary tabular-nums">{data.stats.mappools}</p>
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
					<h2 class="font-600 text-sm">Live Now (max 4 until osu! gives me bot account lol)</h2>
				</div>
				<div class="mt-3 flex flex-col gap-2">
					{#each data.liveMatches as m}
						{@const p1 = m.participants[0]}
						{@const p2 = m.participants[1]}
						{@const sc = stateConfig[m.state]}
						<a
							href="/matches/{m.id}"
							class="flex items-center gap-4 rounded-lg border border-white/15 bg-surface-800 p-4 transition-all hover:border-white/30 hover:bg-surface-700"
						>
							<div class="flex flex-1 items-center gap-3">
								{#if p1?.team.avatarUrl}
									<img src={p1.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
								{/if}
								<span class="font-600 text-sm">{p1?.team.name ?? '?'}</span>
							</div>
							<div class="flex items-center gap-3">
								<span class="font-800 text-xl tabular-nums">{p1?.score ?? 0}</span>
								<span class="text-xs text-text-secondary">vs</span>
								<span class="font-800 text-xl tabular-nums">{p2?.score ?? 0}</span>
							</div>
							<div class="flex flex-1 items-center justify-end gap-3">
								<span class="font-600 text-sm">{p2?.team.name ?? '?'}</span>
								{#if p2?.team.avatarUrl}
									<img src={p2.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
								{/if}
							</div>
							<span class="font-500 flex items-center gap-1.5 text-xs {sc?.color ?? ''}">
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
					<h2 class="font-600 text-sm">Ranked Queue</h2>
					<p class="mt-0.5 text-xs text-text-secondary">Find a match at your skill level</p>
				</div>
				{#if queue.status?.inQueue}
					<div class="flex items-center gap-3">
						<span class="flex items-center gap-2 text-xs text-yellow-400">
							<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400"></span>
							In queue ({queue.status.queueSize} searching)
						</span>
						<button
							onclick={leaveQueue}
							disabled={queue.loading}
							class="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
						>
							Leave Queue
						</button>
					</div>
				{:else if data.hasActiveMatch}
					<a
						href="/matches/{data.activeMatchId}"
						class="font-600 rounded-md border border-accent/40 px-4 py-2 text-sm text-accent transition-colors hover:bg-accent/10"
					>
						View Active Match →
					</a>
				{:else}
					<button
						onclick={joinQueue}
						disabled={queue.loading}
						class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50"
					>
						{queue.loading ? 'Joining...' : 'Find Match'}
					</button>
				{/if}
			</div>
		</div>

		<div class="mt-8 grid gap-4 lg:grid-cols-3">
			<!-- Quick Actions -->
			<div class="lg:col-span-1">
				<h2 class="font-600 text-sm">Quick Actions</h2>
				<div class="mt-3 flex flex-col gap-2">
					<a
						href="/matches"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 3.5-3.5" /><path
									d="m16.5 22 5-5"
								/><path d="M10 5.5 6 2H3v3l4 4" /></svg
							>
						</span>
						<div>
							<p class="font-600 text-sm">Matches</p>
							<p class="text-xs text-text-secondary">View all matches</p>
						</div>
					</a>
					<a
						href="/mappools"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><circle cx="8" cy="18" r="3" /><path d="M11 18V8l9-1v10" /><circle
									cx="20"
									cy="17"
									r="3"
								/></svg
							>
						</span>
						<div>
							<p class="font-600 text-sm">Mappools</p>
							<p class="text-xs text-text-secondary">Build a pool</p>
						</div>
					</a>
					<a
						href="/teams"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
									cx="9"
									cy="7"
									r="4"
								/><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg
							>
						</span>
						<div>
							<p class="font-600 text-sm">Teams</p>
							<p class="text-xs text-text-secondary">Manage rosters</p>
						</div>
					</a>
					<a
						href="/leaderboard"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"
					>
						<span
							class="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500/10 text-yellow-400"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><line x1="18" y1="20" x2="18" y2="10" /><line
									x1="12"
									y1="20"
									x2="12"
									y2="4"
								/><line x1="6" y1="20" x2="6" y2="14" /></svg
							>
						</span>
						<div>
							<p class="font-600 text-sm">Leaderboard</p>
							<p class="text-xs text-text-secondary">Rankings & stats</p>
						</div>
					</a>
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="lg:col-span-2">
				<h2 class="font-600 text-sm">Recent Matches</h2>
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
									<span class="font-600 text-sm">{p1?.team.name ?? '?'}</span>
									{#if m.state === 'FINISHED'}
										<span
											class="font-700 text-xs tabular-nums {(p1?.score ?? 0) > (p2?.score ?? 0)
												? 'text-green-400'
												: 'text-text-secondary'}">{p1?.score ?? 0}</span
										>
										<span class="text-xs text-text-secondary">-</span>
										<span
											class="font-700 text-xs tabular-nums {(p2?.score ?? 0) > (p1?.score ?? 0)
												? 'text-green-400'
												: 'text-text-secondary'}">{p2?.score ?? 0}</span
										>
									{:else}
										<span class="text-xs text-text-secondary">vs</span>
									{/if}
									<span class="font-600 text-sm">{p2?.team.name ?? '?'}</span>
								</div>
								<p class="mt-0.5 text-xs text-text-secondary">
									{m.name ? `${m.name} · ` : ''}BO{config.bestOf} &middot; {timeAgo(
										m.finishedAt ?? m.createdAt
									)}
								</p>
								{#if m.mappool}
									<p class="text-xs text-text-secondary">
										<button
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												window.location.href = `/mappools/${m.mappool!.id}`;
											}}
											class="hover:text-accent hover:underline">{m.mappool.name}</button
										>{#if avgSR(m.mappool)}
											({avgSR(m.mappool)}★){/if}
									</p>
								{/if}
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
								No matches yet. <a href="/matches" class="text-accent hover:underline">Create one</a
								>
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
