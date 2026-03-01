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
		<!-- Social links -->
		<div class="mb-1 flex items-center gap-1 px-3 py-2">
			<a href="https://x.com/vashesports" target="_blank" rel="noopener" aria-label="X / Twitter" class="rounded-md p-1.5 text-text-secondary/50 transition-colors hover:bg-surface-700 hover:text-text-primary">
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
			</a>
			<a href="https://www.youtube.com/@vash-esports" target="_blank" rel="noopener" aria-label="YouTube" class="rounded-md p-1.5 text-text-secondary/50 transition-colors hover:bg-surface-700 hover:text-text-primary">
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
			</a>
			<a href="https://www.twitch.tv/vashesports" target="_blank" rel="noopener" aria-label="Twitch" class="rounded-md p-1.5 text-text-secondary/50 transition-colors hover:bg-surface-700 hover:text-text-primary">
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
			</a>
			<a href="https://discord.gg/n3mZgWk" target="_blank" rel="noopener" aria-label="Discord" class="rounded-md p-1.5 text-text-secondary/50 transition-colors hover:bg-surface-700 hover:text-text-primary">
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.108.12 18.156.15 18.197a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
			</a>
		</div>

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
