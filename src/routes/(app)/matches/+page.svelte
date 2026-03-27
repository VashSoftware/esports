<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DataTable from '$lib/components/DataTable.svelte';

	const { data } = $props();

	let showCreate = $state(false);
	let showInvite = $state(false);
	let createError = $state('');
	let inviteError = $state('');
	let inviteSuccess = $state(false);
	let formDataLoading = $state(false);
	let formData = $state<any>(null);

	// Challenge form state
	let selectedCreatorTeamId = $state('');
	let selectedInvitedTeamId = $state('');
	let bestOf = $state(5);
	let customBestOf = $state('');
	let useCustomBo = $state(false);
	let opponentSearch = $state('');

	// Load form data when create/invite modals open
	$effect(() => {
		if ((showCreate || showInvite) && !formData && !formDataLoading) {
			formDataLoading = true;
			(async () => {
				const formData_elem = new FormData();
				const response = await fetch('?/loadCreateFormData', {
					method: 'POST',
					body: formData_elem
				});
				const result = await response.json();
				if (result.data) {
					formData = result.data;
				}
				formDataLoading = false;
			})();
		}
	});

	const personalTeam = $derived((formData ?? data).userTeams?.find((t: any) => t.isPersonal));
	const nonPersonalUserTeams = $derived(
		(formData ?? data).userTeams?.filter((t: any) => !t.isPersonal) ?? []
	);
	const hasMultipleTeams = $derived(nonPersonalUserTeams.length > 0);

	$effect(() => {
		if (!selectedCreatorTeamId && personalTeam) {
			selectedCreatorTeamId = personalTeam.id;
		}
	});

	const selectedCreatorTeam = $derived(
		(formData ?? data).teams?.find((t: any) => t.id === selectedCreatorTeamId)
	);
	const selectedInvitedTeam = $derived(
		(formData ?? data).teams?.find((t: any) => t.id === selectedInvitedTeamId)
	);
	const creatorIsPersonal = $derived(selectedCreatorTeam?.isPersonal ?? true);

	const creatorMaxSize = $derived(selectedCreatorTeam?.memberCount ?? 1);
	const invitedMaxSize = $derived(selectedInvitedTeam?.memberCount ?? 1);

	const effectiveBestOf = $derived(useCustomBo ? parseInt(customBestOf) || 5 : bestOf);

	const filteredOpponentTeams = $derived(
		(formData ?? data).teams?.filter((t: any) => {
			if (t.id === selectedCreatorTeamId) return false;
			if (!opponentSearch) return true;
			return t.name.toLowerCase().includes(opponentSearch.toLowerCase());
		}) ?? []
	);

	function teamDisplayName(t: any): string {
		return t.name;
	}

	function mappoolSummary(p: any): string {
		const slots = p.slots ?? [];
		if (!slots.length) return '0 maps';
		const avg = slots.reduce((s: number, sl: any) => s + (sl.starRating ?? 0), 0) / slots.length;
		const counts: Record<string, number> = {};
		for (const sl of slots) {
			counts[sl.category] = (counts[sl.category] ?? 0) + 1;
		}
		const parts = Object.entries(counts).map(([cat, n]) => `${n}${cat}`);
		return `${avg.toFixed(1)}★ · ${parts.join(', ')}`;
	}

	const stateConfig: Record<string, { label: string; color: string; dot?: string }> = {
		CREATED: { label: 'Created', color: 'text-text-secondary border-border' },
		LOBBY: { label: 'In Lobby', color: 'text-yellow-400 border-yellow-500/30' },
		ROLLING: {
			label: 'Rolling',
			color: 'text-yellow-400 border-yellow-500/30',
			dot: 'bg-yellow-400'
		},
		PICKING: {
			label: 'Picking',
			color: 'text-blue-400 border-blue-500/30',
			dot: 'bg-blue-400'
		},
		PLAYING: {
			label: 'Live',
			color: 'text-green-400 border-green-500/30',
			dot: 'bg-green-400'
		},
		FINISHED: { label: 'Finished', color: 'text-text-secondary border-border' },
		CANCELLED: { label: 'Cancelled', color: 'text-red-400 border-red-500/30' }
	};

	function teamDisplay(m: any) {
		const p1 = m.participants[0];
		const p2 = m.participants[1];
		return { p1, p2 };
	}

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

	const columns = [
		{ key: 'teams', label: 'Match' },
		{ key: 'format', label: 'Format' },
		{ key: 'state', label: 'State' },
		{ key: 'createdAt', label: 'Date', sortable: true, class: 'hidden sm:table-cell' }
	];
</script>

<svelte:head>
	<title>Matches — Vash Esports</title>
	<meta name="description" content="Browse all osu! tournament matches on Vash Esports." />
	<meta property="og:title" content="Matches — Vash Esports" />
	<meta property="og:description" content="Browse all osu! tournament matches on Vash Esports." />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-5xl">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="font-700 text-2xl tracking-tight">Matches</h1>
			<p class="mt-1 text-sm text-text-secondary">
				{data.meta.total} match{data.meta.total !== 1 ? 'es' : ''}
				{#if data.liveMatches.length > 0}
					&middot; <span class="text-green-400">{data.liveMatches.length} live</span>
				{/if}
			</p>
		</div>
		<div class="flex gap-2">
			{#if (formData ?? data).userTeams?.length > 0}
				<button
					onclick={() => {
						showInvite = !showInvite;
						if (showInvite) showCreate = false;
					}}
					disabled={formDataLoading && showInvite}
					class="font-600 rounded-md border border-accent/30 px-4 py-2 text-sm text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
				>
					{showInvite && formDataLoading ? 'Loading...' : showInvite ? 'Cancel' : 'Challenge'}
				</button>
			{/if}
			{#if data.canCreateMatch}
				<button
					onclick={() => {
						showCreate = !showCreate;
						if (showCreate) showInvite = false;
					}}
					disabled={formDataLoading && showCreate}
					class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50"
				>
					{showCreate && formDataLoading ? 'Loading...' : showCreate ? 'Cancel' : 'New Match'}
				</button>
			{/if}
		</div>
	</div>

	<!-- Create Match Modal -->
	{#if showCreate && data.canCreateMatch}
		<form
			method="post"
			action="?/createMatch"
			use:enhance={() => {
				createError = '';
				return async ({ result, update }) => {
					if (
						result.type === 'failure' ||
						(result.type === 'success' && (result.data as any)?.error)
					) {
						createError = (result.data as any)?.error ?? 'Failed to create match';
					} else {
						await update();
					}
				};
			}}
			class="mb-4 rounded-lg border border-accent/20 bg-surface-800 p-5"
		>
			<h2 class="font-600 text-sm">Create Match</h2>

			{#if createError}
				<p class="mt-2 text-sm text-red-400">{createError}</p>
			{/if}

			<div class="mt-4 grid grid-cols-2 gap-4">
				<div>
					<label for="name" class="font-500 text-xs text-text-secondary">Match Name</label>
					<input
						type="text"
						id="name"
						name="name"
						placeholder="e.g. Semifinals M1"
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
					/>
				</div>

				<div>
					<label for="bestOf" class="font-500 text-xs text-text-secondary">Best Of</label>
					<select
						id="bestOf"
						name="bestOf"
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						{#each [3, 5, 7, 9, 11, 13] as n}
							<option value={n} selected={n === 7}>BO{n} (first to {Math.ceil(n / 2)})</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="team1" class="font-500 text-xs text-text-secondary">Team 1</label>
					<select
						id="team1"
						name="team1"
						required
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						<option value="">Select team...</option>
						{#each formData?.teams ?? [] as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="team2" class="font-500 text-xs text-text-secondary">Team 2</label>
					<select
						id="team2"
						name="team2"
						required
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						<option value="">Select team...</option>
						{#each formData?.teams ?? [] as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</div>

				<div class="col-span-2">
					<label for="mappool" class="font-500 text-xs text-text-secondary">Mappool</label>
					<select
						id="mappool"
						name="mappool"
						required
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						<option value="">Select mappool...</option>
						{#each formData?.mappools ?? [] as p}
							<option value={p.id}>{p.name} ({p.slots.length} maps)</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="mt-4 flex justify-end">
				<button
					type="submit"
					class="font-600 rounded-md bg-accent px-5 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
				>
					Create &amp; Start
				</button>
			</div>
		</form>
	{/if}

	<!-- Challenge / Invite Form -->
	{#if showInvite}
		<form
			method="post"
			action="?/createInvite"
			use:enhance={() => {
				inviteError = '';
				inviteSuccess = false;
				return async ({ result, update }) => {
					if (
						result.type === 'failure' ||
						(result.type === 'success' && (result.data as any)?.error)
					) {
						inviteError = (result.data as any)?.error ?? 'Failed to send invite';
					} else if (result.type === 'success' && (result.data as any)?.inviteSuccess) {
						inviteSuccess = true;
						await invalidateAll();
						setTimeout(() => {
							showInvite = false;
							inviteSuccess = false;
						}, 2000);
					} else {
						await update();
					}
				};
			}}
			class="mb-4 rounded-lg border border-accent/20 bg-surface-800 p-5"
		>
			<h2 class="font-600 text-sm">Challenge</h2>

			{#if inviteError}
				<p class="mt-2 text-sm text-red-400">{inviteError}</p>
			{/if}
			{#if inviteSuccess}
				<p class="mt-2 text-sm text-green-400">Invite sent!</p>
			{/if}

			<input type="hidden" name="bestOf" value={effectiveBestOf} />
			<input type="hidden" name="creatorTeamId" value={selectedCreatorTeamId} />
			<input type="hidden" name="invitedTeamId" value={selectedInvitedTeamId} />

			<div class="mt-4 flex flex-col gap-4">
				{#if hasMultipleTeams}
					<div>
						<label for="inv-myTeam" class="font-500 text-xs text-text-secondary">Your Team</label>
						<select
							id="inv-myTeam"
							bind:value={selectedCreatorTeamId}
							class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
						>
							{#if personalTeam}
								<option value={personalTeam.id}>{teamDisplayName(personalTeam)}</option>
							{/if}
							{#each nonPersonalUserTeams as t}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div>
					<label for="inv-opponent-search" class="font-500 text-xs text-text-secondary"
						>Opponent</label
					>
					<input
						type="text"
						id="inv-opponent-search"
						bind:value={opponentSearch}
						placeholder="Search players or teams..."
						class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
						autocomplete="off"
					/>
					{#if selectedInvitedTeam}
						<div
							class="mt-1.5 flex items-center gap-2 rounded-md bg-accent/10 px-3 py-1.5 text-xs text-accent"
						>
							<span class="font-600">{teamDisplayName(selectedInvitedTeam)}</span>
							<span class="text-text-secondary"
								>({selectedInvitedTeam.memberCount} player{selectedInvitedTeam.memberCount !== 1
									? 's'
									: ''})</span
							>
							<button
								type="button"
								onclick={() => {
									selectedInvitedTeamId = '';
									opponentSearch = '';
								}}
								class="ml-auto text-text-secondary hover:text-red-400">&times;</button
							>
						</div>
					{:else if opponentSearch}
						<div
							class="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-surface-700"
						>
							{#each filteredOpponentTeams.slice(0, 20) as t}
								<button
									type="button"
									onclick={() => {
										selectedInvitedTeamId = t.id;
										opponentSearch = '';
									}}
									class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-600"
								>
									{#if t.avatarUrl}
										<img src={t.avatarUrl} alt="" class="h-5 w-5 rounded-full" />
									{/if}
									<span class="font-500">{teamDisplayName(t)}</span>
									{#if !t.isPersonal}
										<span class="text-xs text-text-secondary">({t.memberCount}p)</span>
									{/if}
								</button>
							{:else}
								<div class="px-3 py-2 text-xs text-text-secondary">No results</div>
							{/each}
						</div>
					{/if}
				</div>

				<div>
					<span class="font-500 text-xs text-text-secondary">Best Of</span>
					<div class="mt-1.5 flex flex-wrap gap-1.5">
						{#each [3, 5, 7, 9, 11, 13] as n}
							<button
								type="button"
								onclick={() => {
									bestOf = n;
									useCustomBo = false;
									customBestOf = '';
								}}
								class="font-600 rounded-md px-3 py-1.5 text-xs transition-colors {!useCustomBo &&
								bestOf === n
									? 'bg-accent text-surface-900'
									: 'border border-border bg-surface-700 text-text-secondary hover:border-accent/40 hover:text-text-primary'}"
								>BO{n}</button
							>
						{/each}
						<input
							type="number"
							min="1"
							step="2"
							placeholder="Custom"
							bind:value={customBestOf}
							onfocus={() => (useCustomBo = true)}
							oninput={() => (useCustomBo = true)}
							class="w-20 rounded-md border {useCustomBo
								? 'border-accent'
								: 'border-border'} bg-surface-700 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					{#if !creatorIsPersonal && creatorMaxSize > 1}
						<div>
							<label for="inv-ts1" class="font-500 text-xs text-text-secondary"
								>Your Team Size</label
							>
							<select
								id="inv-ts1"
								name="teamSize1"
								class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
							>
								{#each Array.from({ length: creatorMaxSize }, (_, i) => i + 1) as n}
									<option value={n} selected={n === creatorMaxSize}>{n}v</option>
								{/each}
							</select>
						</div>
					{:else}
						<input type="hidden" name="teamSize1" value="1" />
					{/if}

					{#if selectedInvitedTeam && !selectedInvitedTeam.isPersonal && invitedMaxSize > 1}
						<div>
							<label for="inv-ts2" class="font-500 text-xs text-text-secondary"
								>Opponent Team Size</label
							>
							<select
								id="inv-ts2"
								name="teamSize2"
								class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
							>
								{#each Array.from({ length: invitedMaxSize }, (_, i) => i + 1) as n}
									<option value={n} selected={n === invitedMaxSize}>v{n}</option>
								{/each}
							</select>
						</div>
					{:else}
						<input type="hidden" name="teamSize2" value="1" />
					{/if}

					<div>
						<label for="inv-scoring" class="font-500 text-xs text-text-secondary">Scoring</label>
						<select
							id="inv-scoring"
							name="scoringType"
							class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
						>
							<option value="score_v2" selected>ScoreV2</option>
							<option value="score">Score</option>
							<option value="accuracy">Accuracy</option>
							<option value="combo">Combo</option>
						</select>
					</div>

					<div>
						<label for="inv-mappool" class="font-500 text-xs text-text-secondary">Mappool</label>
						<select
							id="inv-mappool"
							name="mappool"
							required
							class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
						>
							<option value="">Select mappool...</option>
							{#each formData?.mappools ?? [] as p}
								<option value={p.id}>{p.name} — {mappoolSummary(p)}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<label class="flex items-center gap-2 text-xs text-text-secondary">
						<input
							type="checkbox"
							name="allowEloChange"
							checked
							class="rounded border-border bg-surface-700 text-accent focus:ring-accent"
						/>
						Affects ELO
					</label>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="inv-message" class="font-500 text-xs text-text-secondary"
							>Message (optional)</label
						>
						<input
							type="text"
							id="inv-message"
							name="message"
							placeholder="e.g. ggs only"
							class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
						/>
					</div>
					<div>
						<label for="inv-schedule" class="font-500 text-xs text-text-secondary"
							>Schedule (optional)</label
						>
						<input
							type="datetime-local"
							id="inv-schedule"
							name="scheduledAt"
							class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
					</div>
				</div>
			</div>

			<div class="mt-4 flex justify-end">
				<button
					type="submit"
					disabled={!selectedInvitedTeamId}
					class="font-600 rounded-md bg-accent px-5 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-40"
				>
					Send Challenge
				</button>
			</div>
		</form>
	{/if}

	<!-- Live Matches -->
	{#if data.liveMatches.length > 0}
		<div class="mb-6">
			<h2 class="font-600 flex items-center gap-2 text-sm">
				<div class="relative h-2 w-2">
					<div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div>
					<div class="relative h-2 w-2 rounded-full bg-green-400"></div>
				</div>
				Live Now
			</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each data.liveMatches as m}
					{@const { p1, p2 } = teamDisplay(m)}
					{@const sc = stateConfig[m.state]}
					<a
						href="/matches/{m.id}"
						class="group flex items-center gap-4 rounded-lg border border-white/15 bg-surface-800 p-4 transition-all hover:border-white/30 hover:bg-surface-700"
					>
						<div class="flex flex-1 items-center gap-3">
							{#if p1?.team.avatarUrl}
								<img src={p1.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
							{/if}
							<span class="font-600 text-sm">{p1?.team.name ?? '?'}</span>
						</div>

						<div class="flex items-center gap-3">
							<span class="font-800 text-xl tabular-nums">{p1?.score ?? 0}</span>
							<span class="font-600 text-xs text-text-secondary">vs</span>
							<span class="font-800 text-xl tabular-nums">{p2?.score ?? 0}</span>
						</div>

						<div class="flex flex-1 items-center justify-end gap-3">
							<span class="font-600 text-sm">{p2?.team.name ?? '?'}</span>
							{#if p2?.team.avatarUrl}
								<img src={p2.team.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
							{/if}
						</div>

						<span
							class="font-500 flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs {sc?.color ??
								'border-border'}"
						>
							{#if sc?.dot}
								<span class="h-1.5 w-1.5 rounded-full {sc.dot}"></span>
							{/if}
							{sc?.label ?? m.state}
						</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- All Matches Table -->
	<DataTable data={data.matches} meta={data.meta} {columns} searchPlaceholder="Search matches...">
		{#snippet row(m, _i)}
			{@const { p1, p2 } = teamDisplay(m)}
			{@const config = m.config as { bestOf: number }}
			{@const sc = stateConfig[m.state]}
			<tr class="transition-colors hover:bg-surface-800/50">
				<td class="px-4 py-3">
					<a href="/matches/{m.id}" class="block hover:text-accent">
						<div class="flex items-center gap-2">
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
							{#if m.state === 'FINISHED' && m.winnerId}
								{@const winner = m.participants.find((p: any) => p.teamId === m.winnerId)}
								<span class="ml-1 text-xs text-green-400">W: {winner?.team.name}</span>
							{/if}
						</div>
						{#if m.name}
							<p class="mt-0.5 text-xs text-text-secondary">{m.name}</p>
						{/if}
					</a>
				</td>
				<td class="px-4 py-3">
					<span class="text-xs text-text-secondary">BO{config.bestOf}</span>
				</td>
				<td class="px-4 py-3">
					<span class="font-500 rounded border px-2 py-0.5 text-xs {sc?.color ?? 'border-border'}">
						{sc?.label ?? m.state}
					</span>
				</td>
				<td class="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
					{timeAgo(m.finishedAt ?? m.createdAt)}
				</td>
			</tr>
		{/snippet}
	</DataTable>
</div>
