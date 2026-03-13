<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';

	const user = $derived(page.data?.user);

	const roleBadge: Record<string, { label: string; color: string }> = {
		referee: { label: 'REF', color: 'bg-yellow-500/20 text-yellow-400' },
		admin: { label: 'ADMIN', color: 'bg-red-500/20 text-red-400' }
	};

	const badge = $derived(user?.role ? roleBadge[user.role] : null);

	let menuOpen = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-profile-menu]')) closeMenu();
	}}
/>

<div class="flex items-center gap-4">
	{#if user}
		<div class="relative" data-profile-menu>
			<button
				onclick={toggleMenu}
				class="flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-surface-700"
				aria-expanded={menuOpen}
				aria-haspopup="true"
			>
				{#if user.isRootAdmin}
					<span class="font-700 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">
						ROOT
					</span>
				{:else if badge}
					<span class="font-700 rounded px-1.5 py-0.5 text-[10px] {badge.color}">
						{badge.label}
					</span>
				{/if}
				{#if user.image}
					<img src={user.image} alt={user.name} class="h-7 w-7 rounded-full" />
				{/if}
				<span class="font-500 hidden text-sm text-text-primary sm:inline">{user.name}</span>
				<svg
					class="h-3.5 w-3.5 text-text-secondary transition-transform {menuOpen
						? 'rotate-180'
						: ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if menuOpen}
				<div
					class="absolute top-full right-0 z-50 mt-1.5 w-44 rounded-md border border-border bg-surface-800 py-1 shadow-lg"
				>
					<a
						href="/settings"
						onclick={closeMenu}
						class="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Settings
					</a>
					<div class="my-1 border-t border-border"></div>
					<form method="post" action="/settings?/logout" use:enhance>
						<button
							type="submit"
							class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-700 hover:text-red-400"
						>
							<svg
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
							Log out
						</button>
					</form>
				</div>
			{/if}
		</div>
	{:else}
		<a
			href="/login"
			class="font-600 rounded-md bg-accent px-3.5 py-1.5 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
		>
			Sign in with osu!
		</a>
	{/if}
</div>
