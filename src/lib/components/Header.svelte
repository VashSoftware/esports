<script lang="ts">
	import { page } from '$app/state';

	const user = $derived(page.data?.user);
</script>

<header
	class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface-900/80 px-6 backdrop-blur-md"
>
	<div></div>

	<div class="flex items-center gap-4">
		{#if user}
			<div class="flex items-center gap-3">
				{#if user.image}
					<img src={user.image} alt={user.name} class="h-7 w-7 rounded-full" />
				{/if}
				<span class="font-500 text-sm text-text-primary">{user.name}</span>
			</div>
		{:else}
			<a
				href="/api/auth/osu/login"
				class="font-600 rounded-md bg-accent px-3.5 py-1.5 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
			>
				Sign in with osu!
			</a>
		{/if}
	</div>
</header>
