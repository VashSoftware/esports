<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { SvelteMap } from 'svelte/reactivity';

	const { data } = $props();
	const t = $derived(data.tournament);
	const matches = $derived(data.matches);

	let activeTab = $state('overview');
	let actionError = $state('');
	let actionSuccess = $state('');

	// round form state
	let showAddRound = $state(false);
	let editingRoundId = $state<string | null>(null);

	const formatLabels: Record<string, string> = {
		single_elim: 'Single Elimination',
		double_elim: 'Double Elimination',
		groups_bracket: 'Groups + Bracket'
	};

	const stateColors: Record<string, string> = {
		DRAFT: 'bg-surface-600 text-text-secondary',
		REGISTRATION: 'bg-green-900 text-green-300',
		QUALIFIERS: 'bg-yellow-900 text-yellow-300',
		SEEDING: 'bg-yellow-900 text-yellow-300',
		BRACKET: 'bg-blue-900 text-blue-300',
		FINISHED: 'bg-surface-700 text-text-secondary',
		CANCELLED: 'bg-red-900 text-red-300'
	};

	const activeRegs = $derived(
		t.registrations.filter((r: any) => r.status !== 'withdrawn' && r.status !== 'eliminated')
	);

	// invite link
	const inviteUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.origin}/tournaments/${t.id}`
			: `/tournaments/${t.id}`
	);
	let copied = $state(false);
	function copyInvite() {
		navigator.clipboard.writeText(inviteUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	// bracket helpers
	const wbMatches = $derived(
		matches.filter((m: any) => m.round?.bracketType === 'winners' || !m.round?.bracketType)
	);
	const lbMatches = $derived(matches.filter((m: any) => m.round?.bracketType === 'losers'));
	const gfMatches = $derived(matches.filter((m: any) => m.round?.bracketType === 'grand_final'));

	function groupByRound(matchList: any[]) {
		const rounds = new SvelteMap<number, { round: any; matches: any[] }>();
		for (const m of matchList) {
			const order = m.round?.roundOrder ?? 0;
			if (!rounds.has(order)) {
				rounds.set(order, { round: m.round, matches: [] });
			}
			rounds.get(order)!.matches.push(m);
		}
		return Array.from(rounds.values()).sort((a, b) => a.round.roundOrder - b.round.roundOrder);
	}

	const wbRounds = $derived(groupByRound(wbMatches));
	const lbRounds = $derived(groupByRound(lbMatches));

	function handleAction() {
		return ({ result }: any) => {
			if (result.type === 'failure' || (result.type === 'success' && result.data?.error)) {
				actionError = result.data?.error ?? 'Something went wrong';
				actionSuccess = '';
			} else {
				actionError = '';
				invalidateAll();
			}
		};
	}

	function handleActionWithMessage(msg: string) {
		return ({ result }: any) => {
			if (result.type === 'failure' || (result.type === 'success' && result.data?.error)) {
				actionError = result.data?.error ?? 'Something went wrong';
				actionSuccess = '';
			} else {
				actionError = '';
				actionSuccess = msg;
				showAddRound = false;
				editingRoundId = null;
				invalidateAll();
				setTimeout(() => (actionSuccess = ''), 3000);
			}
		};
	}

	// which tabs to show
	const tabs = $derived(() => {
		const list: [string, string][] = [['overview', 'Overview']];
		if (matches.length > 0) list.push(['bracket', 'Bracket']);
		list.push(['registrations', 'Registrations']);
		list.push(['rounds', 'Rounds']);
		if (t.format === 'groups_bracket' && t.groups.length > 0) list.push(['groups', 'Groups']);
		if (data.isStaff) list.push(['settings', 'Settings']);
		return list;
	});
</script>

<svelte:head>
	<title>{t.name} — Vash Esports</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="font-700 text-2xl tracking-tight">{t.name}</h1>
				<span
					class="font-500 rounded px-2 py-0.5 text-xs {stateColors[t.state] ??
						'bg-surface-600 text-text-secondary'}"
				>
					{t.state}
				</span>
			</div>
			{#if t.description}
				<p class="mt-1 text-sm text-text-secondary">{t.description}</p>
			{/if}
			<p class="mt-1 text-xs text-text-secondary">
				{formatLabels[t.format] ?? t.format}
				&middot; {activeRegs.length}/{t.maxSlots} players
				{#if t.startAt}
					&middot; starts {new Date(t.startAt).toLocaleDateString()}
				{/if}
			</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={copyInvite}
				class="font-600 rounded-md border border-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary"
			>
				{copied ? 'Copied!' : 'Copy Link'}
			</button>
		</div>
	</div>

	<!-- Errors / Success -->
	{#if actionError}
		<div class="mt-4 rounded-md border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
			{actionError}
			<button onclick={() => (actionError = '')} class="ml-2 text-red-400 hover:text-red-300"
				>&times;</button
			>
		</div>
	{/if}
	{#if actionSuccess}
		<div
			class="mt-4 rounded-md border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300"
		>
			{actionSuccess}
		</div>
	{/if}

	<!-- Registration banner for players -->
	{#if t.state === 'REGISTRATION' && !data.isStaff}
		<div class="mt-4 rounded-lg border border-border bg-surface-800 p-4">
			{#if data.userRegistration}
				<div class="flex items-center justify-between">
					<span class="text-sm text-green-400"
						>You are registered with {data.userRegistration.team?.name ?? 'your team'}</span
					>
					<form method="POST" action="?/withdraw" use:enhance={() => handleAction()}>
						<input type="hidden" name="teamId" value={data.userRegistration.teamId} />
						<button
							class="font-600 rounded-md border border-red-800 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/30"
						>
							Withdraw
						</button>
					</form>
				</div>
			{:else if data.userTeams.length > 0}
				<form
					method="POST"
					action="?/register"
					use:enhance={() => handleAction()}
					class="flex items-center gap-3"
				>
					<span class="font-500 text-xs text-text-secondary">Register as:</span>
					<select
						name="teamId"
						required
						class="rounded-md border border-border bg-surface-700 px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
					>
						{#each data.userTeams as team}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
					<button
						class="font-600 rounded-md bg-accent px-4 py-1.5 text-xs text-surface-900 transition-colors hover:bg-accent-hover"
					>
						Register
					</button>
				</form>
			{:else}
				<p class="text-sm text-text-secondary">You need a team to register for this tournament</p>
			{/if}
		</div>
	{/if}

	<!-- Tabs -->
	<div class="mt-6 flex border-b border-border">
		{#each tabs() as [value, label]}
			<button
				class="font-500 border-b-2 px-4 py-2 text-sm transition-colors {activeTab === value
					? 'border-accent text-text-primary'
					: 'border-transparent text-text-secondary hover:text-text-primary'}"
				onclick={() => (activeTab = value)}
			>
				{label}
			</button>
		{/each}
	</div>

	<!-- Tab Content -->
	<div class="mt-4">
		{#if activeTab === 'overview'}
			{@render overviewTab()}
		{:else if activeTab === 'bracket'}
			{@render bracketTab()}
		{:else if activeTab === 'registrations'}
			{@render registrationsTab()}
		{:else if activeTab === 'rounds'}
			{@render roundsTab()}
		{:else if activeTab === 'groups'}
			{@render groupsTab()}
		{:else if activeTab === 'settings'}
			{@render settingsTab()}
		{/if}
	</div>
</div>

<!-- ─── Overview Tab ─────────────────────────────────────────────────── -->
{#snippet overviewTab()}
	<div class="grid gap-4 md:grid-cols-2">
		<!-- Tournament Info -->
		<div class="rounded-lg border border-border bg-surface-800 p-5">
			<h3 class="font-600 text-sm">Details</h3>
			<dl class="mt-3 flex flex-col gap-2 text-sm">
				<div class="flex justify-between">
					<dt class="text-text-secondary">Format</dt>
					<dd class="font-500">{formatLabels[t.format] ?? t.format}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-text-secondary">Players</dt>
					<dd class="font-500">{activeRegs.length} / {t.maxSlots}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-text-secondary">Team Size</dt>
					<dd class="font-500">
						{(t.config as any)?.teamSize ?? 1}v{(t.config as any)?.teamSize ?? 1}
					</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-text-secondary">Scoring</dt>
					<dd class="font-500">{(t.config as any)?.scoringType ?? 'score_v2'}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-text-secondary">Rounds</dt>
					<dd class="font-500">{t.rounds.length}</dd>
				</div>
				{#if t.startAt}
					<div class="flex justify-between">
						<dt class="text-text-secondary">Start Date</dt>
						<dd class="font-500">{new Date(t.startAt).toLocaleString()}</dd>
					</div>
				{/if}
			</dl>
		</div>

		<!-- Staff -->
		<div class="rounded-lg border border-border bg-surface-800 p-5">
			<h3 class="font-600 text-sm">Staff</h3>
			{#if t.staff.length === 0}
				<p class="mt-3 text-sm text-text-secondary">No staff assigned</p>
			{:else}
				<div class="mt-3 flex flex-col gap-1.5">
					{#each t.staff as s}
						<div class="flex items-center justify-between text-sm">
							<span class="font-500">{s.userId.slice(0, 8)}...</span>
							<span class="rounded bg-surface-600 px-2 py-0.5 text-xs text-text-secondary"
								>{s.role}</span
							>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Share / Invite -->
		<div class="rounded-lg border border-border bg-surface-800 p-5 md:col-span-2">
			<h3 class="font-600 text-sm">Invite Players</h3>
			<p class="mt-1 text-xs text-text-secondary">
				Share this link with players to let them register
			</p>
			<div class="mt-3 flex gap-2">
				<input
					type="text"
					readonly
					value={inviteUrl}
					class="flex-1 rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:outline-none"
				/>
				<button
					onclick={copyInvite}
					class="font-600 rounded-md bg-accent px-4 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
				>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>
		</div>

		<!-- Quick Rounds Preview -->
		{#if t.rounds.length > 0}
			<div class="rounded-lg border border-border bg-surface-800 p-5 md:col-span-2">
				<div class="flex items-center justify-between">
					<h3 class="font-600 text-sm">Rounds</h3>
					<button
						onclick={() => (activeTab = 'rounds')}
						class="text-xs text-accent hover:text-accent-hover">View all</button
					>
				</div>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each t.rounds as round}
						<div
							class="flex items-center gap-2 rounded-md border border-border bg-surface-700 px-3 py-1.5 text-xs"
						>
							<span class="font-600">{round.abbreviation ?? round.name}</span>
							<span class="text-text-secondary">BO{round.bestOf}</span>
							{#if round.mappool}
								<span class="text-text-secondary">&middot; {round.mappool.name}</span>
							{:else}
								<span class="text-yellow-400">no pool</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/snippet}

<!-- ─── Bracket Tab ──────────────────────────────────────────────────── -->
{#snippet bracketTab()}
	{#if matches.length === 0}
		<div class="rounded-lg border border-dashed border-border py-12 text-center">
			<p class="text-sm text-text-secondary">Bracket has not been generated yet</p>
		</div>
	{:else}
		<!-- Winners Bracket -->
		{#if wbRounds.length > 0}
			{#if t.format === 'double_elim'}
				<h3 class="font-600 mb-3 text-xs text-text-secondary uppercase">Winners Bracket</h3>
			{/if}
			<div class="mb-8 flex gap-6 overflow-x-auto pb-4">
				{#each wbRounds as { round, matches: roundMatches }}
					<div class="shrink-0">
						<div class="mb-2 text-center text-xs text-text-secondary">
							{round?.name ?? 'Round'}
						</div>
						<div
							class="flex flex-col justify-around gap-3"
							style="min-height: {roundMatches.length * 80}px"
						>
							{#each roundMatches.sort((a: any, b: any) => a.bracketPosition - b.bracketPosition) as m}
								{@render matchCard(m)}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Losers Bracket -->
		{#if lbRounds.length > 0}
			<h3 class="font-600 mb-3 text-xs text-text-secondary uppercase">Losers Bracket</h3>
			<div class="mb-8 flex gap-6 overflow-x-auto pb-4">
				{#each lbRounds as { round, matches: roundMatches }}
					<div class="shrink-0">
						<div class="mb-2 text-center text-xs text-text-secondary">
							{round?.name ?? 'Round'}
						</div>
						<div class="flex flex-col justify-around gap-3">
							{#each roundMatches.sort((a: any, b: any) => a.bracketPosition - b.bracketPosition) as m}
								{@render matchCard(m)}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Grand Finals -->
		{#if gfMatches.length > 0}
			<h3 class="font-600 mb-3 text-xs text-text-secondary uppercase">Grand Finals</h3>
			<div class="mb-8 flex gap-6">
				{#each gfMatches.sort((a: any, b: any) => (a.round?.roundOrder ?? 0) - (b.round?.roundOrder ?? 0)) as m}
					{@render matchCard(m)}
				{/each}
			</div>
		{/if}
	{/if}
{/snippet}

<!-- ─── Registrations Tab ────────────────────────────────────────────── -->
{#snippet registrationsTab()}
	<div class="rounded-lg border border-border bg-surface-800">
		{#if t.registrations.length === 0}
			<div class="py-8 text-center text-sm text-text-secondary">No registrations yet</div>
		{:else}
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-border text-left">
						<th class="font-500 px-4 py-3 text-xs text-text-secondary">Seed</th>
						<th class="font-500 px-4 py-3 text-xs text-text-secondary">Team</th>
						<th class="font-500 px-4 py-3 text-xs text-text-secondary">Status</th>
						<th class="font-500 px-4 py-3 text-xs text-text-secondary">Registered</th>
					</tr>
				</thead>
				<tbody>
					{#each t.registrations as reg}
						<tr class="border-b border-border/50 hover:bg-surface-700">
							<td class="px-4 py-3 text-text-secondary">{reg.seed ?? '-'}</td>
							<td class="font-500 px-4 py-3">{reg.team?.name ?? 'Unknown'}</td>
							<td class="px-4 py-3">
								<span
									class="font-500 rounded px-2 py-0.5 text-xs {reg.status === 'registered' ||
									reg.status === 'confirmed'
										? 'bg-green-900 text-green-300'
										: reg.status === 'withdrawn'
											? 'bg-red-900 text-red-300'
											: 'bg-surface-600 text-text-secondary'}"
								>
									{reg.status}
								</span>
							</td>
							<td class="px-4 py-3 text-text-secondary">
								{new Date(reg.registeredAt).toLocaleDateString()}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/snippet}

<!-- ─── Rounds Tab ───────────────────────────────────────────────────── -->
{#snippet roundsTab()}
	<div class="flex flex-col gap-3">
		{#if t.rounds.length === 0 && !showAddRound}
			<div class="rounded-lg border border-dashed border-border py-8 text-center">
				<p class="text-sm text-text-secondary">No rounds configured yet</p>
				{#if data.isStaff && t.state === 'DRAFT'}
					<button
						onclick={() => (showAddRound = true)}
						class="font-600 mt-3 rounded-md bg-accent px-4 py-2 text-xs text-surface-900 transition-colors hover:bg-accent-hover"
					>
						Add First Round
					</button>
				{/if}
			</div>
		{:else}
			{#each t.rounds as round}
				{#if editingRoundId === round.id && data.isStaff}
					<!-- Inline edit form -->
					<form
						method="POST"
						action="?/updateRound"
						use:enhance={() => handleActionWithMessage('Round updated')}
						class="rounded-lg border border-accent/20 bg-surface-800 p-4"
					>
						<input type="hidden" name="roundId" value={round.id} />
						<div class="grid grid-cols-2 gap-3">
							<div>
								<span class="font-500 text-xs text-text-secondary">Name</span>
								<input
									name="name"
									type="text"
									value={round.name}
									required
									class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
								/>
							</div>
							<div>
								<span class="font-500 text-xs text-text-secondary">Abbreviation</span>
								<input
									name="abbreviation"
									type="text"
									value={round.abbreviation ?? ''}
									class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
								/>
							</div>
							<div>
								<span class="font-500 text-xs text-text-secondary">Best Of</span>
								<select
									name="bestOf"
									class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
								>
									{#each [3, 5, 7, 9, 11, 13] as n}
										<option value={n} selected={n === round.bestOf}>BO{n}</option>
									{/each}
								</select>
							</div>
							<div>
								<span class="font-500 text-xs text-text-secondary">Mappool</span>
								<select
									name="mappoolId"
									class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
								>
									<option value="">None</option>
									{#each data.mappools as mp}
										<option value={mp.id} selected={mp.id === round.mappoolId}
											>{mp.name} ({mp.slotCount} maps)</option
										>
									{/each}
								</select>
							</div>
							<div class="col-span-2">
								<span class="font-500 text-xs text-text-secondary">Scheduled At</span>
								<input
									name="scheduledAt"
									type="datetime-local"
									value={round.scheduledAt
										? new Date(round.scheduledAt).toISOString().slice(0, 16)
										: ''}
									class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
								/>
							</div>
						</div>
						<div class="mt-3 flex justify-end gap-2">
							<button
								type="button"
								onclick={() => (editingRoundId = null)}
								class="font-600 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="font-600 rounded-md bg-accent px-4 py-1.5 text-xs text-surface-900 transition-colors hover:bg-accent-hover"
							>
								Save
							</button>
						</div>
					</form>
				{:else}
					<!-- Round card -->
					<div class="rounded-lg border border-border bg-surface-800 p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<span class="font-600 text-sm">{round.name}</span>
								{#if round.abbreviation}
									<span class="rounded bg-surface-600 px-2 py-0.5 text-xs text-text-secondary"
										>{round.abbreviation}</span
									>
								{/if}
								<span class="text-xs text-text-secondary">BO{round.bestOf}</span>
							</div>
							<div class="flex items-center gap-3">
								{#if round.mappool}
									<span class="text-xs text-text-secondary"
										>{round.mappool.name} ({round.mappool.slots.length} maps)</span
									>
								{:else}
									<span class="text-xs text-yellow-400">no mappool</span>
								{/if}
								{#if round.scheduledAt}
									<span class="text-xs text-text-secondary"
										>{new Date(round.scheduledAt).toLocaleString()}</span
									>
								{/if}
								{#if data.isStaff && t.state === 'DRAFT'}
									<button
										onclick={() => (editingRoundId = round.id)}
										class="text-xs text-accent hover:text-accent-hover"
									>
										Edit
									</button>
									<form
										method="POST"
										action="?/deleteRound"
										use:enhance={() => handleActionWithMessage('Round deleted')}
									>
										<input type="hidden" name="roundId" value={round.id} />
										<button class="text-xs text-red-400 hover:text-red-300">Delete</button>
									</form>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			{/each}
		{/if}

		<!-- Add Round Form -->
		{#if data.isStaff && t.state === 'DRAFT'}
			{#if showAddRound}
				<form
					method="POST"
					action="?/addRound"
					use:enhance={() => handleActionWithMessage('Round added')}
					class="rounded-lg border border-accent/20 bg-surface-800 p-4"
				>
					<h3 class="font-600 text-sm">Add Round</h3>
					<div class="mt-3 grid grid-cols-2 gap-3">
						<div>
							<span class="font-500 text-xs text-text-secondary">Name</span>
							<input
								name="name"
								type="text"
								required
								placeholder="e.g. Quarterfinals"
								class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
							/>
						</div>
						<div>
							<span class="font-500 text-xs text-text-secondary">Abbreviation</span>
							<input
								name="abbreviation"
								type="text"
								placeholder="e.g. QF"
								class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
							/>
						</div>
						<div>
							<span class="font-500 text-xs text-text-secondary">Best Of</span>
							<select
								name="bestOf"
								class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
							>
								{#each [3, 5, 7, 9, 11, 13] as n}
									<option value={n} selected={n === 5}>BO{n}</option>
								{/each}
							</select>
						</div>
						<div>
							<span class="font-500 text-xs text-text-secondary">Mappool</span>
							<select
								name="mappoolId"
								class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
							>
								<option value="">None</option>
								{#each data.mappools as mp}
									<option value={mp.id}>{mp.name} ({mp.slotCount} maps)</option>
								{/each}
							</select>
						</div>
						<div class="col-span-2">
							<span class="font-500 text-xs text-text-secondary">Scheduled At (optional)</span>
							<input
								name="scheduledAt"
								type="datetime-local"
								class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
							/>
						</div>
					</div>
					<div class="mt-3 flex justify-end gap-2">
						<button
							type="button"
							onclick={() => (showAddRound = false)}
							class="font-600 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="font-600 rounded-md bg-accent px-4 py-1.5 text-xs text-surface-900 transition-colors hover:bg-accent-hover"
						>
							Add Round
						</button>
					</div>
				</form>
			{:else if t.rounds.length > 0}
				<button
					onclick={() => (showAddRound = true)}
					class="font-600 self-start rounded-md border border-dashed border-border px-4 py-2 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary"
				>
					+ Add Round
				</button>
			{/if}
		{/if}
	</div>
{/snippet}

<!-- ─── Groups Tab ───────────────────────────────────────────────────── -->
{#snippet groupsTab()}
	<div class="grid gap-4 md:grid-cols-2">
		{#each t.groups as group}
			<div class="rounded-lg border border-border bg-surface-800 p-4">
				<h3 class="font-600 text-sm">{group.name}</h3>
				<table class="mt-3 w-full text-sm">
					<thead>
						<tr class="border-b border-border text-left">
							<th class="font-500 px-2 py-2 text-xs text-text-secondary">Team</th>
							<th class="font-500 px-2 py-2 text-center text-xs text-text-secondary">W</th>
							<th class="font-500 px-2 py-2 text-center text-xs text-text-secondary">L</th>
							<th class="font-500 px-2 py-2 text-center text-xs text-text-secondary">MD</th>
						</tr>
					</thead>
					<tbody>
						{#each group.entries.sort((a: any, b: any) => b.wins - a.wins || b.mapWins - b.mapLosses - (a.mapWins - a.mapLosses)) as entry}
							<tr class="border-b border-border/50">
								<td class="font-500 px-2 py-2">{entry.team?.name ?? 'TBD'}</td>
								<td class="px-2 py-2 text-center text-green-400">{entry.wins}</td>
								<td class="px-2 py-2 text-center text-red-400">{entry.losses}</td>
								<td class="px-2 py-2 text-center text-text-secondary">
									{entry.mapWins - entry.mapLosses > 0 ? '+' : ''}{entry.mapWins - entry.mapLosses}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	</div>
{/snippet}

<!-- ─── Settings Tab (Staff Only) ────────────────────────────────────── -->
{#snippet settingsTab()}
	<div class="flex flex-col gap-4">
		<!-- Lifecycle Actions -->
		<div class="rounded-lg border border-border bg-surface-800 p-5">
			<h3 class="font-600 text-sm">Tournament Actions</h3>
			<p class="mt-1 text-xs text-text-secondary">Manage the tournament state and lifecycle</p>
			<div class="mt-4 flex flex-wrap gap-2">
				{#if t.state === 'DRAFT'}
					<form method="POST" action="?/openRegistration" use:enhance={() => handleAction()}>
						<button
							class="font-600 rounded-md bg-green-800 px-4 py-2 text-xs text-green-200 transition-colors hover:bg-green-700"
						>
							Open Registration
						</button>
					</form>
				{/if}
				{#if t.state === 'REGISTRATION'}
					<form method="POST" action="?/closeRegistration" use:enhance={() => handleAction()}>
						<button
							class="font-600 rounded-md bg-yellow-800 px-4 py-2 text-xs text-yellow-200 transition-colors hover:bg-yellow-700"
						>
							Close Registration
						</button>
					</form>
				{/if}
				{#if t.state === 'SEEDING' || t.state === 'QUALIFIERS'}
					<form method="POST" action="?/finalizeSeeding" use:enhance={() => handleAction()}>
						<button
							class="font-600 rounded-md bg-blue-800 px-4 py-2 text-xs text-blue-200 transition-colors hover:bg-blue-700"
						>
							Generate Bracket
						</button>
					</form>
				{/if}
				{#if t.state !== 'FINISHED' && t.state !== 'CANCELLED'}
					<form method="POST" action="?/cancel" use:enhance={() => handleAction()}>
						<button
							class="font-600 rounded-md bg-red-800 px-4 py-2 text-xs text-red-200 transition-colors hover:bg-red-700"
						>
							Cancel Tournament
						</button>
					</form>
				{/if}
				{#if t.state === 'FINISHED' || t.state === 'CANCELLED'}
					<p class="self-center text-xs text-text-secondary">This tournament has ended</p>
				{/if}
			</div>
			{#if t.state === 'DRAFT' && t.rounds.length === 0}
				<p class="mt-3 text-xs text-yellow-400">
					You need to add at least one round before opening registration
				</p>
			{/if}
		</div>

		<!-- Staff Management -->
		<div class="rounded-lg border border-border bg-surface-800 p-5">
			<h3 class="font-600 text-sm">Staff</h3>
			<div class="mt-3 flex flex-col gap-2">
				{#each t.staff as s}
					<div
						class="flex items-center justify-between rounded-md bg-surface-700 px-3 py-2 text-sm"
					>
						<div class="flex items-center gap-2">
							<span class="font-500">{s.userId.slice(0, 8)}...</span>
							<span class="rounded bg-surface-600 px-2 py-0.5 text-xs text-text-secondary"
								>{s.role}</span
							>
						</div>
						{#if t.staff.length > 1}
							<form
								method="POST"
								action="?/removeStaff"
								use:enhance={() => handleActionWithMessage('Staff removed')}
							>
								<input type="hidden" name="staffId" value={s.id} />
								<button class="text-xs text-red-400 hover:text-red-300">Remove</button>
							</form>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Tournament Info -->
		<div class="rounded-lg border border-border bg-surface-800 p-5">
			<h3 class="font-600 text-sm">Info</h3>
			<dl class="mt-3 flex flex-col gap-1 text-sm">
				<div class="flex justify-between">
					<dt class="text-text-secondary">ID</dt>
					<dd class="font-mono text-xs text-text-secondary">{t.id}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-text-secondary">Created</dt>
					<dd class="text-text-secondary">{new Date(t.createdAt).toLocaleString()}</dd>
				</div>
				{#if t.registrationOpenAt}
					<div class="flex justify-between">
						<dt class="text-text-secondary">Registration Opened</dt>
						<dd class="text-text-secondary">{new Date(t.registrationOpenAt).toLocaleString()}</dd>
					</div>
				{/if}
				{#if t.finishedAt}
					<div class="flex justify-between">
						<dt class="text-text-secondary">Finished</dt>
						<dd class="text-text-secondary">{new Date(t.finishedAt).toLocaleString()}</dd>
					</div>
				{/if}
			</dl>
		</div>
	</div>
{/snippet}

<!-- ─── Match Card Snippet ───────────────────────────────────────────── -->
{#snippet matchCard(m: any)}
	<div
		class="w-52 overflow-hidden rounded-lg border bg-surface-800 {m.state === 'LIVE'
			? 'border-blue-500/50'
			: 'border-border'}"
	>
		<div
			class="flex items-center justify-between border-b border-border/50 px-3 py-2 {m.winnerId ===
			m.team1Id
				? 'bg-green-900/20'
				: ''}"
		>
			<span class="font-500 truncate text-sm {m.team1 ? '' : 'text-text-secondary'}">
				{m.team1?.name ?? 'TBD'}
			</span>
			{#if m.match?.participants}
				{@const p = m.match.participants.find((p: any) => p.teamId === m.team1Id)}
				{#if p}
					<span
						class="font-700 ml-2 font-mono text-sm tabular-nums {m.winnerId === m.team1Id
							? 'text-green-400'
							: 'text-text-secondary'}">{p.score}</span
					>
				{/if}
			{/if}
		</div>
		<div
			class="flex items-center justify-between px-3 py-2 {m.winnerId === m.team2Id
				? 'bg-green-900/20'
				: ''}"
		>
			<span class="font-500 truncate text-sm {m.team2 ? '' : 'text-text-secondary'}">
				{m.team2?.name ?? 'TBD'}
			</span>
			{#if m.match?.participants}
				{@const p = m.match.participants.find((p: any) => p.teamId === m.team2Id)}
				{#if p}
					<span
						class="font-700 ml-2 font-mono text-sm tabular-nums {m.winnerId === m.team2Id
							? 'text-green-400'
							: 'text-text-secondary'}">{p.score}</span
					>
				{/if}
			{/if}
		</div>
		{#if m.state === 'LIVE'}
			<div class="bg-blue-900/30 px-3 py-1 text-center text-xs text-blue-300">LIVE</div>
		{:else if m.state === 'BYE'}
			<div class="bg-surface-700 px-3 py-1 text-center text-xs text-text-secondary">BYE</div>
		{:else if m.matchId}
			<a
				href="/matches/{m.matchId}"
				class="block bg-surface-700 px-3 py-1 text-center text-xs text-text-secondary hover:text-text-primary"
			>
				View Match
			</a>
		{/if}
	</div>
{/snippet}
