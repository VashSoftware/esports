<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let creating = $state(false);
</script>

<svelte:head>
	<title>Mappools — Vash Esports</title>
	<meta name="description" content="Browse and manage osu! tournament mappools on Vash Esports." />
	<meta property="og:title" content="Mappools — Vash Esports" />
	<meta property="og:description" content="Browse and manage osu! tournament mappools on Vash Esports." />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-700 tracking-tight">Mappools</h1>
			<p class="mt-1 text-sm text-text-secondary">Create and manage your beatmap pools</p>
		</div>
		<button
			onclick={() => (creating = !creating)}
			class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover"
		>
			{creating ? 'Cancel' : 'New Pool'}
		</button>
	</div>

	{#if creating}
		<form
			method="post"
			action="?/create"
			use:enhance
			class="mt-4 flex gap-3 rounded-lg border border-border bg-surface-800 p-4"
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
				class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover"
			>
				Create
			</button>
		</form>
	{/if}

	<div class="mt-6 flex flex-col gap-3">
		{#each data.mappools as pool}
			{@const rated = pool.slots.filter((s: any) => s.starRating != null)}
			{@const avgSr = rated.length > 0 ? (rated.reduce((sum: number, s: any) => sum + s.starRating, 0) / rated.length).toFixed(2) : null}
			<a
				href="/mappools/{pool.id}"
				class="group flex items-center justify-between rounded-lg border border-border bg-surface-800 p-4 transition-colors hover:border-accent/40 hover:bg-surface-700"
			>
				<div>
					<div class="flex items-center gap-2">
						<h2 class="text-sm font-600">{pool.name}</h2>
						{#if pool.verifiedAt}
							<span class="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-600 text-green-400">✓ Verified</span>
						{/if}
					</div>
					<p class="mt-1 text-xs text-text-secondary">
						{pool.slots.length} map{pool.slots.length !== 1 ? 's' : ''}
						{#if avgSr}· {avgSr}★{/if}
						· Created {new Date(pool.createdAt).toLocaleDateString()}
					</p>
				</div>
				<span class="text-text-secondary transition-colors group-hover:text-accent">→</span>
			</a>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<p class="text-sm text-text-secondary">No mappools yet. Create one to get started.</p>
			</div>
		{/each}
	</div>
</div>
