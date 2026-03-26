<script lang="ts">
	const { data } = $props();

	const formatLabels: Record<string, string> = {
		single_elim: 'Single Elimination',
		double_elim: 'Double Elimination',
		groups_bracket: 'Groups + Bracket'
	};

	const stateColors: Record<string, string> = {
		DRAFT: 'bg-surface-600 text-text-secondary',
		REGISTRATION: 'bg-green-900 text-green-300',
		QUALIFIERS: 'bg-yellow-900 text-yellow-300',
		SEEDING: 'bg-yellow-900 text-yellow-300',
		BRACKET: 'bg-blue-900 text-blue-300',
		FINISHED: 'bg-surface-700 text-text-secondary',
		CANCELLED: 'bg-red-900 text-red-300'
	};

	let filter = $state('all');

	const filtered = $derived(
		filter === 'all'
			? data.tournaments
			: data.tournaments.filter((t: any) => {
					if (filter === 'upcoming')
						return ['DRAFT', 'REGISTRATION', 'QUALIFIERS', 'SEEDING'].includes(t.state);
					if (filter === 'ongoing') return t.state === 'BRACKET';
					if (filter === 'finished') return t.state === 'FINISHED';
					return true;
				})
	);

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
	<title>Tournaments — Vash Esports</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="font-700 text-2xl tracking-tight">Tournaments</h1>
			<p class="mt-1 text-sm text-text-secondary">
				{data.tournaments.length} tournament{data.tournaments.length !== 1 ? 's' : ''}
			</p>
		</div>
		<a
			href="/tournaments/new"
			class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
		>
			Create Tournament
		</a>
	</div>

	<!-- Filters -->
	<div class="mt-4 flex gap-1.5">
		{#each [['all', 'All'], ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['finished', 'Finished']] as [value, label]}
			<button
				class="font-600 rounded-md px-3 py-1.5 text-xs transition-colors {filter === value
					? 'bg-accent text-surface-900'
					: 'border border-border bg-surface-700 text-text-secondary hover:border-accent/40 hover:text-text-primary'}"
				onclick={() => (filter = value)}
			>
				{label}
			</button>
		{/each}
	</div>

	<!-- Tournament List -->
	{#if filtered.length === 0}
		<div class="mt-6 rounded-lg border border-dashed border-border py-12 text-center">
			<p class="text-sm text-text-secondary">No tournaments found</p>
		</div>
	{:else}
		<div class="mt-6 flex flex-col gap-2">
			{#each filtered as t (t.id)}
				<a
					href="/tournaments/{t.id}"
					class="group flex items-center gap-4 rounded-lg border border-border bg-surface-800 p-4 transition-colors hover:border-accent/30 hover:bg-surface-700"
				>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="font-600 text-sm">{t.name}</span>
							<span
								class="font-500 rounded px-2 py-0.5 text-xs {stateColors[t.state] ??
									'bg-surface-600 text-text-secondary'}"
							>
								{t.state}
							</span>
						</div>
						{#if t.description}
							<p class="mt-0.5 truncate text-xs text-text-secondary">{t.description}</p>
						{/if}
						<p class="mt-1 text-xs text-text-secondary">
							{formatLabels[t.format] ?? t.format}
							&middot; {t.registrations.filter(
								(r: any) => r.status !== 'withdrawn' && r.status !== 'eliminated'
							).length}/{t.maxSlots} players
							{#if t.startAt}
								&middot; starts {new Date(t.startAt).toLocaleDateString()}
							{/if}
							&middot; {timeAgo(t.createdAt)}
						</p>
					</div>

					<svg
						class="h-4 w-4 text-text-secondary transition-colors group-hover:text-text-primary"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			{/each}
		</div>
	{/if}
</div>
