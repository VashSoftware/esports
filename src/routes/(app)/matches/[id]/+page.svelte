<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let m = $derived(data.match);
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

	const canRoll = $derived(
		m.state === 'ROLLING' && m.participants.some((p: any) => p.rollValue === null)
	);

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

	let rolling = $state(false);
	let picking = $state(false);
	let pickError = $state('');
	let forceStarting = $state(false);

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
</script>

<div class="mx-auto max-w-5xl">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/matches" class="text-text-secondary transition-colors hover:text-text-primary">&larr;</a>
		<div class="flex-1">
			<h1 class="text-xl font-700 tracking-tight">{m.name || 'Match'}</h1>
			<p class="mt-0.5 text-xs text-text-secondary">
				Best of {config.bestOf} &middot; First to {winsNeeded}
				{#if m.osuLobbyId}
					&middot; <a href="https://osu.ppy.sh/mp/{m.osuLobbyId}" target="_blank" class="text-accent hover:underline">osu! mp/{m.osuLobbyId}</a>
				{/if}
			</p>
		</div>
		<span class="rounded border px-2.5 py-1 text-xs font-600 {stateBorder(m.state)}">{stateLabel(m.state)}</span>

		{#if !['FINISHED', 'CANCELLED'].includes(m.state)}
			<form method="post" action="?/cancel" use:enhance>
				<button type="submit" onclick={(e) => { if (!confirm('Cancel this match?')) e.preventDefault() }} class="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">Cancel</button>
			</form>
		{/if}
	</div>

	<!-- Scoreboard -->
	{#if p1 && p2}
		<div class="mt-6 flex items-center gap-4">
			<!-- Team 1 -->
			<div class="flex flex-1 items-center gap-4 rounded-lg border p-4 {m.winnerId === p1.teamId ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-surface-800'}">
				{#if p1.team.avatarUrl}
					<img src={p1.team.avatarUrl} alt="" class="h-10 w-10 rounded-full" />
				{/if}
				<div class="flex-1">
					<p class="text-sm font-600">{p1.team.name}</p>
					{#if p1.rollValue != null}
						<p class="text-xs text-text-secondary">Roll: {p1.rollValue}{p1.pickOrder === 1 ? ' ★' : ''}</p>
					{/if}
				</div>
				<span class="text-3xl font-800 tabular-nums {p1.score >= winsNeeded ? 'text-green-400' : 'text-text-primary'}">{p1.score}</span>
			</div>

			<span class="text-lg font-700 text-text-secondary">vs</span>

			<!-- Team 2 -->
			<div class="flex flex-1 items-center gap-4 rounded-lg border p-4 {m.winnerId === p2.teamId ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-surface-800'}">
				<span class="text-3xl font-800 tabular-nums {p2.score >= winsNeeded ? 'text-green-400' : 'text-text-primary'}">{p2.score}</span>
				<div class="flex-1 text-right">
					<p class="text-sm font-600">{p2.team.name}</p>
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

	<!-- Re-invite players -->
	{#if ['LOBBY', 'ROLLING', 'PICKING', 'PLAYING'].includes(m.state)}
		<div class="mt-3 flex justify-center">
			<form method="post" action="?/reinvite" use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success' && (result.data as any)?.reinvited) {
						// Brief visual feedback — just reload
						await update();
					}
				};
			}}>
				<button
					type="submit"
					class="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
				>
					📨 Re-invite players to lobby
				</button>
			</form>
		</div>
	{/if}

	<!-- ROLLING MODAL -->
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
			</div>
		</div>
	{/if}

	<!-- PICK MODAL -->
	{#if m.state === 'PICKING'}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
			<div class="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl border border-blue-500/30 bg-surface-800 p-6 shadow-2xl">
				<div class="text-center">
					<h2 class="text-lg font-700">🎯 Pick a Map</h2>
					<p class="mt-1 text-sm">
						<span class="font-600 text-accent">{expectedPicker?.team.name}</span>'s turn to pick
					</p>
					<p class="mt-1 text-xs text-text-secondary">
						or type <code class="rounded bg-surface-700 px-1.5 py-0.5 font-mono text-accent">!pick NM1</code> in osu! chat
					</p>
				</div>

				{#if pickError}
					<p class="mt-3 text-center text-sm text-red-400">{pickError}</p>
				{/if}

				<div class="mt-6 flex flex-col gap-4">
					{#each Object.entries(groupedSlots()) as [category, slots]}
						<div>
							<span class="mb-2 inline-block rounded border px-2 py-0.5 text-xs font-600 {catColors[category] ?? 'border-border'}">
								{category}
							</span>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{#each slots as slot, i}
									{@const bm = data.beatmapCache[slot.beatmapId]}
									{@const isPlayed = playedSlotIds.has(slot.id)}

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
											disabled={isPlayed || picking}
											class="flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all {isPlayed
												? 'border-border/50 bg-surface-900 opacity-30 cursor-not-allowed'
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
											{#if isPlayed}<span class="text-xs text-text-secondary">✓</span>{/if}
										</button>
									</form>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- PLAYING INDICATOR -->
	{#if m.state === 'PLAYING'}
		{@const currentGame = m.games[m.games.length - 1]}
		{@const bm = currentGame ? data.beatmapCache[currentGame.slot?.beatmapId] : null}
		<div class="mt-6 rounded-lg border border-green-500/30 bg-green-500/5 p-5 text-center">
			<div class="flex items-center justify-center gap-2">
				<div class="relative h-3 w-3">
					<div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div>
					<div class="relative h-3 w-3 rounded-full bg-green-400"></div>
				</div>
				<span class="text-sm font-600 text-green-400">Now Playing</span>
			</div>
			{#if bm}
				<p class="mt-2 text-sm">{bm.artist} - {bm.title} <span class="text-text-secondary">[{bm.version}]</span></p>
				<p class="mt-1 text-xs text-text-secondary">★{bm.starRating.toFixed(1)} &middot; {bm.bpm}bpm &middot; {formatLength(bm.totalLength)}</p>
			{/if}
			<p class="mt-3 text-xs text-text-secondary animate-pulse">
				Waiting for players to ready up &amp; play in osu!...
			</p>

			<!-- Force Start button -->
			<form method="post" action="?/forceStart" use:enhance={() => {
				forceStarting = true;
				return async ({ update }) => { forceStarting = false; await update(); };
			}}>
				<button
					type="submit"
					disabled={forceStarting}
					class="mt-4 rounded-md border border-yellow-500/30 px-4 py-2 text-xs font-600 text-yellow-400 transition-colors hover:bg-yellow-500/10 disabled:opacity-50"
				>
					{forceStarting ? 'Starting...' : 'Force Start (skip ready)'}
				</button>
			</form>
		</div>
	{/if}

	<!-- FINISHED MODAL -->
	{#if m.state === 'FINISHED'}
		{@const winner = m.participants.find((p: any) => p.teamId === m.winnerId)}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
			<div class="w-full max-w-md rounded-xl border border-accent/30 bg-surface-800 p-8 text-center shadow-2xl">
				<div class="text-4xl">🏆</div>
				<h2 class="mt-4 text-2xl font-800">
					<span class="text-accent">{winner?.team.name}</span> wins!
				</h2>
				<p class="mt-2 text-lg font-700 tabular-nums text-text-secondary">
					{p1?.score} – {p2?.score}
				</p>

				<!-- Game summary -->
				<div class="mt-6 flex flex-col gap-1">
					{#each m.games as game}
						{@const bm = data.beatmapCache[game.slot?.beatmapId]}
						{@const winnerP = m.participants.find((p: any) => p.id === game.winnerParticipantId)}
						<div class="flex items-center gap-2 rounded bg-surface-700 px-3 py-1.5 text-xs">
							<span class="font-600 {catColors[game.slot?.category]?.split(' ')[1] ?? 'text-text-secondary'}">{game.slot?.category}{game.slot?.orderInCategory}</span>
							<span class="flex-1 truncate text-text-secondary">{bm ? `${bm.artist} - ${bm.title}` : `#${game.slot?.beatmapId}`}</span>
							<span class="font-600 {winnerP?.id === p1?.id ? 'text-blue-400' : 'text-red-400'}">{winnerP?.team.name}</span>
						</div>
					{/each}
				</div>

				<a href="/" class="mt-6 inline-block rounded-md bg-accent px-6 py-2.5 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover">
					Back to Dashboard
				</a>
			</div>
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

						{#if game.state === 'FINISHED' && p1 && p2}
							{@const p1Score = game.scores.filter((s: any) => s.player?.participantId === p1.id).reduce((sum: number, s: any) => sum + s.score, 0)}
							{@const p2Score = game.scores.filter((s: any) => s.player?.participantId === p2.id).reduce((sum: number, s: any) => sum + s.score, 0)}
							<div class="flex items-center gap-2 font-mono text-sm tabular-nums">
								<span class="{p1Score > p2Score ? 'font-700 text-green-400' : 'text-text-secondary'}">{p1Score.toLocaleString()}</span>
								<span class="text-text-secondary">-</span>
								<span class="{p2Score > p1Score ? 'font-700 text-green-400' : 'text-text-secondary'}">{p2Score.toLocaleString()}</span>
							</div>
						{:else if game.state === 'PLAYING'}
							<span class="text-xs text-green-400 animate-pulse">Live</span>
						{/if}

						{#if winnerTeam}
							<span class="text-xs text-green-400">✓ {winnerTeam.name}</span>
						{/if}
					</div>
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
		</div>
	{/if}

	{#if m.state === 'CANCELLED'}
		<div class="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
			<p class="text-sm text-red-400">This match was cancelled.</p>
		</div>
	{/if}
</div>
