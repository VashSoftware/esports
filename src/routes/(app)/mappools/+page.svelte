<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';

	const { data } = $props();
	let creating = $state(false);

	const columns = [
		{ key: 'name', label: 'Pool', sortable: true },
		{ key: 'maps', label: 'Maps', sortable: true },
		{ key: 'avgSr', label: 'Avg SR', sortable: true },
		{ key: 'createdAt', label: 'Created', sortable: true, class: 'hidden sm:table-cell' }
	];
</script>

<svelte:head>
	<title>Mappools — Vash Esports</title>
	<meta name="description" content="Browse and manage osu! tournament mappools on Vash Esports." />
	<meta property="og:title" content="Mappools — Vash Esports" />
	<meta
		property="og:description"
		content="Browse and manage osu! tournament mappools on Vash Esports."
	/>
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="font-700 text-2xl tracking-tight">Mappools</h1>
			<p class="mt-1 text-sm text-text-secondary">
				{data.meta.total} pool{data.meta.total !== 1 ? 's' : ''}
			</p>
		</div>
		<button
			onclick={() => (creating = !creating)}
			class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
		>
			{creating ? 'Cancel' : 'New Pool'}
		</button>
	</div>

	{#if creating}
		<form
			method="post"
			action="?/create"
			use:enhance
			class="mb-6 flex gap-3 rounded-lg border border-border bg-surface-800 p-4"
		>
			<input
				type="text"
				name="name"
				placeholder="Pool name (e.g. Grand Finals Mappool)"
				required
				class="flex-1 rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
			/>
			<button
				type="submit"
				class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
			>
				Create
			</button>
		</form>
	{/if}

	<DataTable data={data.mappools} meta={data.meta} {columns} searchPlaceholder="Search mappools...">
		{#snippet row(pool, _i)}
			{@const rated = pool.slots.filter((s: any) => s.starRating != null)}
			{@const avgSr =
				rated.length > 0
					? (rated.reduce((sum: number, s: any) => sum + s.starRating, 0) / rated.length).toFixed(2)
					: null}
			<tr class="transition-colors hover:bg-surface-800/50">
				<td class="px-4 py-3">
					<a href="/mappools/{pool.id}" class="flex items-center gap-2 hover:text-accent">
						<span class="font-600 text-sm">{pool.name}</span>
						{#if pool.verifiedAt}
							<span
								class="font-600 rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400"
								>Verified</span
							>
						{/if}
					</a>
				</td>
				<td class="px-4 py-3 text-sm text-text-secondary">
					{pool.slots.length}
				</td>
				<td class="px-4 py-3 text-sm text-text-secondary">
					{avgSr ? `${avgSr}★` : '—'}
				</td>
				<td class="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
					{new Date(pool.createdAt).toLocaleDateString()}
				</td>
			</tr>
		{/snippet}
	</DataTable>
</div>
