<script lang="ts">
	import { goto } from '$app/navigation';

	interface SearchResult {
		id: string;
		name: string | null;
		type: string;
		href: string;
		image?: string | null;
		avatarUrl?: string | null;
		state?: string | null;
	}

	let { open = $bindable(false) }: { open: boolean } = $props();
	let query = $state('');
	let results = $state<Record<string, SearchResult[]>>({});
	let loading = $state(false);
	let selectedIndex = $state(0);
	let inputRef = $state<HTMLInputElement | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout>;

	const flatResults = $derived(Object.values(results).flat());

	const typeIcons: Record<string, string> = {
		users: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
		teams:
			'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
		mappools:
			'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
		tournaments:
			'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
		matches:
			'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
	};

	const typeLabels: Record<string, string> = {
		users: 'Users',
		teams: 'Teams',
		mappools: 'Mappools',
		tournaments: 'Tournaments',
		matches: 'Matches'
	};

	function openModal() {
		open = true;
		query = '';
		results = {};
		selectedIndex = 0;
	}

	// Focus input whenever modal opens (whether via cmd+k or click)
	$effect(() => {
		if (open) {
			// wait for DOM to render the modal
			setTimeout(() => inputRef?.focus(), 10);
		}
	});

	function closeModal() {
		open = false;
		query = '';
		results = {};
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (open) {
				closeModal();
			} else {
				openModal();
			}
		} else if (e.key === 'Escape' && open) {
			e.preventDefault();
			closeModal();
		}
	}

	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeModal();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, flatResults.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter' && flatResults[selectedIndex]) {
			e.preventDefault();
			navigateTo(flatResults[selectedIndex].href);
		}
	}

	function navigateTo(href: string) {
		closeModal();
		goto(href);
	}

	$effect(() => {
		if (query.length < 2) {
			results = {};
			return;
		}
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			loading = true;
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
				if (res.ok) {
					const data = await res.json();
					results = data.results;
				}
			} finally {
				loading = false;
			}
			selectedIndex = 0;
		}, 250);
	});

	// compute a flat index for each item to support keyboard selection
	function getFlatIndex(type: string, itemIndex: number): number {
		const types = Object.keys(results);
		let idx = 0;
		for (const t of types) {
			if (t === type) return idx + itemIndex;
			idx += results[t].length;
		}
		return idx;
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if open}
	<!-- backdrop -->
	<button
		class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
		onclick={closeModal}
		aria-label="Close search"
		tabindex="-1"
	></button>

	<!-- modal -->
	<div
		class="fixed top-[15%] left-1/2 z-[60] w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-surface-800 shadow-2xl"
		role="dialog"
		aria-label="Search"
		onkeydown={handleModalKeydown}
	>
		<!-- search input -->
		<div class="flex items-center gap-3 border-b border-border px-4 py-3">
			<svg
				class="h-5 w-5 shrink-0 text-text-secondary"
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
				bind:this={inputRef}
				bind:value={query}
				placeholder="Search users, teams, tournaments..."
				class="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
			/>
			{#if loading}
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
				></div>
			{:else}
				<kbd
					class="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary"
					>ESC</kbd
				>
			{/if}
		</div>

		<!-- results -->
		<div class="max-h-80 overflow-y-auto">
			{#if query.length < 2}
				<div class="px-4 py-8 text-center text-sm text-text-secondary">
					Type at least 2 characters to search
				</div>
			{:else if !loading && flatResults.length === 0 && query.length >= 2}
				<div class="px-4 py-8 text-center text-sm text-text-secondary">
					No results for "{query}"
				</div>
			{:else}
				{#each Object.entries(results) as [type, items]}
					{#if items.length > 0}
						<div class="px-4 pt-3 pb-1">
							<span class="text-[10px] font-semibold tracking-wider text-text-secondary uppercase"
								>{typeLabels[type] ?? type}</span
							>
						</div>
						{#each items as item, i}
							{@const flatIdx = getFlatIndex(type, i)}
							<button
								class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors {flatIdx ===
								selectedIndex
									? 'bg-surface-700 text-text-primary'
									: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'}"
								onclick={() => navigateTo(item.href)}
								onmouseenter={() => (selectedIndex = flatIdx)}
							>
								<svg
									class="h-4 w-4 shrink-0"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="1.5"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={typeIcons[type] ?? ''} />
								</svg>
								{#if item.image || item.avatarUrl}
									<img src={item.image ?? item.avatarUrl} alt="" class="h-5 w-5 rounded-full" />
								{/if}
								<span class="flex-1 truncate">{item.name ?? 'Unnamed'}</span>
								{#if item.state}
									<span
										class="rounded bg-surface-600 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary"
										>{item.state}</span
									>
								{/if}
							</button>
						{/each}
					{/if}
				{/each}
			{/if}
		</div>

		<!-- footer -->
		<div
			class="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-text-secondary"
		>
			<span class="flex items-center gap-1">
				<kbd class="rounded bg-surface-700 px-1 py-0.5 font-mono">↑↓</kbd> navigate
			</span>
			<span class="flex items-center gap-1">
				<kbd class="rounded bg-surface-700 px-1 py-0.5 font-mono">↵</kbd> select
			</span>
			<span class="flex items-center gap-1">
				<kbd class="rounded bg-surface-700 px-1 py-0.5 font-mono">esc</kbd> close
			</span>
		</div>
	</div>
{/if}
