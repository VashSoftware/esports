<script lang="ts">
	import { enhance } from '$app/forms';
	import ProfileComments from '$lib/components/ProfileComments.svelte';

	const { data } = $props();

	const t = $derived(data.team);
	let uploading = $state(false);
	let avatarError = $state('');

	function timeAgo(date: string | Date) {
		const d = new Date(date);
		const diff = Date.now() - d.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>{t.name} — Vash Esports</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<div class="relative">
			{#if t.avatarUrl}
				<img src={t.avatarUrl} alt="" class="h-14 w-14 rounded-full object-cover" />
			{:else}
				<div
					class="font-700 flex h-14 w-14 items-center justify-center rounded-full bg-surface-600 text-lg text-text-secondary"
				>
					{t.name.charAt(0).toUpperCase()}
				</div>
			{/if}
			{#if data.canManage}
				<form
					method="POST"
					action="?/uploadAvatar"
					enctype="multipart/form-data"
					use:enhance={() => {
						uploading = true;
						avatarError = '';
						return async ({ result, update }) => {
							uploading = false;
							if (result.type === 'success') {
								await update();
							} else if (result.type === 'failure' && result.data?.error) {
								avatarError = result.data.error as string;
							}
						};
					}}
				>
					<label
						class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100"
					>
						<svg
							class="h-5 w-5 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						<input
							type="file"
							name="avatar"
							accept="image/jpeg,image/png,image/webp,image/gif"
							class="hidden"
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							disabled={uploading}
						/>
					</label>
				</form>
			{/if}
		</div>
		<div>
			<div class="flex items-center gap-2">
				<h1 class="font-700 text-2xl tracking-tight">{t.name}</h1>
				{#if t.isPersonal}
					<span
						class="font-500 rounded bg-surface-600 px-1.5 py-0.5 text-[10px] text-text-secondary"
						>solo</span
					>
				{/if}
			</div>
			<p class="mt-0.5 text-sm text-text-secondary">
				{t.members.length} member{t.members.length !== 1 ? 's' : ''}
				&middot; {data.wins}W {data.losses}L
			</p>
		</div>
	</div>

	{#if avatarError}
		<p class="mt-2 text-sm text-red-400">{avatarError}</p>
	{/if}

	<!-- Players -->
	<div class="mt-6">
		<h2 class="font-600 text-sm text-text-secondary">Players</h2>
		<div class="mt-3 flex flex-col gap-2">
			{#each t.members as member}
				<a
					href="/users/{member.user?.id}"
					class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 px-4 py-3 transition-colors hover:border-accent/30 hover:bg-surface-700"
				>
					{#if member.user?.image}
						<img src={member.user.image} alt="" class="h-8 w-8 rounded-full" />
					{:else}
						<div class="h-8 w-8 rounded-full bg-surface-600"></div>
					{/if}
					<span class="font-600 flex-1 text-sm">{member.user?.name ?? 'Unknown'}</span>
					<span class="text-xs text-text-secondary">{member.role}</span>
				</a>
			{/each}
		</div>
	</div>

	<!-- Recent Matches -->
	{#if data.recentMatches.length > 0}
		<div class="mt-6">
			<h2 class="font-600 text-sm text-text-secondary">Recent Matches</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each data.recentMatches as m}
					{@const p1 = m.participants[0]}
					{@const p2 = m.participants[1]}
					{@const won = m.winnerId === t.id}
					<a
						href="/matches/{m.id}"
						class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 px-4 py-3 transition-colors hover:border-accent/30 hover:bg-surface-700"
					>
						<span class="font-600 text-sm">{p1?.team.name ?? '?'}</span>
						{#if m.state === 'FINISHED'}
							<span
								class="font-700 text-xs tabular-nums {(p1?.score ?? 0) > (p2?.score ?? 0)
									? 'text-green-400'
									: 'text-text-secondary'}">{p1?.score ?? 0}</span
							>
							<span class="text-xs text-text-secondary">-</span>
							<span
								class="font-700 text-xs tabular-nums {(p2?.score ?? 0) > (p1?.score ?? 0)
									? 'text-green-400'
									: 'text-text-secondary'}">{p2?.score ?? 0}</span
							>
						{:else}
							<span class="text-xs text-text-secondary">vs</span>
						{/if}
						<span class="font-600 text-sm">{p2?.team.name ?? '?'}</span>
						<span class="ml-auto text-xs {won ? 'font-600 text-green-400' : 'text-red-400'}"
							>{won ? 'W' : 'L'}</span
						>
						<span class="text-xs text-text-secondary/50">{timeAgo(m.createdAt)}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<ProfileComments comments={data.comments} actionUrl="?/comment" />
</div>
