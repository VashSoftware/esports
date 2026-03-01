<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let showCreate = $state(false);
	let createError = $state('');

	const stateConfig: Record<string, { label: string; color: string; dot?: string }> = {
		CREATED: { label: 'Created', color: 'text-text-secondary border-border' },
		LOBBY: { label: 'In Lobby', color: 'text-yellow-400 border-yellow-500/30' },
		ROLLING: {
			label: 'Rolling',
			color: 'text-yellow-400 border-yellow-500/30',
			dot: 'bg-yellow-400'
		},
		PICKING: {
			label: 'Picking',
			color: 'text-blue-400 border-blue-500/30',
			dot: 'bg-blue-400'
		},
		PLAYING: {
			label: 'Live',
			color: 'text-green-400 border-green-500/30',
			dot: 'bg-green-400'
		},
		FINISHED: { label: 'Finished', color: 'text-text-secondary border-border' },
		CANCELLED: { label: 'Cancelled', color: 'text-red-400 border-red-500/30' }
	};

	const liveStates = ['LOBBY', 'ROLLING', 'PICKING', 'PLAYING'];

	const liveMatches = $derived(data.matches.filter((m: any) => liveStates.includes(m.state)));
	const recentMatches = $derived(data.matches.filter((m: any) => !liveStates.includes(m.state)));

	function teamDisplay(m: any) {
		const p1 = m.participants[0];
		const p2 = m.participants[1];
		return { p1, p2 };
	}

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
	<title>Matches — Vash Esports</title>
	<meta name="description" content="Browse all osu! tournament matches on Vash Esports." />
	<meta property="og:title" content="Matches — Vash Esports" />
	<meta property="og:description" content="Browse all osu! tournament matches on Vash Esports." />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-5xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-700 tracking-tight">Matches</h1>
			<p class="mt-1 text-sm text-text-secondary">
				{data.matches.length} match{data.matches.length !== 1 ? 'es' : ''}
				{#if liveMatches.length > 0}
					&middot; <span class="text-green-400">{liveMatches.length} live</span>
				{/if}
			</p>
		</div>
		{#if data.canCreateMatch}
			<button
				onclick={() => (showCreate = !showCreate)}
				class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover"
			>
				{showCreate ? 'Cancel' : 'New Match'}
			</button>
		{/if}
	</div>

	<!-- Create Match Modal -->
	{#if showCreate && data.canCreateMatch}
		<form
			method="post"
			action="?/createMatch"
			use:enhance={() => {
				createError = '';
				return async ({ result, update }) => {
					if (
						result.type === 'failure' ||
						(result.type === 'success' && (result.data as any)?.error)
					) {
						createError = (result.data as any)?.error ?? 'Failed to create match';
					} else {
						await update();
					}
				};
			}}
			class="mt-4 rounded-lg border border-accent/20 bg-surface-800 p-5"
		>
			<h2 class="text-sm font-600">Create Match</h2>

			{#if createError}
				<p class="mt-2 text-sm text-red-400">{createError}</p>
			{/if}

			<div class="mt-4 grid grid-cols-2 gap-4">
				<div>
					<label for="name" class="text-xs font-500 text-text-secondary">Match Name</label>
					<input
						type="text"
						id="name"
						name="name"
						placeholder="e.g. Semifinals M1"
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
					/>
				</div>

				<div>
					<label for="bestOf" class="text-xs font-500 text-text-secondary">Best Of</label>
					<select
						id="bestOf"
						name="bestOf"
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						{#each [3, 5, 7, 9, 11, 13] as n}
							<option value={n} selected={n === 7}>BO{n} (first to {Math.ceil(n / 2)})</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="team1" class="text-xs font-500 text-text-secondary">Team 1</label>
					<select
						id="team1"
						name="team1"
						required
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						<option value="">Select team...</option>
						{#each data.teams as t}
							<option value={t.id}>{t.name}{t.isPersonal ? ' (solo)' : ''}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="team2" class="text-xs font-500 text-text-secondary">Team 2</label>
					<select
						id="team2"
						name="team2"
						required
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						<option value="">Select team...</option>
						{#each data.teams as t}
							<option value={t.id}>{t.name}{t.isPersonal ? ' (solo)' : ''}</option>
						{/each}
					</select>
				</div>

				<div class="col-span-2">
					<label for="mappool" class="text-xs font-500 text-text-secondary">Mappool</label>
					<select
						id="mappool"
						name="mappool"
						required
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						<option value="">Select mappool...</option>
						{#each data.mappools as p}
							<option value={p.id}>{p.name} ({p.slots.length} maps)</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="mt-4 flex justify-end">
				<button
					type="submit"
					class="rounded-md bg-accent px-5 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover"
				>
					Create &amp; Start
				</button>
			</div>
		</form>
	{/if}

	<!-- Live Matches -->
	{#if liveMatches.length > 0}
		<div class="mt-6">
			<h2 class="flex items-center gap-2 text-sm font-600">
				<div class="relative h-2 w-2">
					<div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div>
					<div class="relative h-2 w-2 rounded-full bg-green-400"></div>
				</div>
				Live Now (max 4 until osu! gives me bot account lol)
			</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each liveMatches as m}
					{@const { p1, p2 } = teamDisplay(m)}
					{@const sc = stateConfig[m.state]}
					<a
						href="/matches/{m.id}"
						class="group flex items-center gap-4 rounded-lg border border-white/15 bg-surface-800 p-4 transition-all hover:border-white/30 hover:bg-surface-700"
					>
						<div class="flex flex-1 items-center gap-3">
							{#if p1?.team.avatarUrl}
								<img src={p1.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
							{/if}
							<span class="text-sm font-600">{p1?.team.name ?? '?'}</span>
						</div>

						<div class="flex items-center gap-3">
							<span class="text-xl font-800 tabular-nums">{p1?.score ?? 0}</span>
							<span class="text-xs font-600 text-text-secondary">vs</span>
							<span class="text-xl font-800 tabular-nums">{p2?.score ?? 0}</span>
						</div>

						<div class="flex flex-1 items-center justify-end gap-3">
							<span class="text-sm font-600">{p2?.team.name ?? '?'}</span>
							{#if p2?.team.avatarUrl}
								<img src={p2.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
							{/if}
						</div>

						<span
							class="flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-500 {sc?.color ??
								'border-border'}"
						>
							{#if sc?.dot}
								<span class="h-1.5 w-1.5 rounded-full {sc.dot}"></span>
							{/if}
							{sc?.label ?? m.state}
						</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- All Matches -->
	<div class="mt-6">
		{#if liveMatches.length > 0}
			<h2 class="text-sm font-600 text-text-secondary">Past Matches</h2>
		{/if}
		<div class="mt-3 flex flex-col gap-2">
			{#each recentMatches as m}
				{@const { p1, p2 } = teamDisplay(m)}
				{@const config = m.config as { bestOf: number }}
				{@const sc = stateConfig[m.state]}
				<a
					href="/matches/{m.id}"
					class="group flex items-center gap-4 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/30 hover:bg-surface-700"
				>
					<!-- Match info -->
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
							{#if m.mappool}
								&middot; <a href='/mappools/{m.mappool.id}' onclick={(e) => e.stopPropagation()} class='hover:text-accent hover:underline'>{m.mappool.name}</a>{#if avgSR(m.mappool)} <span>{avgSR(m.mappool)}★</span>{/if}
							{/if}
							{#if m.finishedAt}
								&middot; {timeAgo(m.finishedAt)}
							{:else if m.createdAt}
								&middot; {timeAgo(m.createdAt)}
							{/if}
						</p>
					</div>

					<!-- Winner indicator -->
					{#if m.state === 'FINISHED' && m.winnerId}
						{@const winner = m.participants.find((p: any) => p.teamId === m.winnerId)}
						<span class="text-xs font-500 text-green-400">🏆 {winner?.team.name}</span>
					{/if}

					<!-- State -->
					<span
						class="rounded border px-2 py-0.5 text-xs font-500 {sc?.color ?? 'border-border'}"
					>
						{sc?.label ?? m.state}
					</span>
				</a>
			{:else}
				{#if liveMatches.length === 0}
					<div class="rounded-lg border border-dashed border-border py-12 text-center">
						<p class="text-sm text-text-secondary">
							No matches yet.
							{#if data.canCreateMatch}
								Create one to get started.
							{:else}
								Join the ranked queue from the dashboard!
							{/if}
						</p>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>
