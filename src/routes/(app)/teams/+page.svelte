<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';

	const { data } = $props();

	let creating = $state(false);

	const columns = [
		{ key: 'name', label: 'Team', sortable: true },
		{ key: 'memberCount', label: 'Members' },
		{ key: 'createdAt', label: 'Created', sortable: true, class: 'hidden sm:table-cell' }
	];
</script>

<svelte:head>
	<title>Teams — Vash Esports</title>
	<meta name="description" content="Browse and manage teams on Vash Esports." />
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="font-700 text-2xl tracking-tight">Teams</h1>
		<button
			onclick={() => (creating = !creating)}
			class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
		>
			{creating ? 'Cancel' : 'New Team'}
		</button>
	</div>

	{#if creating}
		<form
			method="post"
			action="?/create"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success' && (result.data as any)?.success) {
						creating = false;
						await update();
					}
				};
			}}
			class="mb-6 flex gap-3 rounded-lg border border-border bg-surface-800 p-4"
		>
			<input
				type="text"
				name="name"
				placeholder="Team name"
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

	<DataTable data={data.teams} meta={data.meta} {columns} searchPlaceholder="Search teams...">
		{#snippet row(team, _i)}
			<tr class="transition-colors hover:bg-surface-800/50">
				<td class="px-4 py-3">
					<a href="/teams/{team.id}" class="flex items-center gap-3 hover:text-accent">
						{#if team.avatarUrl}
							<img src={team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
						{:else}
							<div
								class="font-700 flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs text-text-secondary"
							>
								{team.name.charAt(0).toUpperCase()}
							</div>
						{/if}
						<div>
							<span class="font-600 text-sm">{team.name}</span>
							{#if team.isPersonal}
								<span
									class="ml-1.5 rounded bg-surface-600 px-1.5 py-0.5 text-[10px] text-text-secondary"
									>solo</span
								>
							{/if}
							{#if team.ownerId === data.userId}
								<span class="ml-1.5 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent"
									>yours</span
								>
							{/if}
						</div>
					</a>
				</td>
				<td class="px-4 py-3 text-sm text-text-secondary">
					{team.memberCount}
				</td>
				<td class="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
					{new Date(team.createdAt).toLocaleDateString()}
				</td>
			</tr>
		{/snippet}
	</DataTable>
</div>
