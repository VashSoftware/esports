<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';

	const user = $derived(page.data?.user);

	const roleBadge: Record<string, { label: string; color: string }> = {
		referee: { label: 'REF', color: 'bg-yellow-500/20 text-yellow-400' },
		admin: { label: 'ADMIN', color: 'bg-red-500/20 text-red-400' }
	};

	const badge = $derived(user?.role ? roleBadge[user.role] : null);
</script>

<header
	class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface-900/80 px-6 backdrop-blur-md"
>
	<div></div>

	<div class="flex items-center gap-4">
		{#if user}
			<div class="flex items-center gap-3">
				{#if badge}
					<span class="rounded px-1.5 py-0.5 text-[10px] font-700 {badge.color}">
						{badge.label}
					</span>
				{/if}
				{#if user.image}
					<img src={user.image} alt={user.name} class="h-7 w-7 rounded-full" />
				{/if}
				<span class="font-500 text-sm text-text-primary">{user.name}</span>
				<form method="post" action="/settings?/logout" use:enhance>
					<button
						type="submit"
						class="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-red-500/30 hover:text-red-400"
					>
						Logout
					</button>
				</form>
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
</header>
