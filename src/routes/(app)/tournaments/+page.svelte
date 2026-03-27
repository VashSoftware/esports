<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/components/DataTable.svelte';

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

	const currentFilter = $derived(new URL($page.url).searchParams.get('filter') ?? 'all');

	function setFilter(value: string) {
		const url = new URL($page.url);
		if (value === 'all') {
			url.searchParams.delete('filter');
		} else {
			url.searchParams.set('filter', value);
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	const columns = [
		{ key: 'name', label: 'Tournament', sortable: true },
		{ key: 'format', label: 'Format' },
		{ key: 'state', label: 'State' },
		{ key: 'players', label: 'Players' },
		{ key: 'createdAt', label: 'Created', sortable: true, class: 'hidden sm:table-cell' }
	];
</script>

<svelte:head>
	<title>Tournaments — Vash Esports</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="font-700 text-2xl tracking-tight">Tournaments</h1>
			<p class="mt-1 text-sm text-text-secondary">
				{data.meta.total} tournament{data.meta.total !== 1 ? 's' : ''}
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
	<div class="mb-4 flex gap-1.5">
		{#each [['all', 'All'], ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['finished', 'Finished']] as [value, label]}
			<button
				class="font-600 rounded-md px-3 py-1.5 text-xs transition-colors {currentFilter === value
					? 'bg-accent text-surface-900'
					: 'border border-border bg-surface-700 text-text-secondary hover:border-accent/40 hover:text-text-primary'}"
				onclick={() => setFilter(value)}
			>
				{label}
			</button>
		{/each}
	</div>

	<DataTable
		data={data.tournaments}
		meta={data.meta}
		{columns}
		searchPlaceholder="Search tournaments..."
	>
		{#snippet row(t, _i)}
			{@const activeRegs = t.registrations.filter(
				(r: any) => r.status !== 'withdrawn' && r.status !== 'eliminated'
			).length}
			<tr
				onclick={() => goto(`/tournaments/${t.id}`)}
				class="cursor-pointer transition-colors hover:bg-surface-800/50"
			>
				<td class="px-4 py-3">
					<span class="font-600 text-sm">{t.name}</span>
					{#if t.description}
						<p class="mt-0.5 truncate text-xs text-text-secondary">{t.description}</p>
					{/if}
				</td>
				<td class="px-4 py-3 text-xs text-text-secondary">
					{formatLabels[t.format] ?? t.format}
				</td>
				<td class="px-4 py-3">
					<span
						class="font-500 rounded px-2 py-0.5 text-xs {stateColors[t.state] ??
							'bg-surface-600 text-text-secondary'}"
					>
						{t.state}
					</span>
				</td>
				<td class="px-4 py-3 text-sm text-text-secondary">
					{activeRegs}/{t.maxSlots}
				</td>
				<td class="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
					{new Date(t.createdAt).toLocaleDateString()}
				</td>
			</tr>
		{/snippet}
	</DataTable>
</div>
