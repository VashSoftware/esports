<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let creating = $state(false);
	let createError = $state('');

	function stateColor(state: string) {
		const colors: Record<string, string> = {
			CREATED: 'border-border text-text-secondary',
			LOBBY: 'border-yellow-500/30 text-yellow-400',
			ROLLING: 'border-yellow-500/30 text-yellow-400',
			PICKING: 'border-blue-500/30 text-blue-400',
			PLAYING: 'border-green-500/30 text-green-400',
			FINISHED: 'border-border text-text-secondary',
			CANCELLED: 'border-red-500/30 text-red-400'
		};
		return colors[state] ?? 'border-border text-text-secondary';
	}

	function poolLabel(pool: { name: string; slots: { starRating: number | null }[] }) {
		if (pool.slots.length === 0) return pool.name;
		const avg = pool.slots.reduce((s, sl) => s + (sl.starRating ?? 0), 0) / pool.slots.length;
		return `${pool.name} (★${avg.toFixed(1)}, ${pool.slots.length} maps)`;
	}
</script>

<div class="mx-auto max-w-4xl">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-700 tracking-tight">Matches</h1>
			<p class="mt-1 text-sm text-text-secondary">All matches</p>
		</div>
		<button
			onclick={() => (creating = !creating)}
			class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover"
		>
			{creating ? 'Cancel' : 'New Match'}
		</button>
	</div>

	<!-- Create Match Form -->
	{#if creating}
		<form
			method="post"
			action="?/createMatch"
            use:enhance={() => {
                createError = '';
                return async ({ result, update }) => {
                    if (result.type === 'failure') {
                        createError = (result.data as { error?: string })?.error ?? 'Failed to create match';
                    } else {
                        await update();
                    }
                };
            }}
			class="mt-4 rounded-lg border border-border bg-surface-800 p-5"
		>
			<h2 class="text-sm font-600">Create Match</h2>

            <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
                <label for="match-name" class="text-xs text-text-secondary">Match Name</label>
                <input
                    id="match-name"
                    type="text"
                    name="name"
                    placeholder="e.g. Grand Finals"
                    class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
                />
            </div>

            <div>
                <label for="best-of" class="text-xs text-text-secondary">Best Of</label>
                <select
                    id="best-of"
                    name="bestOf"
                    class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                    <option value="3">Best of 3</option>
                    <option value="5">Best of 5</option>
                    <option value="7" selected>Best of 7</option>
                    <option value="9">Best of 9</option>
                    <option value="11">Best of 11</option>
                </select>
            </div>

            <div>
                <label for="team1" class="text-xs text-text-secondary">Team 1</label>
                <select
                    id="team1"
                    name="team1"
                    required
                    class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                    <option value="">Select team...</option>
                    {#each data.teams as t}
                        <option value={t.id}>
                            {t.name}{t.isPersonal ? ' (personal)' : ''}
                        </option>
                    {/each}
                </select>
            </div>

            <div>
                <label for="team2" class="text-xs text-text-secondary">Team 2</label>
                <select
                    id="team2"
                    name="team2"
                    required
                    class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                    <option value="">Select team...</option>
                    {#each data.teams as t}
                        <option value={t.id}>
                            {t.name}{t.isPersonal ? ' (personal)' : ''}
                        </option>
                    {/each}
                </select>
            </div>

            <div class="col-span-2">
                <label for="mappool" class="text-xs text-text-secondary">Mappool</label>
                <select
                    id="mappool"
                    name="mappool"
                    required
                    class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                    <option value="">Select mappool...</option>
                    {#each data.mappools as pool}
                        <option value={pool.id}>{poolLabel(pool)}</option>
                    {/each}
                </select>
            </div>
        </div>

			{#if createError}
				<p class="mt-3 text-sm text-red-400">{createError}</p>
			{/if}

			<button
				type="submit"
				class="mt-4 rounded-md bg-accent px-5 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover"
			>
				Create Match
			</button>
		</form>
	{/if}

	<!-- Match List -->
	<div class="mt-6 flex flex-col gap-2">
		{#each data.matches as m}
			{@const p1 = m.participants[0]}
			{@const p2 = m.participants[1]}
<a

				href="/matches/{m.id}"
				class="flex items-center gap-4 rounded-lg border border-border bg-surface-800 p-4 transition-colors hover:border-accent/30 hover:bg-surface-700"
			>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-600">{m.name}</span>
						<span class="rounded border px-2 py-0.5 text-xs font-600 {stateColor(m.state)}">
							{m.state}
						</span>
					</div>
					<p class="mt-1 text-xs text-text-secondary">
						{p1?.team.name ?? '?'} vs {p2?.team.name ?? '?'}
						· {new Date(m.createdAt).toLocaleDateString()}
					</p>
				</div>

				{#if p1 && p2}
					<div class="flex items-center gap-1 font-mono text-lg font-700 tabular-nums">
						<span>{p1.score}</span>
						<span class="text-text-secondary">-</span>
						<span>{p2.score}</span>
					</div>
				{/if}
			</a>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<p class="text-sm text-text-secondary">No matches yet</p>
			</div>
		{/each}
	</div>
</div>
