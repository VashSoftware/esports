<script lang="ts">
	import './layout.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { startPolling, stopPolling } from '$lib/stores/queue.svelte';

	let { children } = $props();

	const user = $derived(page.data?.user);
	const activeMatch = $derived(page.data?.activeMatch);

	let sidebarOpen = $state(false);

	const stateLabel: Record<string, string> = {
		CREATED: 'Starting',
		LOBBY: 'In Lobby',
		ROLLING: 'Rolling',
		PICKING: 'Picking',
		PLAYING: 'Playing'
	};

	onMount(() => {
		if (!user) return;
		startPolling();
		return () => stopPolling();
	});
</script>

{#if user}
	<!-- Authenticated layout with sidebar -->
	<div class="flex min-h-dvh">
		<Sidebar bind:open={sidebarOpen} />
		<div class="flex flex-1 flex-col lg:ml-56">
			<!-- Header with hamburger on mobile -->
			<header
				class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface-900/80 px-4 backdrop-blur-md lg:px-6"
			>
				<button
					class="rounded-md p-2 text-text-secondary hover:bg-surface-700 hover:text-text-primary lg:hidden"
					onclick={() => (sidebarOpen = !sidebarOpen)}
					aria-label="Toggle menu"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<div class="lg:flex-1"></div>
				<Header />
			</header>

			{#if activeMatch && !page.url.pathname.startsWith('/matches/' + activeMatch.id)}
				<div
					class="flex items-center justify-between border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 lg:px-6"
				>
					<div class="flex items-center gap-2.5 text-sm">
						<div class="relative h-2 w-2">
							<div
								class="absolute inset-0 animate-ping rounded-full bg-yellow-400 opacity-75"
							></div>
							<div class="h-2 w-2 rounded-full bg-yellow-400"></div>
						</div>
						<span class="font-600 text-yellow-300">Active match</span>
						<span class="hidden text-xs text-yellow-400/70 sm:inline">
							{activeMatch.name ?? 'Match'} &middot; {stateLabel[activeMatch.state] ??
								activeMatch.state}
						</span>
					</div>
					<a
						href="/matches/{activeMatch.id}"
						class="font-600 rounded-md border border-yellow-500/40 px-3 py-1 text-xs text-yellow-300 transition-colors hover:bg-yellow-500/20"
					>
						Go to match &rarr;
					</a>
				</div>
			{/if}
			<main class="flex-1 p-4 lg:p-6">
				{@render children()}
			</main>
		</div>
	</div>
{:else}
	<!-- Unauthenticated: clean layout, no sidebar -->
	<div class="min-h-dvh">
		<header
			class="flex h-14 items-center justify-between border-b border-border bg-surface-900/80 px-6 backdrop-blur-md"
		>
			<a href="/" class="flex items-center gap-2.5">
				<img src="/logo.png" alt="Vash Esports" class="h-8 w-8" />
				<span class="font-700 text-base tracking-tight text-text-primary">Vash Esports</span>
			</a>
			<a
				href="/login"
				class="font-600 rounded-md bg-accent px-3.5 py-1.5 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
			>
				Sign in with osu!
			</a>
		</header>
		<main class="p-6">
			{@render children()}
		</main>
	</div>
{/if}
