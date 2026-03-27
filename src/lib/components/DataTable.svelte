<script lang="ts" generics="T">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { TableMeta } from '$lib/server/table';

	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		class?: string;
	}

	const {
		data,
		meta,
		columns,
		row,
		searchPlaceholder = 'Search...'
	}: {
		data: T[];
		meta: TableMeta;
		columns: Column[];
		row: Snippet<[T, number]>;
		searchPlaceholder?: string;
	} = $props();

	let searchInput = $derived.by(() => meta.search);
	let debounceTimer: ReturnType<typeof setTimeout>;

	const offset = $derived((meta.page - 1) * meta.limit);
	const showingStart = $derived(meta.total === 0 ? 0 : offset + 1);
	const showingEnd = $derived(Math.min(offset + meta.limit, meta.total));

	const pageButtons = $derived.by(() => {
		const total = meta.totalPages;
		const current = meta.page;
		const pages: (number | '...')[] = [];

		if (total <= 7) {
			for (let i = 1; i <= total; i++) pages.push(i);
		} else {
			pages.push(1);
			if (current > 3) pages.push('...');
			for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
				pages.push(i);
			}
			if (current < total - 2) pages.push('...');
			pages.push(total);
		}
		return pages;
	});

	function updateParams(updates: Record<string, string>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(updates)) {
			if (value) {
				url.searchParams.set(key, value);
			} else {
				url.searchParams.delete(key);
			}
		}
		// reset to page 1 when changing search/sort/filter
		if (!('page' in updates)) {
			url.searchParams.set('page', '1');
		}
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateParams({ search: searchInput });
		}, 300);
	}

	function toggleSort(key: string) {
		if (meta.sortBy === key) {
			updateParams({ sortBy: key, sortDir: meta.sortDir === 'asc' ? 'desc' : 'asc' });
		} else {
			updateParams({ sortBy: key, sortDir: 'desc' });
		}
	}

	function goToPage(p: number) {
		updateParams({ page: String(p) });
	}
</script>

<!-- search bar -->
<div class="mb-4 flex items-center gap-3">
	<div class="relative flex-1">
		<svg
			class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<input
			bind:value={searchInput}
			oninput={handleSearch}
			placeholder={searchPlaceholder}
			class="w-full rounded-md border border-border bg-surface-800 py-2 pr-3 pl-9 text-sm text-text-primary transition-colors outline-none placeholder:text-text-secondary focus:border-text-secondary"
		/>
	</div>
	<span class="shrink-0 text-xs text-text-secondary"
		>{meta.total} result{meta.total !== 1 ? 's' : ''}</span
	>
</div>

<!-- table -->
<div class="overflow-x-auto rounded-lg border border-border">
	<table class="w-full">
		<thead>
			<tr class="border-b border-border bg-surface-800">
				{#each columns as col}
					<th
						class="{col.class ??
							'px-4 text-left'} py-3 text-[11px] font-semibold tracking-wider text-text-secondary uppercase"
					>
						{#if col.sortable}
							<button
								class="inline-flex items-center gap-1 transition-colors hover:text-text-primary"
								onclick={() => toggleSort(col.key)}
							>
								{col.label}
								{#if meta.sortBy === col.key}
									<svg
										class="h-3 w-3"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="3"
									>
										{#if meta.sortDir === 'asc'}
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
										{:else}
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
										{/if}
									</svg>
								{:else}
									<svg
										class="h-3 w-3 opacity-30"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
										/>
									</svg>
								{/if}
							</button>
						{:else}
							{col.label}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-border/50">
			{#each data as item, i}
				{@render row(item, i)}
			{:else}
				<tr>
					<td colspan={columns.length} class="px-4 py-8 text-center text-sm text-text-secondary">
						{meta.search ? `No results for "${meta.search}"` : 'No data'}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- pagination -->
{#if meta.totalPages > 1}
	<div class="mt-4 flex items-center justify-between">
		<span class="text-xs text-text-secondary">
			Showing {showingStart}–{showingEnd} of {meta.total}
		</span>
		<div class="flex items-center gap-1">
			<button
				disabled={meta.page <= 1}
				onclick={() => goToPage(meta.page - 1)}
				class="rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
			>
				Prev
			</button>
			{#each pageButtons as p}
				{#if p === '...'}
					<span class="px-1 text-xs text-text-secondary">...</span>
				{:else}
					<button
						onclick={() => goToPage(p as number)}
						class="rounded-md px-2.5 py-1.5 text-xs transition-colors {p === meta.page
							? 'bg-accent font-semibold text-surface-900'
							: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'}"
					>
						{p}
					</button>
				{/if}
			{/each}
			<button
				disabled={meta.page >= meta.totalPages}
				onclick={() => goToPage(meta.page + 1)}
				class="rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
			>
				Next
			</button>
		</div>
	</div>
{/if}
