<script lang="ts">
	import { page } from '$app/state';

	const user = $derived(page.data?.user);

	let { open = $bindable(false) } = $props();

	function isActive(href: string) {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	const isAdmin = $derived(user?.role === 'admin');

	// Close sidebar on navigation (mobile)
	$effect(() => {
		page.url.pathname;
		open = false;
	});
</script>

{#snippet navIcon(name: string)}
	{#if name === 'dashboard'}
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
	{:else if name === 'matches'}
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 3.5-3.5"/><path d="m16.5 22 5-5"/><path d="M10 5.5 6 2H3v3l4 4"/></svg>
	{:else if name === 'mappools'}
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="18" r="3"/><path d="M11 18V8l9-1v10"/><circle cx="20" cy="17" r="3"/></svg>
	{:else if name === 'teams'}
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
	{:else if name === 'leaderboard'}
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
	{:else if name === 'settings'}
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
	{:else if name === 'admin'}
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
	{/if}
{/snippet}

<!-- Backdrop (mobile only) -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
		onclick={() => (open = false)}
		aria-label="Close menu"
	></button>
{/if}

<aside
	class="fixed top-0 left-0 z-50 flex h-full w-56 flex-col border-r border-border bg-surface-800 transition-transform duration-200 {open
		? 'translate-x-0'
		: '-translate-x-full'} lg:translate-x-0 lg:z-40"
>
	<!-- Logo -->
	<a href="/" class="flex items-center gap-2.5 px-5 py-5">
		<img src="/logo.png" alt="Vash Esports" class="h-8 w-8" />
		<span class="font-700 text-base tracking-tight text-text-primary">Vash Esports</span>
	</a>

	<!-- Nav -->
	<nav class="mt-2 flex flex-1 flex-col gap-0.5 px-3">
		{#each [
			{ href: '/', label: 'Dashboard', icon: 'dashboard' },
			{ href: '/matches', label: 'Matches', icon: 'matches' },
			{ href: '/mappools', label: 'Mappools', icon: 'mappools' },
			{ href: '/teams', label: 'Teams', icon: 'teams' },
			{ href: '/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
		] as item}
			<a
				href={item.href}
				class="font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors {isActive(item.href)
					? 'bg-accent-dim text-accent'
					: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'}"
			>
				{@render navIcon(item.icon)}
				{item.label}
			</a>
		{/each}

		{#if isAdmin}
			<div class="mt-4 mb-1 px-3">
				<p class="text-[10px] font-600 text-text-secondary uppercase tracking-widest">Staff</p>
			</div>
			<a
				href="/admin"
				class="font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors {isActive('/admin')
					? 'bg-red-500/10 text-red-400'
					: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'}"
			>
				{@render navIcon('admin')}
				Admin
			</a>
		{/if}
	</nav>

	<!-- Bottom -->
	<div class="border-t border-border p-3">
		<a
			href="/settings"
			class="font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors {isActive('/settings')
				? 'bg-accent-dim text-accent'
				: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'}"
		>
			{@render navIcon('settings')}
			Settings
		</a>
		<div class="mt-2 flex gap-3 px-3 pb-1">
			<a href="/terms" class="text-xs text-text-secondary/50 transition-colors hover:text-text-secondary">Terms</a>
			<a href="/privacy" class="text-xs text-text-secondary/50 transition-colors hover:text-text-secondary">Privacy</a>
		</div>
	</div>
</aside>
