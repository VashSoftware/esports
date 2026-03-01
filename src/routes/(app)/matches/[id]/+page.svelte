<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let m = $derived(data.match);
	let lobbyStatus = $derived(data.lobbyStatus);
	let playerNames = $derived(data.playerNames);
	let p1 = $derived(m.participants[0]);
	let p2 = $derived(m.participants[1]);

	const config = $derived(m.config as { bestOf: number; teamSize: number; scoringType: string });
	const winsNeeded = $derived(Math.ceil(config.bestOf / 2));

	const playedSlotIds = $derived(new Set(m.games.map((g: any) => g.mappoolSlotId)));

	// Pick order
	const sortedByPick = $derived(
		[...m.participants].sort((a: any, b: any) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99))
	);
	const expectedPickerIdx = $derived(m.games.length % sortedByPick.length);
	const expectedPicker = $derived(sortedByPick[expectedPickerIdx]);

	// Is the logged-in user on the expected picker's team? No staff bypass.
	const isMyTurnToPick = $derived(
		expectedPicker?.players?.some((pl: any) => pl.userId === data.userId) ?? false
	);

	// TB restriction: only pickable at match point (e.g. 2-2 in BO5)
	const isTiebreakerAllowed = $derived(
		m.participants.every((p: any) => p.score === winsNeeded - 1)
	);

	const canRoll = $derived(
		m.state === 'ROLLING' && m.participants.some((p: any) => p.rollValue === null)
	);

	// Should the mappool be visible?
	const showMappool = $derived(
		['PICKING', 'PLAYING', 'ROLLING', 'FINISHED'].includes(m.state)
	);

	// Can picks actually be made right now?
	const pickingPhase = $derived(m.state === 'PICKING');

	const catColors: Record<string, string> = {
		NM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		HD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
		HR: 'bg-red-500/20 text-red-400 border-red-500/30',
		DT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
		FM: 'bg-green-500/20 text-green-400 border-green-500/30',
		TB: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
	};

	// Group mappool slots by category
	const groupedSlots = $derived(() => {
		if (!m.mappool?.slots) return {};
		const groups: Record<string, any[]> = {};
		for (const slot of m.mappool.slots) {
			if (!groups[slot.category]) groups[slot.category] = [];
			groups[slot.category].push(slot);
		}
		for (const cat of Object.keys(groups)) {
			groups[cat].sort((a: any, b: any) => a.orderInCategory - b.orderInCategory);
		}
		return groups;
	});

	// Match duration
	let now = $state(Date.now());
	$effect(() => {
		if (m.startedAt && !['FINISHED', 'CANCELLED'].includes(m.state)) {
			const interval = setInterval(() => { now = Date.now(); }, 1000);
			return () => clearInterval(interval);
		}
	});
	function formatDuration(ms: number): string {
		const totalSecs = Math.floor(ms / 1000);
		const mins = Math.floor(totalSecs / 60);
		const secs = totalSecs % 60;
		return `${mins}m ${secs.toString().padStart(2, '0')}s`;
	}
	const duration = $derived(
		m.startedAt
			? m.finishedAt
				? formatDuration(new Date(m.finishedAt).getTime() - new Date(m.startedAt).getTime())
				: formatDuration(now - new Date(m.startedAt).getTime())
			: null
	);

	// Mappool avg SR
	const mappoolAvgSR = $derived(() => {
		const slots = m.mappool?.slots;
		if (!slots?.length) return null;
		const avg = slots.reduce((sum: number, s: any) => sum + (s.starRating ?? 0), 0) / slots.length;
		return avg.toFixed(2);
	});

	let rolling = $state(false);
	let picking = $state(false);
	let pickError = $state('');
	let forceStarting = $state(false);
	let reinviting = $state(false);
	let mappoolCollapsed = $state(false);

	// Poll while match is active (every 3s)
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (['CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING'].includes(m.state)) {
			pollInterval = setInterval(() => invalidateAll(), 3000);
		}
		return () => {
			if (pollInterval) clearInterval(pollInterval);
		};
	});

	function formatLength(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function stateLabel(s: string) {
		return ({ CREATED: 'Waiting', LOBBY: 'In Lobby', ROLLING: 'Rolling', PICKING: 'Pick Phase', PLAYING: 'Playing', FINISHED: 'Finished', CANCELLED: 'Cancelled' })[s] ?? s;
	}

	function stateBorder(s: string) {
		return ({ ROLLING: 'border-yellow-500/30', PICKING: 'border-blue-500/30', PLAYING: 'border-green-500/30', FINISHED: 'border-accent/30' })[s] ?? 'border-border';
	}

	const stateLabels: Record<string, string> = { LOBBY: 'In Lobby', ROLLING: 'Rolling', PICKING: 'Picking', PLAYING: 'Live Now', FINISHED: 'Finished', CANCELLED: 'Cancelled' };
	const ogTitle = $derived(`${p1?.team?.name ?? 'TBD'} vs ${p2?.team?.name ?? 'TBD'} — ${m.name} | Vash Esports`);
	const ogDesc = $derived(`${stateLabels[m.state] ?? m.state} · Best of ${(m.config as any)?.bestOf ?? '?'} · Watch on Vash Esports`);
</script>

<svelte:head>
	<title>{ogTitle}</title>
	<meta name="description" content={ogDesc} />
	<meta property="og:title" content={ogTitle} />
	<meta property="og:description" content={ogDesc} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content="/logo.png" />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<!-- Shared reinvite snippet -->
{#snippet reinviteButton()}
	<form method="post" action="?/reinvite" use:enhance={() => {
		reinviting = true;
		return async ({ update }) => { reinviting = false; await update(); };
	}}>
		<button
			type="submit"
			disabled={reinviting}
			class="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
		>
			{reinviting ? 'Sending...' : '📨 Re-invite me to lobby'}
		</button>
	</form>
{/snippet}

<div class="mx-auto max-w-5xl">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/matches" class="text-text-secondary transition-colors hover:text-text-primary">&larr;</a>
		<div class="flex-1">
			<h1 class="text-xl font-700 tracking-tight">{m.name || 'Match'}</h1>
			<p class="mt-0.5 text-xs text-text-secondary">
				Best of {config.bestOf} &middot; First to {winsNeeded}
				{#if duration}
					&middot; {duration}
				{/if}
				{#if m.osuLobbyId}
					&middot; <a href="https://osu.ppy.sh/mp/{m.osuLobbyId}" target="_blank" class="text-accent hover:underline">osu! mp/{m.osuLobbyId}</a>
				{/if}
			</p>
		</div>
		<span class="rounded border px-2.5 py-1 text-xs font-600 {stateBorder(m.state)}">{stateLabel(m.state)}</span>

		{#if !['FINISHED', 'CANCELLED'].includes(m.state) && data.isStaff}
			<form method="post" action="?/cancel" use:enhance>
				<button type="submit" onclick={(e) => { if (!confirm('Cancel this match?')) e.preventDefault() }} class="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">Cancel</button>
			</form>
		{/if}
	</div>

	<!-- Scoreboard -->
	{#if p1 && p2}
		<div class="mt-6 flex items-center gap-4">
			<div class="flex flex-1 items-center gap-4 rounded-lg border p-4 {m.winnerId === p1.teamId ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-surface-800'}">
				{#if p1.team.avatarUrl}
					<img src={p1.team.avatarUrl} alt="" class="h-10 w-10 rounded-full" />
				{/if}
				<div class="flex-1">
					<p class="text-sm font-600">{p1.team.name}</p>
					{#if config.teamSize === 1}
						{@const r1 = data.playerRatings?.[p1.players[0]?.userId]}
						{#if r1}
							<p class="text-xs text-text-secondary">{r1.elo} ELO · {r1.wins}W {r1.losses}L</p>
						{/if}
					{/if}
					{#if p1.rollValue != null}
						<p class="text-xs text-text-secondary">Roll: {p1.rollValue}{p1.pickOrder === 1 ? ' ★' : ''}</p>
					{/if}
				</div>
				<span class="text-3xl font-800 tabular-nums {p1.score >= winsNeeded ? 'text-green-400' : 'text-text-primary'}">{p1.score}</span>
			</div>

			<span class="text-lg font-700 text-text-secondary">vs</span>

			<div class="flex flex-1 items-center gap-4 rounded-lg border p-4 {m.winnerId === p2.teamId ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-surface-800'}">
				<span class="text-3xl font-800 tabular-nums {p2.score >= winsNeeded ? 'text-green-400' : 'text-text-primary'}">{p2.score}</span>
				<div class="flex-1 text-right">
					<p class="text-sm font-600">{p2.team.name}</p>
					{#if config.teamSize === 1}
						{@const r2 = data.playerRatings?.[p2.players[0]?.userId]}
						{#if r2}
							<p class="text-xs text-text-secondary">{r2.wins}W {r2.losses}L · {r2.elo} ELO</p>
						{/if}
					{/if}
					{#if p2.rollValue != null}
						<p class="text-xs text-text-secondary">{p2.pickOrder === 1 ? '★ ' : ''}Roll: {p2.rollValue}</p>
					{/if}
				</div>
				{#if p2.team.avatarUrl}
					<img src={p2.team.avatarUrl} alt="" class="h-10 w-10 rounded-full" />
				{/if}
			</div>
		</div>
	{/if}

	<!-- Action bar: reinvite + lobby link — always visible during active match -->
	{#if ['LOBBY', 'ROLLING', 'PICKING', 'PLAYING'].includes(m.state)}
		<div class="mt-3 flex items-center justify-center gap-3">
			{@render reinviteButton()}
			{#if m.osuLobbyId}
				<a href="https://osu.ppy.sh/mp/{m.osuLobbyId}" target="_blank" class="text-xs text-text-secondary hover:text-accent">Open lobby →</a>
			{/if}
		</div>
	{/if}

	<!-- ROLLING MODAL (stays as overlay — it's a brief phase) -->
	{#if m.state === 'ROLLING'}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
			<div class="w-full max-w-md rounded-xl border border-yellow-500/30 bg-surface-800 p-8 text-center shadow-2xl">
				<h2 class="text-lg font-700">🎲 Roll Phase</h2>
				<p class="mt-2 text-sm text-text-secondary">Highest roll picks first</p>

				<div class="mt-6 flex justify-center gap-6">
					{#each m.participants as p}
						<div class="rounded-lg border border-border bg-surface-700 px-6 py-4">
							<p class="text-xs text-text-secondary">{p.team.name}</p>
							{#if p.rollValue != null}
								<p class="mt-1 text-2xl font-800 text-yellow-400">{p.rollValue}</p>
							{:else}
								<p class="mt-1 text-2xl font-800 text-text-secondary/30">—</p>
							{/if}
						</div>
					{/each}
				</div>

				{#if canRoll}
					<form method="post" action="?/roll" use:enhance={() => {
						rolling = true;
						return async ({ update }) => { rolling = false; await update(); };
					}}>
						<button type="submit" disabled={rolling} class="mt-6 rounded-md bg-accent px-8 py-3 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50">
							{rolling ? 'Rolling...' : '🎲 Roll!'}
						</button>
					</form>
					<p class="mt-3 text-xs text-text-secondary">or type <code class="rounded bg-surface-700 px-1.5 py-0.5 font-mono text-accent">!roll</code> in osu! chat</p>
				{:else}
					<p class="mt-6 text-sm text-text-secondary animate-pulse">Waiting for all rolls...</p>
				{/if}

				<div class="mt-6 flex flex-col items-center gap-2 border-t border-border pt-4">
					{@render reinviteButton()}
					{#if m.osuLobbyId}
						<a href="https://osu.ppy.sh/mp/{m.osuLobbyId}" target="_blank" class="text-xs text-text-secondary hover:text-accent">Open lobby in browser →</a>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- PLAYING INDICATOR -->
	{#if m.state === 'PLAYING'}
		{@const currentGame = m.games[m.games.length - 1]}
		{@const bm = currentGame ? data.beatmapCache[currentGame.slot?.beatmapId] : null}
		<div class="mt-6 rounded-lg border border-green-500/30 bg-green-500/5 p-5">
			<div class="flex items-center justify-center gap-2">
				<div class="relative h-3 w-3">
					<div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div>
					<div class="relative h-3 w-3 rounded-full bg-green-400"></div>
				</div>
				<span class="text-sm font-600 text-green-400">
					{lobbyStatus?.gameInProgress ? 'Playing' : 'Now Playing — Waiting for ready'}
				</span>
			</div>
			{#if bm}
				<p class="mt-2 text-center text-sm">{bm.artist} - {bm.title} <span class="text-text-secondary">[{bm.version}]</span></p>
				<p class="mt-1 text-center text-xs text-text-secondary">★{bm.starRating.toFixed(1)} &middot; {bm.bpm}bpm &middot; {formatLength(bm.totalLength)}</p>
			{/if}

			<!-- Per-player lobby status -->
			{#if lobbyStatus}
				<div class="mt-4 flex flex-col gap-2">
					{#each m.participants as participant}
						{#each participant.players as player}
							{@const username = playerNames[player.userId]}
							{@const inLobby = username && lobbyStatus.inLobby.includes(username)}
							{@const isReady = username && lobbyStatus.readyPlayers.includes(username)}
							<div class="flex items-center gap-2 rounded border border-border bg-surface-800/50 px-3 py-1.5 text-xs">
								<span class="font-500">{username ?? player.userId}</span>
								<span class="ml-auto flex items-center gap-1.5">
									{#if lobbyStatus.gameInProgress}
										<span class="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-600 text-green-400">Playing</span>
									{:else if isReady}
										<span class="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-600 text-green-400">Ready</span>
									{:else if inLobby}
										<span class="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-600 text-yellow-400">In Lobby</span>
									{:else}
										<span class="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] font-600 text-text-secondary">Not in lobby</span>
									{/if}
								</span>
							</div>
						{/each}
					{/each}
				</div>
			{:else}
				<p class="mt-3 text-center text-xs text-text-secondary animate-pulse">
					Waiting for players to ready up &amp; play in osu!...
				</p>
			{/if}

			{#if data.isStaff}
				<div class="mt-3 text-center">
					<form method="post" action="?/forceStart" use:enhance={() => {
						forceStarting = true;
						return async ({ update }) => { forceStarting = false; await update(); };
					}}>
						<button
							type="submit"
							disabled={forceStarting}
							class="rounded-md border border-yellow-500/30 px-4 py-1.5 text-xs font-600 text-yellow-400 transition-colors hover:bg-yellow-500/10 disabled:opacity-50"
						>
							{forceStarting ? 'Starting...' : 'Force Start (skip ready)'}
						</button>
					</form>
				</div>
			{/if}
		</div>
	{/if}

	<!-- INLINE MAPPOOL — visible during PICKING and PLAYING (not a blocking modal) -->
	{#if showMappool && Object.keys(groupedSlots()).length > 0}
		<div class="mt-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<h2 class="text-sm font-600">
						{#if m.mappool}
							<a href="/mappools/{m.mappool.id}" class="hover:text-accent hover:underline">{m.mappool.name}</a>
						{:else}
							Mappool
						{/if}
					</h2>
					{#if mappoolAvgSR()}
						<span class="text-xs text-text-secondary">avg ★{mappoolAvgSR()}</span>
					{/if}
					{#if pickingPhase}
						<span class="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-600 text-blue-400">
							{isMyTurnToPick ? 'Your pick!' : `${expectedPicker?.team.name}'s pick`}
						</span>
					{:else if m.state === 'PLAYING'}
						<span class="rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-600 text-green-400">In progress</span>
					{:else if m.state === 'ROLLING'}
						<span class="rounded bg-yellow-500/20 px-2 py-0.5 text-[10px] font-600 text-yellow-400">Rolling...</span>
					{/if}
				</div>
				<button
					onclick={() => mappoolCollapsed = !mappoolCollapsed}
					class="text-xs text-text-secondary hover:text-text-primary"
				>
					{mappoolCollapsed ? 'Show ▼' : 'Hide ▲'}
				</button>
			</div>

			{#if pickingPhase && !isMyTurnToPick}
				<p class="mt-1 text-xs text-text-secondary">
					Waiting for <span class="text-accent">{expectedPicker?.team.name}</span> to pick...
					You can also type <code class="rounded bg-surface-700 px-1 py-0.5 font-mono text-[10px] text-accent">!pick NM1</code> in osu! chat when it's your turn.
				</p>
			{:else if pickingPhase && isMyTurnToPick}
				<p class="mt-1 text-xs text-text-secondary">
					Pick a map below, or type <code class="rounded bg-surface-700 px-1 py-0.5 font-mono text-[10px] text-accent">!pick NM1</code> in osu! chat.
				</p>
			{/if}

			{#if pickError}
				<p class="mt-2 text-center text-sm text-red-400">{pickError}</p>
			{/if}

			{#if !mappoolCollapsed}
				<div class="mt-3 flex flex-col gap-3">
					{#each Object.entries(groupedSlots()) as [category, slots]}
						<div>
							<span class="mb-1.5 inline-block rounded border px-2 py-0.5 text-xs font-600 {catColors[category] ?? 'border-border'}">
								{category}
							</span>
							<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
								{#each slots as slot}
									{@const bm = data.beatmapCache[slot.beatmapId]}
									{@const isPlayed = playedSlotIds.has(slot.id)}
									{@const isTB = slot.category === 'TB'}
									{@const tbLocked = isTB && !isTiebreakerAllowed}
									{@const cantPick = !isMyTurnToPick || !pickingPhase}

									<form method="post" action="?/pick" use:enhance={() => {
										picking = true;
										pickError = '';
										return async ({ result, update }) => {
											picking = false;
											if (result.type === 'failure' || (result.type === 'success' && (result.data as any)?.error)) {
												pickError = (result.data as any)?.error ?? 'Pick failed';
											} else {
												await update();
											}
										};
									}}>
										<input type="hidden" name="slotId" value={slot.id} />
										<button
											type="submit"
											disabled={isPlayed || picking || tbLocked || cantPick}
											class="flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all {isPlayed
												? 'border-border/50 bg-surface-900 opacity-30 cursor-not-allowed'
												: tbLocked
													? 'border-border/50 bg-surface-900 opacity-30 cursor-not-allowed'
													: cantPick
														? 'border-border bg-surface-800 opacity-60 cursor-default'
														: 'border-border bg-surface-700 hover:border-accent hover:bg-surface-600 cursor-pointer'}"
										>
											{#if bm?.listCoverUrl}
												<img src={bm.listCoverUrl} alt="" class="h-10 w-20 rounded object-cover" />
											{:else}
												<div class="flex h-10 w-20 items-center justify-center rounded bg-surface-600 text-xs text-text-secondary">?</div>
											{/if}
											<div class="min-w-0 flex-1">
												{#if bm}
													<p class="truncate text-xs font-500">{bm.artist} - {bm.title}</p>
													<p class="text-xs text-text-secondary">[{bm.version}] &middot; ★{bm.starRating.toFixed(1)} &middot; {bm.bpm}bpm</p>
												{:else}
													<p class="text-xs text-text-secondary">#{slot.beatmapId}</p>
												{/if}
											</div>
											<span class="text-xs font-600 text-text-secondary">{category}{slot.orderInCategory}</span>
											{#if isPlayed}
												<span class="text-xs text-text-secondary">✓</span>
											{:else if tbLocked}
												<span class="text-[10px] text-pink-400/60" title="Match point only">🔒</span>
											{/if}
										</button>
									</form>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- FINISHED BANNER -->
	{#if m.state === 'FINISHED'}
		{@const winner = m.participants.find((p: any) => p.teamId === m.winnerId)}
		<div class="mt-6 rounded-xl border border-accent/30 bg-surface-800 p-6 text-center">
			<div class="text-3xl">🏆</div>
			<h2 class="mt-3 text-xl font-800">
				<span class="text-accent">{winner?.team.name}</span> wins!
			</h2>
			<p class="mt-1 text-base font-700 tabular-nums text-text-secondary">
				{p1?.score} – {p2?.score}
			</p>
		</div>
	{/if}

	<!-- GAME HISTORY -->
	{#if m.games.length > 0}
		<div class="mt-6">
			<h2 class="text-sm font-600">Games Played</h2>
			<div class="mt-3 flex flex-col gap-2">
				{#each m.games as game}
					{@const bm = data.beatmapCache[game.slot?.beatmapId]}
					{@const pickerTeam = m.participants.find((p: any) => p.id === game.pickedByParticipantId)?.team}
					{@const winnerTeam = m.participants.find((p: any) => p.id === game.winnerParticipantId)?.team}

					<div class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3">
						<span class="w-6 text-center text-xs font-600 text-text-secondary">{game.gameNumber}</span>
						{#if bm?.listCoverUrl}
							<img src={bm.listCoverUrl} alt="" class="h-8 w-16 rounded object-cover" />
						{/if}
						<div class="min-w-0 flex-1">
							{#if bm}
								<p class="truncate text-sm font-500">{bm.artist} - {bm.title} <span class="text-text-secondary">[{bm.version}]</span></p>
							{/if}
							<div class="flex items-center gap-2 text-xs text-text-secondary">
								<span class="rounded border px-1.5 py-0.5 {catColors[game.slot?.category] ?? 'border-border'}">{game.slot?.category}{game.slot?.orderInCategory}</span>
								{#if pickerTeam}<span>Picked by {pickerTeam.name}</span>{/if}
							</div>
						</div>

						{#if game.state === 'PLAYING'}
							<span class="text-xs text-green-400 animate-pulse">Live</span>
						{:else if winnerTeam}
							<span class="text-xs text-green-400">✓ {winnerTeam.name}</span>
						{/if}
					</div>

					<!-- Per-player score breakdown -->
					{#if game.state === 'FINISHED' && game.scores?.length > 0}
						<div class="mt-1.5 flex flex-col gap-1">
							{#each game.scores as s}
								{@const username = playerNames[s.player?.userId]}
								<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded bg-surface-900 px-3 py-1.5 text-xs">
									<span class="w-24 truncate font-500">{username ?? s.player?.userId ?? '?'}</span>
									<span class="font-mono tabular-nums text-text-primary">{s.score.toLocaleString()}</span>
									{#if s.accuracy > 0}
										<span class="text-text-secondary">{(s.accuracy * 100).toFixed(2)}%</span>
									{/if}
									{#if s.maxCombo > 0}
										<span class="text-text-secondary">{s.maxCombo}x</span>
									{/if}
									{#if s.count300 > 0 || s.count100 > 0 || s.countMiss >= 0}
										<span class="text-text-secondary">
											<span class="text-blue-400">{s.count300}</span>
											/<span class="text-green-400">{s.count100}</span>
											/<span class="text-yellow-400">{s.count50}</span>
											/<span class="text-red-400">{s.countMiss}</span>
										</span>
									{/if}
									{#if s.pp != null}
										<span class="font-600 text-accent">{Math.round(s.pp)}pp</span>
									{/if}
									{#if !s.passed}
										<span class="rounded bg-red-500/20 px-1 text-[10px] text-red-400">FAILED</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- CREATED / LOBBY waiting states -->
	{#if m.state === 'CREATED'}
		<div class="mt-6 rounded-lg border border-border bg-surface-800 p-6 text-center">
			<p class="text-sm text-text-secondary animate-pulse">Creating osu! lobby...</p>
		</div>
	{/if}

	{#if m.state === 'LOBBY'}
		<div class="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
			<p class="text-sm text-text-secondary">Lobby created. Waiting for players to join...</p>
			{#if m.osuLobbyId}
				<p class="mt-2 text-xs text-text-secondary">
					<a href="https://osu.ppy.sh/mp/{m.osuLobbyId}" target="_blank" class="text-accent hover:underline">osu! mp/{m.osuLobbyId}</a>
				</p>
			{/if}
			{#if lobbyStatus}
				<div class="mt-3 flex flex-col gap-1.5">
					{#each m.participants as participant}
						{#each participant.players as player}
							{@const username = playerNames[player.userId]}
							{@const inLobby = username && lobbyStatus.inLobby.includes(username)}
							<div class="flex items-center gap-2 rounded border border-border bg-surface-800/50 px-3 py-1.5 text-xs">
								<span class="font-500">{username ?? player.userId}</span>
								<span class="ml-auto">
									{#if inLobby}
										<span class="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-600 text-green-400">In Lobby</span>
									{:else}
										<span class="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] font-600 text-text-secondary">Not in lobby</span>
									{/if}
								</span>
							</div>
						{/each}
					{/each}
				</div>
			{/if}
			<div class="mt-3">
				{@render reinviteButton()}
			</div>
		</div>
	{/if}

	{#if m.state === 'CANCELLED'}
		<div class="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
			<p class="text-sm text-red-400">This match was cancelled.</p>
		</div>
	{/if}
</div>
