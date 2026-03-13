<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	const { data } = $props();

	let creating = $state(false);
	let expandedTeam = $state<string | null>(null);
	let addingMemberTo = $state<string | null>(null);
	let renamingTeam = $state<string | null>(null);
	let renameValue = $state('');
	let memberUsername = $state('');
	let actionError = $state('');

	const myTeams = $derived(
		data.teams.filter((t: any) => t.members.some((m: any) => m.userId === data.userId))
	);
	const otherTeams = $derived(
		data.teams.filter(
			(t: any) => !t.isPersonal && !t.members.some((m: any) => m.userId === data.userId)
		)
	);
	const teamCount = $derived(
		data.teams.filter(
			(t: any) => !t.isPersonal || t.members.some((m: any) => m.userId === data.userId)
		).length
	);

	function isOwner(t: any) {
		return t.ownerId === data.userId;
	}
</script>

<svelte:head>
	<title>Teams — Vash Esports</title>
	<meta name="description" content="Browse and manage teams on Vash Esports." />
	<meta property="og:title" content="Teams — Vash Esports" />
	<meta property="og:description" content="Browse and manage teams on Vash Esports." />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="font-700 text-2xl tracking-tight">Teams</h1>
			<p class="mt-1 text-sm text-text-secondary">
				{teamCount} team{teamCount !== 1 ? 's' : ''}
			</p>
		</div>
		<button
			onclick={() => (creating = !creating)}
			class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
		>
			{creating ? 'Cancel' : 'New Team'}
		</button>
	</div>

	<!-- Create Team -->
	{#if creating}
		<form
			method="post"
			action="?/create"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success' && (result.data as any)?.success) {
						creating = false;
						await update();
					}
				};
			}}
			class="mt-4 flex gap-3 rounded-lg border border-border bg-surface-800 p-4"
		>
			<input
				type="text"
				name="name"
				placeholder="Team name"
				required
				class="flex-1 rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
			/>
			<button
				type="submit"
				class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
			>
				Create
			</button>
		</form>
	{/if}

	{#if actionError}
		<p class="mt-3 text-sm text-red-400">{actionError}</p>
	{/if}

	<!-- My Teams -->
	{#if myTeams.length > 0}
		<div class="mt-6">
			<h2 class="font-600 text-sm text-text-secondary">My Teams</h2>
			<div class="mt-3 flex flex-col gap-3">
				{#each myTeams as t}
					<div class="rounded-lg border border-border bg-surface-800 transition-colors">
						<!-- Team header -->
						<button
							onclick={() => (expandedTeam = expandedTeam === t.id ? null : t.id)}
							class="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-700"
						>
							{#if t.avatarUrl}
								<img src={t.avatarUrl} alt="" class="h-10 w-10 rounded-full" />
							{:else}
								<div
									class="font-700 flex h-10 w-10 items-center justify-center rounded-full bg-surface-600 text-sm text-text-secondary"
								>
									{t.name.charAt(0).toUpperCase()}
								</div>
							{/if}
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<a
										href="/teams/{t.id}"
										onclick={(e: MouseEvent) => e.stopPropagation()}
										class="font-600 text-sm hover:text-accent hover:underline">{t.name}</a
									>
									{#if t.isPersonal}
										<span
											class="font-500 rounded bg-surface-600 px-1.5 py-0.5 text-[10px] text-text-secondary"
											>solo</span
										>
									{/if}
								</div>
								<p class="mt-0.5 text-xs text-text-secondary">
									{t.members.length} member{t.members.length !== 1 ? 's' : ''}
								</p>
							</div>
							<span
								class="text-sm text-text-secondary transition-transform {expandedTeam === t.id
									? 'rotate-90'
									: ''}">&rsaquo;</span
							>
						</button>

						<!-- Expanded: members -->
						{#if expandedTeam === t.id}
							<div class="border-t border-border px-4 pt-3 pb-4">
								<!-- Rename team -->
								{#if isOwner(t) && !t.isPersonal}
									{#if renamingTeam === t.id}
										<form
											method="post"
											action="?/rename"
											use:enhance={() => {
												actionError = '';
												return async ({ result, update }) => {
													if (result.type === 'success' && (result.data as any)?.success) {
														renamingTeam = null;
														await update();
													} else if (result.type === 'success' && (result.data as any)?.error) {
														actionError = (result.data as any).error;
													}
												};
											}}
											class="mb-3 flex items-center gap-2"
										>
											<input type="hidden" name="teamId" value={t.id} />
											<!-- svelte-ignore a11y_autofocus -->
											<input
												type="text"
												name="name"
												bind:value={renameValue}
												class="flex-1 rounded-md border border-accent bg-surface-700 px-3 py-1.5 text-sm text-text-primary focus:outline-none"
												autofocus
											/>
											<button
												type="submit"
												class="font-600 rounded-md bg-accent px-3 py-1.5 text-xs text-surface-900 hover:bg-accent-hover"
												>Save</button
											>
											<button
												type="button"
												onclick={() => (renamingTeam = null)}
												class="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-600"
												>Cancel</button
											>
										</form>
									{:else}
										<button
											onclick={() => {
												renamingTeam = t.id;
												renameValue = t.name;
											}}
											class="mb-3 text-xs text-text-secondary transition-colors hover:text-accent"
										>
											✎ Rename team
										</button>
									{/if}
								{/if}

								<!-- Member list -->
								<div class="flex flex-col gap-2">
									{#each t.members as member}
										<div class="flex items-center gap-3 rounded-md bg-surface-700 px-3 py-2">
											{#if member.user?.image}
												<img src={member.user.image} alt="" class="h-6 w-6 rounded-full" />
											{:else}
												<div class="h-6 w-6 rounded-full bg-surface-600"></div>
											{/if}
											<span class="flex-1 text-sm">{member.user?.name ?? 'Unknown'}</span>
											<span class="text-xs text-text-secondary">{member.role}</span>
											{#if isOwner(t) && member.userId !== data.userId}
												<form
													method="post"
													action="?/removeMember"
													use:enhance={() => {
														return async ({ update }) => {
															await update();
														};
													}}
												>
													<input type="hidden" name="memberId" value={member.id} />
													<button
														type="submit"
														class="text-xs text-red-400 opacity-50 transition-opacity hover:opacity-100"
														>&times;</button
													>
												</form>
											{/if}
										</div>
									{/each}
								</div>

								<!-- Add member -->
								{#if isOwner(t) && !t.isPersonal}
									{#if addingMemberTo === t.id}
										<form
											method="post"
											action="?/addMember"
											use:enhance={() => {
												actionError = '';
												return async ({ result, update }) => {
													if (result.type === 'success' && (result.data as any)?.success) {
														memberUsername = '';
														addingMemberTo = null;
														await update();
													} else if (result.type === 'success' && (result.data as any)?.error) {
														actionError = (result.data as any).error;
													}
												};
											}}
											class="mt-3 flex gap-2"
										>
											<input type="hidden" name="teamId" value={t.id} />
											<input
												type="text"
												name="username"
												bind:value={memberUsername}
												placeholder="osu! username"
												required
												class="flex-1 rounded-md border border-border bg-surface-600 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
											/>
											<button
												type="submit"
												class="font-600 rounded-md bg-accent px-3 py-1.5 text-xs text-surface-900 hover:bg-accent-hover"
												>Add</button
											>
											<button
												type="button"
												onclick={() => (addingMemberTo = null)}
												class="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-600"
												>Cancel</button
											>
										</form>
									{:else}
										<button
											onclick={() => (addingMemberTo = t.id)}
											class="mt-3 w-full rounded-md border border-dashed border-border py-2 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
										>
											+ Add Member
										</button>
									{/if}
								{/if}

								<!-- Delete team -->
								{#if isOwner(t) && !t.isPersonal}
									<form method="post" action="?/deleteTeam" use:enhance>
										<input type="hidden" name="teamId" value={t.id} />
										<button
											type="submit"
											onclick={(e) => {
												if (!confirm(`Delete ${t.name}?`)) e.preventDefault();
											}}
											class="mt-3 text-xs text-red-400 opacity-50 transition-opacity hover:opacity-100"
										>
											Delete team
										</button>
									</form>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Other Teams -->
	{#if otherTeams.length > 0}
		<div class="mt-6">
			<h2 class="font-600 text-sm text-text-secondary">Other Teams</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each otherTeams as t}
					<a
						href="/teams/{t.id}"
						class="flex items-center gap-4 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/30 hover:bg-surface-700"
					>
						{#if t.avatarUrl}
							<img src={t.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
						{:else}
							<div
								class="font-700 flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs text-text-secondary"
							>
								{t.name.charAt(0).toUpperCase()}
							</div>
						{/if}
						<div class="flex-1">
							<span class="font-600 text-sm">{t.name}</span>
							<p class="text-xs text-text-secondary">
								{t.members.length} member{t.members.length !== 1 ? 's' : ''}
							</p>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Empty state -->
	{#if data.teams.length === 0}
		<div class="mt-6 rounded-lg border border-dashed border-border py-12 text-center">
			<p class="text-sm text-text-secondary">
				No teams yet. Your personal team is created when you sign in.
			</p>
		</div>
	{/if}
</div>
