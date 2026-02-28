<script lang="ts">
	import type { PageProps } from './$types';
	import './layout.css';

	let { data }: PageProps = $props();
</script>

<div class="mx-auto max-w-4xl">
	<h1 class="font-700 text-2xl tracking-tight">
		{#if data.user}
			Welcome back, <span class="text-accent">{data.user.name}</span>
		{:else}
			Welcome to <span class="text-accent">VASH</span>
		{/if}
	</h1>
	<p class="mt-2 text-sm text-text-secondary">Automated esports match management for osu!</p>

	<div class="mt-8 grid grid-cols-3 gap-4">
		<a
			href="/matches"
			class="group rounded-lg border border-border bg-surface-800 p-5 transition-colors hover:border-accent/40 hover:bg-surface-700"
		>
			<div class="text-2xl">⚔</div>
			<h2 class="font-600 mt-3 text-sm">Matches</h2>
			<p class="mt-1 text-xs text-text-secondary">Create and manage competitive matches</p>
		</a>

		<a
			href="/mappools"
			class="group rounded-lg border border-border bg-surface-800 p-5 transition-colors hover:border-accent/40 hover:bg-surface-700"
		>
			<div class="text-2xl">♫</div>
			<h2 class="font-600 mt-3 text-sm">Mappools</h2>
			<p class="mt-1 text-xs text-text-secondary">Build and share beatmap pools</p>
		</a>

		<a
			href="/teams"
			class="group rounded-lg border border-border bg-surface-800 p-5 transition-colors hover:border-accent/40 hover:bg-surface-700"
		>
			<div class="text-2xl">⚑</div>
			<h2 class="font-600 mt-3 text-sm">Teams</h2>
			<p class="mt-1 text-xs text-text-secondary">Manage your teams and rosters</p>
		</a>
	</div>
</div>
