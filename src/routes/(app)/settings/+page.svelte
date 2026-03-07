<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	const roleBadge: Record<string, { label: string; color: string }> = {
		player: { label: 'Player', color: 'bg-surface-600 text-text-secondary' },
		referee: { label: 'Referee', color: 'bg-yellow-500/20 text-yellow-400' },
		admin: { label: 'Admin', color: 'bg-red-500/20 text-red-400' }
	};

	const badge = $derived(roleBadge[data.profile.role] ?? roleBadge.player);

	const winRate = $derived(
		data.rating && data.rating.wins + data.rating.losses > 0
			? ((data.rating.wins / (data.rating.wins + data.rating.losses)) * 100).toFixed(1)
			: '—'
	);
</script>

<div class="mx-auto max-w-2xl">
	<h1 class="text-2xl font-700 tracking-tight">Settings</h1>
	<p class="mt-1 text-sm text-text-secondary">Your profile and account settings</p>

	<!-- Profile Card -->
	<div class="mt-6 rounded-lg border border-border bg-surface-800 p-6">
		<div class="flex items-center gap-4">
			{#if data.profile.image}
				<img src={data.profile.image} alt={data.profile.name} class="h-16 w-16 rounded-full" />
			{:else}
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-surface-600 text-xl font-700 text-text-secondary"
				>
					{data.profile.name.charAt(0).toUpperCase()}
				</div>
			{/if}
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<h2 class="text-lg font-700">{data.profile.name}</h2>
					<span class="rounded px-2 py-0.5 text-xs font-600 {badge.color}">
						{badge.label}
					</span>
				</div>
				<p class="mt-0.5 text-sm text-text-secondary">{data.profile.email}</p>
			</div>
		</div>

		<!-- Connected Accounts -->
		<div class="mt-6 border-t border-border pt-4">
			<h3 class="text-xs font-600 text-text-secondary uppercase tracking-wider">Connected Accounts</h3>
			<div class="mt-3 flex items-center gap-3 rounded-md bg-surface-700 px-4 py-3">
				<img src="/osu.png" alt="osu!" class="h-5 w-5 object-contain" />
				<div class="flex-1">
					<p class="text-sm font-500">osu!</p>
					<p class="text-xs text-text-secondary">
						{#if data.hasOsuLinked}
							Connected as {data.profile.name}
						{:else}
							Not connected
						{/if}
					</p>
				</div>
				{#if data.hasOsuLinked}
					<span class="rounded bg-green-500/20 px-2 py-0.5 text-xs font-500 text-green-400">Linked</span>
				{:else}
					<a
						href="/api/auth/osu/login"
						class="rounded bg-accent px-3 py-1 text-xs font-600 text-surface-900 hover:bg-accent-hover"
					>
						Connect
					</a>
				{/if}
			</div>
		</div>
	</div>

	<!-- Stats Card -->
	<div class="mt-4 rounded-lg border border-border bg-surface-800 p-6">
		<h3 class="text-xs font-600 text-text-secondary uppercase tracking-wider">Ranked Stats</h3>
		<div class="mt-4 grid grid-cols-4 gap-4">
			<div>
				<p class="text-2xl font-800 tabular-nums text-accent">{data.rating?.elo ?? '—'}</p>
				<p class="mt-1 text-xs text-text-secondary">ELO Rating</p>
			</div>
			<div>
				<p class="text-2xl font-800 tabular-nums text-green-400">{data.rating?.wins ?? 0}</p>
				<p class="mt-1 text-xs text-text-secondary">Wins</p>
			</div>
			<div>
				<p class="text-2xl font-800 tabular-nums text-red-400">{data.rating?.losses ?? 0}</p>
				<p class="mt-1 text-xs text-text-secondary">Losses</p>
			</div>
			<div>
				<p class="text-2xl font-800 tabular-nums text-text-primary">{winRate}{winRate !== '—' ? '%' : ''}</p>
				<p class="mt-1 text-xs text-text-secondary">Win Rate</p>
			</div>
		</div>
	</div>

	<!-- Danger Zone -->
	<div class="mt-4 rounded-lg border border-border bg-surface-800 p-6">
		<h3 class="text-xs font-600 text-red-400 uppercase tracking-wider">Account</h3>
		<div class="mt-4">
			<form method="post" action="?/logout" use:enhance>
				<button
					type="submit"
					class="rounded-md border border-red-500/30 px-4 py-2 text-sm font-500 text-red-400 transition-colors hover:bg-red-500/10"
				>
					Sign Out
				</button>
			</form>
		</div>
	</div>
</div>
