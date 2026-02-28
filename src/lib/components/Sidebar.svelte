<script lang="ts">
	import { page } from '$app/state';

	const user = $derived(page.data?.user);

	const nav = [
		{ href: '/', label: 'Dashboard', icon: '⌂' },
		{ href: '/matches', label: 'Matches', icon: '⚔' },
		{ href: '/mappools', label: 'Mappools', icon: '♫' },
		{ href: '/teams', label: 'Teams', icon: '⚑' },
		{ href: '/leaderboard', label: 'Leaderboard', icon: '🏆' }
	];

	function isActive(href: string) {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	const isStaff = $derived(user?.role === 'referee' || user?.role === 'admin');
	const isAdmin = $derived(user?.role === 'admin');
</script>

<aside
	class="fixed top-0 left-0 z-40 flex h-full w-56 flex-col border-r border-border bg-surface-800"
>
	<!-- Logo -->
	<a href="/" class="flex items-center gap-2.5 px-5 py-5">
		<div
			class="font-800 flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm text-surface-900"
		>
			V
		</div>
		<span class="font-700 text-base tracking-tight text-text-primary">Vash Esports</span>
	</a>

	<!-- Nav -->
	<nav class="mt-2 flex flex-1 flex-col gap-0.5 px-3">
		{#each nav as item}
			<a
				href={item.href}
				class="font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors {isActive(
					item.href
				)
					? 'bg-accent-dim text-accent'
					: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'}"
			>
				<span class="text-base">{item.icon}</span>
				{item.label}
			</a>
		{/each}

		{#if isAdmin}
			<div class="mt-4 mb-1 px-3">
				<p class="text-[10px] font-600 text-text-secondary uppercase tracking-widest">Staff</p>
			</div>
			<a
				href="/admin"
				class="font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors {isActive(
					'/admin'
				)
					? 'bg-red-500/10 text-red-400'
					: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'}"
			>
				<span class="text-base">⚡</span>
				Admin
			</a>
		{/if}
	</nav>

	<!-- Bottom -->
	<div class="border-t border-border p-3">
		<a
			href="/settings"
			class="font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary {isActive(
				'/settings'
			)
				? 'bg-accent-dim text-accent'
				: ''}"
		>
			<span class="text-base">⚙</span>
			Settings
		</a>
	</div>
</aside>
