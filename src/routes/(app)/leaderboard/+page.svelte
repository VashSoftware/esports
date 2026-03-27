<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/components/DataTable.svelte';

	function rowClick(href: string) {
		return () => goto(href);
	}

	const { data } = $props();

	const activeTab = $derived(data.tab);

	function setTab(tab: string) {
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	const tabs = [
		{ id: 'players', label: 'Top Players', icon: '👤' },
		{ id: 'teams', label: 'Top Teams', icon: '⚑' },
		{ id: 'scores', label: 'High Scores', icon: '🎯' }
	];

	function eloColor(elo: number): string {
		if (elo >= 2500) return 'text-yellow-400';
		if (elo >= 2000) return 'text-purple-400';
		if (elo >= 1500) return 'text-blue-400';
		if (elo >= 1000) return 'text-green-400';
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

	const playerColumns = [
		{ key: 'rank', label: '#', class: 'w-10 pl-4 text-center' },
		{ key: 'avatar', label: '', class: 'w-10' },
		{ key: 'name', label: 'Player', class: 'px-4 text-left' },
		{ key: 'elo', label: 'ELO', class: 'w-16 pr-4 text-right' },
		{ key: 'wl', label: 'W/L', class: 'w-16 pr-4 text-right' },
		{ key: 'winRate', label: 'Win %', class: 'w-16 pr-4 text-right' }
	];

	const teamColumns = [
		{ key: 'rank', label: '#', class: 'w-10 pl-4 text-center' },
		{ key: 'avatar', label: '', class: 'w-10' },
		{ key: 'name', label: 'Team', class: 'px-4 text-left' },
		{ key: 'wins', label: 'Wins', class: 'w-16 pr-4 text-right' },
		{ key: 'matches', label: 'Matches', class: 'w-20 pr-4 text-right' }
	];

	const scoreColumns = [
		{ key: 'rank', label: '#', class: 'w-10 pl-4 text-center' },
		{ key: 'avatar', label: '', class: 'w-10' },
		{ key: 'player', label: 'Player', class: 'px-4 text-left' },
		{ key: 'map', label: 'Map', class: 'w-12 pr-4 text-right' },
		{ key: 'pp', label: 'PP', class: 'w-16 pr-4 text-right' },
		{ key: 'score', label: 'Score', class: 'w-24 pr-4 text-right' },
		{ key: 'acc', label: 'Acc', class: 'w-16 pr-4 text-right' }
	];
</script>

<svelte:head>
	<title>Leaderboard — Vash Esports</title>
	<meta name="description" content="Top players and teams on Vash Esports." />
	<meta property="og:title" content="Leaderboard — Vash Esports" />
	<meta property="og:description" content="Top players and teams on Vash Esports." />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div>
		<h1 class="font-700 text-2xl tracking-tight">Leaderboard</h1>
		<p class="mt-1 text-sm text-text-secondary">Rankings and top performances</p>
	</div>

	<!-- Tabs -->
	<div class="mt-6 flex gap-1 rounded-lg border border-border bg-surface-800 p-1">
		{#each tabs as tab}
			<button
				onclick={() => setTab(tab.id)}
				class="font-600 flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors {activeTab ===
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
		<div class="mt-6">
			<DataTable data={data.topPlayers} meta={data.meta} columns={playerColumns}>
				{#snippet row(p, _i)}
					{@const medal = rankBadge(p.rank)}
					<tr
						onclick={rowClick(`/users/${p.userId}`)}
						class="cursor-pointer border-b border-border/50 transition-colors last:border-b-0 hover:bg-surface-800/50 {p.rank <=
						3
							? 'bg-accent/[0.02]'
							: ''}"
					>
						<td
							class="font-700 py-3 pl-4 text-center text-sm tabular-nums {medal?.color ??
								'text-text-secondary'}"
						>
							{medal ? medal.emoji : p.rank}
						</td>
						<td class="py-3">
							{#if p.image}
								<img src={p.image} alt="" class="h-8 w-8 rounded-full" />
							{:else}
								<div
									class="font-700 flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs text-text-secondary"
								>
									{p.name.charAt(0).toUpperCase()}
								</div>
							{/if}
						</td>
						<td class="font-600 py-3 text-sm">{p.name}</td>
						<td class="font-700 py-3 pr-4 text-right text-sm tabular-nums {eloColor(p.elo)}"
							>{p.elo}</td
						>
						<td class="py-3 pr-4 text-right text-xs text-text-secondary tabular-nums">
							<span class="text-green-400">{p.wins}</span>/<span class="text-red-400"
								>{p.losses}</span
							>
						</td>
						<td
							class="font-600 py-3 pr-4 text-right text-xs tabular-nums {p.winRate !== '—' &&
							parseFloat(p.winRate) >= 50
								? 'text-green-400'
								: 'text-text-secondary'}"
						>
							{p.winRate}{p.winRate !== '—' ? '%' : ''}
						</td>
					</tr>
				{/snippet}
			</DataTable>
		</div>
	{/if}

	<!-- Top Teams -->
	{#if activeTab === 'teams'}
		<div class="mt-6">
			<DataTable data={data.topTeams} meta={data.meta} columns={teamColumns}>
				{#snippet row(t, _i)}
					{@const medal = rankBadge(t.rank)}
					<tr
						onclick={rowClick(`/teams/${t.teamId}`)}
						class="cursor-pointer border-b border-border/50 transition-colors last:border-b-0 hover:bg-surface-800/50 {t.rank <=
						3
							? 'bg-accent/[0.02]'
							: ''}"
					>
						<td
							class="font-700 py-3 pl-4 text-center text-sm tabular-nums {medal?.color ??
								'text-text-secondary'}"
						>
							{medal ? medal.emoji : t.rank}
						</td>
						<td class="py-3">
							{#if t.avatarUrl}
								<img src={t.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
							{:else}
								<div
									class="font-700 flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs text-text-secondary"
								>
									{t.name.charAt(0).toUpperCase()}
								</div>
							{/if}
						</td>
						<td class="py-3">
							<span class="font-600 text-sm">{t.name}</span>
							<p class="text-xs text-text-secondary">
								{t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
							</p>
						</td>
						<td class="font-700 py-3 pr-4 text-right text-sm text-green-400 tabular-nums"
							>{t.wins}</td
						>
						<td class="py-3 pr-4 text-right text-xs text-text-secondary tabular-nums"
							>{t.totalMatches}</td
						>
					</tr>
				{/snippet}
			</DataTable>
		</div>
	{/if}

	<!-- High Scores -->
	{#if activeTab === 'scores'}
		<div class="mt-6">
			<DataTable data={data.highScores} meta={data.meta} columns={scoreColumns}>
				{#snippet row(s, _i)}
					{@const medal = rankBadge(s.rank)}
					<tr
						onclick={rowClick(`/users/${s.playerUserId}`)}
						class="cursor-pointer border-b border-border/50 transition-colors last:border-b-0 hover:bg-surface-800/50 {s.rank <=
						3
							? 'bg-accent/[0.02]'
							: ''}"
					>
						<td
							class="font-700 py-3 pl-4 text-center text-sm tabular-nums {medal?.color ??
								'text-text-secondary'}"
						>
							{medal ? medal.emoji : s.rank}
						</td>
						<td class="py-3">
							{#if s.playerImage}
								<img src={s.playerImage} alt="" class="h-8 w-8 rounded-full" />
							{:else}
								<div
									class="font-700 flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs text-text-secondary"
								>
									{s.playerName.charAt(0).toUpperCase()}
								</div>
							{/if}
						</td>
						<td class="py-3">
							<span class="font-600 text-sm">{s.playerName}</span>
							<p class="truncate text-xs text-text-secondary">{s.matchName}</p>
						</td>
						<td
							class="font-600 py-3 pr-4 text-right text-xs {catColors[s.mapCategory] ??
								'text-text-secondary'}"
						>
							{s.mapCategory}{s.mapOrder}
						</td>
						<td
							class="font-700 py-3 pr-4 text-right text-sm tabular-nums {s.pp != null
								? 'text-accent'
								: 'text-text-secondary/40'}"
						>
							{s.pp != null ? `${Math.round(s.pp)}pp` : '—'}
						</td>
						<td class="font-700 py-3 pr-4 text-right text-sm text-text-primary tabular-nums">
							{s.score.toLocaleString()}
						</td>
						<td class="py-3 pr-4 text-right text-xs text-text-secondary tabular-nums">
							{s.accuracy > 0 ? `${(s.accuracy * 100).toFixed(1)}%` : '—'}
						</td>
					</tr>
				{/snippet}
			</DataTable>
		</div>
	{/if}

	<!-- ELO Explanation -->
	<div class="mt-6 rounded-lg border border-border bg-surface-800 p-5">
		<h2 class="font-600 text-sm">How ELO Works</h2>
		<p class="mt-2 text-xs leading-relaxed text-text-secondary">
			Your initial rating is seeded from your osu! global rank. Winning gains ELO and losing drops
			it, but the amount depends on your opponent's rating — beating a stronger player earns more
			points. New players' ratings shift faster to help find your true skill level quickly. Queue
			matchmaking pairs players with similar ELO for fair matches.
		</p>
	</div>
</div>
