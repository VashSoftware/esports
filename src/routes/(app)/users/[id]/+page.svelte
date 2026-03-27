<script lang="ts">
	import ProfileComments from '$lib/components/ProfileComments.svelte';

	const { data } = $props();

	const p = $derived(data.profile);

	const roleBadge: Record<string, { label: string; class: string }> = {
		admin: { label: 'Admin', class: 'bg-red-500/20 text-red-400' },
		referee: { label: 'Referee', class: 'bg-blue-500/20 text-blue-400' },
		player: { label: 'Player', class: 'bg-surface-600 text-text-secondary' }
	};

	const badge = $derived(roleBadge[p.role] ?? roleBadge.player);

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

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{p.name} — Vash Esports</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="flex items-center gap-4">
		{#if p.image}
			<img src={p.image} alt="" class="h-16 w-16 rounded-full" />
		{:else}
			<div
				class="font-700 flex h-16 w-16 items-center justify-center rounded-full bg-surface-600 text-xl text-text-secondary"
			>
				{p.name.charAt(0).toUpperCase()}
			</div>
		{/if}
		<div>
			<div class="flex items-center gap-2">
				<h1 class="font-700 text-2xl tracking-tight">{p.name}</h1>
				<span class="font-600 rounded px-1.5 py-0.5 text-[10px] {badge.class}">{badge.label}</span>
			</div>
			<p class="mt-0.5 text-sm text-text-secondary">
				Joined {formatDate(p.createdAt)}
			</p>
		</div>
	</div>

	<!-- Stats -->
	{#if data.rating}
		<div class="mt-6 grid grid-cols-3 gap-3">
			<div class="rounded-lg border border-border bg-surface-800 px-4 py-3 text-center">
				<p class="font-700 text-xl text-accent">{data.rating.elo}</p>
				<p class="mt-0.5 text-[11px] text-text-secondary">ELO</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 px-4 py-3 text-center">
				<p class="font-700 text-xl text-green-400">{data.rating.wins}</p>
				<p class="mt-0.5 text-[11px] text-text-secondary">Wins</p>
			</div>
			<div class="rounded-lg border border-border bg-surface-800 px-4 py-3 text-center">
				<p class="font-700 text-xl text-red-400">{data.rating.losses}</p>
				<p class="mt-0.5 text-[11px] text-text-secondary">Losses</p>
			</div>
		</div>
	{/if}

	<!-- Teams -->
	{#if data.teams.length > 0}
		<div class="mt-6">
			<h2 class="font-600 text-sm text-text-secondary">Teams</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each data.teams as team}
					<a
						href="/teams/{team.id}"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 px-4 py-3 transition-colors hover:border-accent/30 hover:bg-surface-700"
					>
						{#if team.avatarUrl}
							<img src={team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
						{:else}
							<div
								class="font-700 flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs text-text-secondary"
							>
								{team.name.charAt(0).toUpperCase()}
							</div>
						{/if}
						<span class="font-600 flex-1 text-sm">{team.name}</span>
						<span class="text-xs text-text-secondary">{team.role}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Recent Matches -->
	{#if data.recentMatches.length > 0}
		<div class="mt-6">
			<h2 class="font-600 text-sm text-text-secondary">Recent Matches</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each data.recentMatches as m}
					{@const p1 = m.participants[0]}
					{@const p2 = m.participants[1]}
					{@const won = data.personalTeamId ? m.winnerId === data.personalTeamId : false}
					<a
						href="/matches/{m.id}"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 px-4 py-3 transition-colors hover:border-accent/30 hover:bg-surface-700"
					>
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
						{#if m.state === 'FINISHED'}
							<span class="ml-auto text-xs {won ? 'font-600 text-green-400' : 'text-red-400'}"
								>{won ? 'W' : 'L'}</span
							>
						{:else}
							<span class="ml-auto text-xs text-text-secondary">{m.state}</span>
						{/if}
						<span class="text-xs text-text-secondary/50">{timeAgo(m.createdAt)}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<ProfileComments comments={data.comments} actionUrl="?/comment" />
</div>
