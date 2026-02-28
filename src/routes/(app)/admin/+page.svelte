<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let actionError = $state('');

	const roleBadge: Record<string, { label: string; color: string }> = {
		player: { label: 'Player', color: 'bg-surface-600 text-text-secondary border-border' },
		referee: {
			label: 'Referee',
			color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
		},
		admin: { label: 'Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
	};
</script>

<div class="mx-auto max-w-4xl">
	<div>
		<h1 class="text-2xl font-700 tracking-tight">Admin Panel</h1>
		<p class="mt-1 text-sm text-text-secondary">
			{data.users.length} registered user{data.users.length !== 1 ? 's' : ''}
		</p>
	</div>

	{#if actionError}
		<p class="mt-3 text-sm text-red-400">{actionError}</p>
	{/if}

	<!-- Users Table -->
	<div class="mt-6 rounded-lg border border-border bg-surface-800">
		<div class="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-border px-4 py-3">
			<span class="text-xs font-600 text-text-secondary">Avatar</span>
			<span class="text-xs font-600 text-text-secondary">User</span>
			<span class="text-xs font-600 text-text-secondary">ELO</span>
			<span class="text-xs font-600 text-text-secondary">W/L</span>
			<span class="text-xs font-600 text-text-secondary">Role</span>
		</div>

		{#each data.users as u}
			{@const badge = roleBadge[u.role] ?? roleBadge.player}
			<div
				class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-border/50 px-4 py-3 last:border-b-0"
			>
				<!-- Avatar -->
				{#if u.image}
					<img src={u.image} alt="" class="h-8 w-8 rounded-full" />
				{:else}
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs font-700 text-text-secondary"
					>
						{u.name.charAt(0).toUpperCase()}
					</div>
				{/if}

				<!-- Name -->
				<div class="min-w-0">
					<p class="truncate text-sm font-500">{u.name}</p>
					<p class="truncate text-xs text-text-secondary">{u.email}</p>
				</div>

				<!-- ELO -->
				<span class="text-sm font-600 tabular-nums text-text-primary">{u.elo}</span>

				<!-- W/L -->
				<span class="text-xs tabular-nums text-text-secondary">
					<span class="text-green-400">{u.wins}W</span> /
					<span class="text-red-400">{u.losses}L</span>
				</span>

				<!-- Role selector -->
				<form
					method="post"
					action="?/setRole"
					use:enhance={() => {
						actionError = '';
						return async ({ result }) => {
							if (
								result.type === 'failure' ||
								(result.type === 'success' && (result.data as any)?.error)
							) {
								actionError = (result.data as any)?.error ?? 'Failed to update role';
							}
						};
					}}
					class="flex items-center gap-2"
				>
					<input type="hidden" name="userId" value={u.id} />
					<select
						name="role"
						value={u.role}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
						class="rounded-md border px-2 py-1 text-xs font-500 {badge.color} cursor-pointer bg-transparent focus:outline-none"
					>
						<option value="player" class="bg-surface-800 text-text-primary">Player</option>
						<option value="referee" class="bg-surface-800 text-text-primary">Referee</option>
						<option value="admin" class="bg-surface-800 text-text-primary">Admin</option>
					</select>
				</form>
			</div>
		{/each}
	</div>
</div>
