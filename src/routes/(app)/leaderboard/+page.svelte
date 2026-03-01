<script lang="ts">
	let { data } = $props();

	let activeTab = $state<'players' | 'teams' | 'scores'>('players');

	const tabs = [
		{ id: 'players' as const, label: 'Top Players', icon: '👤' },
		{ id: 'teams' as const, label: 'Top Teams', icon: '⚑' },
		{ id: 'scores' as const, label: 'High Scores', icon: '🎯' }
	];

	function eloColor(elo: number): string {
		if (elo >= 1400) return 'text-yellow-400';
		if (elo >= 1200) return 'text-purple-400';
		if (elo >= 1000) return 'text-blue-400';
		return 'text-text-secondary';
	}

	function rankBadge(rank: number): { emoji: string; color: string } | null {
		if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400' };
		if (rank === 2) return { emoji: '🥈', color: 'text-gray-300' };
		if (rank === 3) return { emoji: '🥉', color: 'text-amber-600' };
		return null;
	}

	const catColors: Record<string, string> = {
		NM: 'text-blue-400',
		HD: 'text-yellow-400',
		HR: 'text-red-400',
		DT: 'text-purple-400',
		FM: 'text-green-400',
		TB: 'text-pink-400'
	};
</script>

<div class="mx-auto max-w-4xl">
	<div>
		<h1 class="text-2xl font-700 tracking-tight">Leaderboard</h1>
		<p class="mt-1 text-sm text-text-secondary">Rankings and top performances</p>
	</div>

	<!-- Tabs -->
	<div class="mt-6 flex gap-1 rounded-lg border border-border bg-surface-800 p-1">
		{#each tabs as tab}
			<button
				onclick={() => (activeTab = tab.id)}
				class="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-600 transition-colors {activeTab ===
				tab.id
					? 'bg-accent text-surface-900'
					: 'text-text-secondary hover:text-text-primary'}"
			>
				<span>{tab.icon}</span>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Top Players -->
	{#if activeTab === 'players'}
		<div class="mt-6 overflow-x-auto rounded-lg border border-border bg-surface-800">
			{#if data.topPlayers.length === 0}
				<div class="py-12 text-center">
					<p class="text-sm text-text-secondary">No ranked players yet. Play some matches!</p>
				</div>
			{:else}
				<table class="w-full">
					<thead>
						<tr class="border-b border-border text-left text-xs font-600 text-text-secondary">
							<th class="w-10 py-3 pl-4 text-center">#</th>
							<th class="w-10 py-3"></th>
							<th class="py-3">Player</th>
							<th class="w-16 py-3 pr-4 text-right">ELO</th>
							<th class="w-16 py-3 pr-4 text-right">W/L</th>
							<th class="w-16 py-3 pr-4 text-right">Win %</th>
						</tr>
					</thead>
					<tbody>
						{#each data.topPlayers as p}
							{@const medal = rankBadge(p.rank)}
							<tr class="border-b border-border/50 last:border-b-0 {p.rank <= 3 ? 'bg-accent/[0.02]' : ''}">
								<td class="py-3 pl-4 text-center text-sm font-700 tabular-nums {medal?.color ?? 'text-text-secondary'}">
									{medal ? medal.emoji : p.rank}
								</td>
								<td class="py-3">
									{#if p.image}
										<img src={p.image} alt="" class="h-8 w-8 rounded-full" />
									{:else}
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs font-700 text-text-secondary">
											{p.name.charAt(0).toUpperCase()}
										</div>
									{/if}
								</td>
								<td class="py-3 text-sm font-600">{p.name}</td>
								<td class="py-3 pr-4 text-right text-sm font-700 tabular-nums {eloColor(p.elo)}">{p.elo}</td>
								<td class="py-3 pr-4 text-right text-xs tabular-nums text-text-secondary">
									<span class="text-green-400">{p.wins}</span>/<span class="text-red-400">{p.losses}</span>
								</td>
								<td class="py-3 pr-4 text-right text-xs font-600 tabular-nums {p.winRate !== '—' && parseFloat(p.winRate) >= 50 ? 'text-green-400' : 'text-text-secondary'}">
									{p.winRate}{p.winRate !== '—' ? '%' : ''}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}

	<!-- Top Teams -->
	{#if activeTab === 'teams'}
		<div class="mt-6 overflow-x-auto rounded-lg border border-border bg-surface-800">
			{#if data.topTeams.length === 0}
				<div class="py-12 text-center">
					<p class="text-sm text-text-secondary">No team results yet.</p>
				</div>
			{:else}
				<table class="w-full">
					<thead>
						<tr class="border-b border-border text-left text-xs font-600 text-text-secondary">
							<th class="w-10 py-3 pl-4 text-center">#</th>
							<th class="w-10 py-3"></th>
							<th class="py-3">Team</th>
							<th class="w-16 py-3 pr-4 text-right">Wins</th>
							<th class="w-20 py-3 pr-4 text-right">Matches</th>
						</tr>
					</thead>
					<tbody>
						{#each data.topTeams as t}
							{@const medal = rankBadge(t.rank)}
							<tr class="border-b border-border/50 last:border-b-0 {t.rank <= 3 ? 'bg-accent/[0.02]' : ''}">
								<td class="py-3 pl-4 text-center text-sm font-700 tabular-nums {medal?.color ?? 'text-text-secondary'}">
									{medal ? medal.emoji : t.rank}
								</td>
								<td class="py-3">
									{#if t.avatarUrl}
										<img src={t.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
									{:else}
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs font-700 text-text-secondary">
											{t.name.charAt(0).toUpperCase()}
										</div>
									{/if}
								</td>
								<td class="py-3">
									<span class="text-sm font-600">{t.name}</span>
									{#if t.isPersonal}
										<span class="ml-1 text-[10px] text-text-secondary">(solo)</span>
									{/if}
									<p class="text-xs text-text-secondary">{t.memberCount} member{t.memberCount !== 1 ? 's' : ''}</p>
								</td>
								<td class="py-3 pr-4 text-right text-sm font-700 tabular-nums text-green-400">{t.wins}</td>
								<td class="py-3 pr-4 text-right text-xs tabular-nums text-text-secondary">{t.totalMatches}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}

	<!-- High Scores -->
	{#if activeTab === 'scores'}
		<div class="mt-6 overflow-x-auto rounded-lg border border-border bg-surface-800">
			{#if data.highScores.length === 0}
				<div class="py-12 text-center">
					<p class="text-sm text-text-secondary">No scores recorded yet.</p>
				</div>
			{:else}
				<div class="px-4 py-2.5 border-b border-border">
					<p class="text-xs text-text-secondary">Ranked by pp (performance points) when available, then score</p>
				</div>
				<table class="w-full">
					<thead>
						<tr class="border-b border-border text-left text-xs font-600 text-text-secondary">
							<th class="w-10 py-3 pl-4 text-center">#</th>
							<th class="w-10 py-3"></th>
							<th class="py-3">Player</th>
							<th class="w-12 py-3 pr-4 text-right">Map</th>
							<th class="w-16 py-3 pr-4 text-right text-accent">PP</th>
							<th class="w-24 py-3 pr-4 text-right">Score</th>
							<th class="w-16 py-3 pr-4 text-right">Acc</th>
						</tr>
					</thead>
					<tbody>
						{#each data.highScores as s}
							{@const medal = rankBadge(s.rank)}
							<tr class="border-b border-border/50 last:border-b-0 {s.rank <= 3 ? 'bg-accent/[0.02]' : ''}">
								<td class="py-3 pl-4 text-center text-sm font-700 tabular-nums {medal?.color ?? 'text-text-secondary'}">
									{medal ? medal.emoji : s.rank}
								</td>
								<td class="py-3">
									{#if s.playerImage}
										<img src={s.playerImage} alt="" class="h-8 w-8 rounded-full" />
									{:else}
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs font-700 text-text-secondary">
											{s.playerName.charAt(0).toUpperCase()}
										</div>
									{/if}
								</td>
								<td class="py-3">
									<span class="text-sm font-600">{s.playerName}</span>
									<p class="truncate text-xs text-text-secondary">
										<a href="/matches/{s.matchId}" class="hover:text-accent">{s.matchName}</a>
									</p>
								</td>
								<td class="py-3 pr-4 text-right text-xs font-600 {catColors[s.mapCategory] ?? 'text-text-secondary'}">
									{s.mapCategory}{s.mapOrder}
								</td>
								<td class="py-3 pr-4 text-right text-sm font-700 tabular-nums {s.pp != null ? 'text-accent' : 'text-text-secondary/40'}">
									{s.pp != null ? `${Math.round(s.pp)}pp` : '—'}
								</td>
								<td class="py-3 pr-4 text-right text-sm font-700 tabular-nums text-text-primary">
									{s.score.toLocaleString()}
								</td>
								<td class="py-3 pr-4 text-right text-xs tabular-nums text-text-secondary">
									{s.accuracy > 0 ? `${(s.accuracy * 100).toFixed(1)}%` : '—'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}

	<!-- ELO Explanation -->
	<div class="mt-6 rounded-lg border border-border bg-surface-800 p-5">
		<h2 class="text-sm font-600">How ELO Works</h2>
		<p class="mt-2 text-xs text-text-secondary leading-relaxed">
			Every player starts at 1000 ELO. Win a match to gain points, lose to drop.
			The system uses K=32, so new players' ratings shift quickly. As you play more,
			your rating stabilizes around your true skill level. Queue matchmaking pairs players
			with similar ELO for fair matches.
		</p>
	</div>
</div>
