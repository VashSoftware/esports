<script lang="ts">
	let { data } = $props();

	const t = $derived(data.team);

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
	<title>{t.name} — Vash Esports</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="flex items-center gap-4">
		{#if t.avatarUrl}
			<img src={t.avatarUrl} alt="" class="h-14 w-14 rounded-full" />
		{:else}
			<div
				class="font-700 flex h-14 w-14 items-center justify-center rounded-full bg-surface-600 text-lg text-text-secondary"
			>
				{t.name.charAt(0).toUpperCase()}
			</div>
		{/if}
		<div>
			<div class="flex items-center gap-2">
				<h1 class="font-700 text-2xl tracking-tight">{t.name}</h1>
				{#if t.isPersonal}
					<span
						class="font-500 rounded bg-surface-600 px-1.5 py-0.5 text-[10px] text-text-secondary"
						>solo</span
					>
				{/if}
			</div>
			<p class="mt-0.5 text-sm text-text-secondary">
				{t.members.length} member{t.members.length !== 1 ? 's' : ''}
				&middot; {data.wins}W {data.losses}L
			</p>
		</div>
	</div>

	<!-- Players -->
	<div class="mt-6">
		<h2 class="font-600 text-sm text-text-secondary">Players</h2>
		<div class="mt-3 flex flex-col gap-2">
			{#each t.members as member}
				<div
					class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 px-4 py-3"
				>
					{#if member.user?.image}
						<img src={member.user.image} alt="" class="h-8 w-8 rounded-full" />
					{:else}
						<div class="h-8 w-8 rounded-full bg-surface-600"></div>
					{/if}
					<span class="font-600 flex-1 text-sm">{member.user?.name ?? 'Unknown'}</span>
					<span class="text-xs text-text-secondary">{member.role}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Recent Matches -->
	{#if data.recentMatches.length > 0}
		<div class="mt-6">
			<h2 class="font-600 text-sm text-text-secondary">Recent Matches</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each data.recentMatches as m}
					{@const p1 = m.participants[0]}
					{@const p2 = m.participants[1]}
					{@const won = m.winnerId === t.id}
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
						<span class="ml-auto text-xs {won ? 'font-600 text-green-400' : 'text-red-400'}"
							>{won ? 'W' : 'L'}</span
						>
						<span class="text-xs text-text-secondary/50">{timeAgo(m.createdAt)}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
