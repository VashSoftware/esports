<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	const categories = ['NM', 'HD', 'HR', 'DT', 'FM', 'TB'];

	let addingCategory = $state('NM');
	let beatmapInput = $state('');
	let addError = $state('');
	let searching = $state(false);

	// Group slots by category
	const grouped = $derived(() => {
		const groups: Record<string, typeof data.pool.slots> = {};
		for (const cat of categories) {
			const slots = data.pool.slots.filter((s) => s.category === cat);
			if (slots.length > 0) groups[cat] = slots;
		}
		return groups;
	});

	function parseBeatmapId(input: string): string | null {
		// Accept raw ID or osu! URL
		const urlMatch = input.match(/beatmaps\/(\d+)/);
		if (urlMatch) return urlMatch[1];
		const match = input.match(/^(\d+)$/);
		return match ? match[1] : null;
	}

	function formatLength(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const categoryColors: Record<string, string> = {
		NM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		HD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
		HR: 'bg-red-500/20 text-red-400 border-red-500/30',
		DT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
		FM: 'bg-green-500/20 text-green-400 border-green-500/30',
		TB: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
	};
</script>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="/mappools" class="text-text-secondary transition-colors hover:text-text-primary">←</a
			>
			<div>
				<h1 class="text-2xl font-700 tracking-tight">{data.pool.name}</h1>
				<p class="mt-1 text-sm text-text-secondary">
					{data.pool.slots.length} map{data.pool.slots.length !== 1 ? 's' : ''}
				</p>
			</div>
		</div>

		<form method="post" action="?/deletePool" use:enhance>
			<button
				type="submit"
				onclick={(e) => {
					if (!confirm('Delete this mappool?')) e.preventDefault();
				}}
				class="rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
			>
				Delete Pool
			</button>
		</form>
	</div>

	<!-- Add Map -->
	<form
		method="post"
		action="?/addSlot"
		use:enhance={() => {
			searching = true;
			addError = '';
			return async ({ result, update }) => {
				searching = false;
				if (result.type === 'success') {
					beatmapInput = '';
					await update();
				} else if (result.type === 'failure') {
                    addError = (result.data as { error?: string })?.error ?? 'Failed to add map';				}
			};
		}}
		class="mt-6 rounded-lg border border-border bg-surface-800 p-4"
	>
		<h2 class="text-sm font-600">Add Map</h2>
		<div class="mt-3 flex gap-3">
			<select
				name="category"
				bind:value={addingCategory}
				class="rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
			>
				{#each categories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>

			<input
				type="text"
				name="beatmapId"
				bind:value={beatmapInput}
				placeholder="Beatmap ID or URL (e.g. 75 or https://osu.ppy.sh/beatmaps/75)"
				class="flex-1 rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
			/>

			<button
				type="submit"
				disabled={searching || !beatmapInput.trim()}
				class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50"
			>
				{searching ? 'Adding...' : 'Add'}
			</button>
		</div>

		{#if addError}
			<p class="mt-2 text-sm text-red-400">{addError}</p>
		{/if}
	</form>

	<!-- Map List -->
	<div class="mt-6 flex flex-col gap-6">
		{#each Object.entries(grouped()) as [category, slots]}
			<div>
				<div class="mb-2 flex items-center gap-2">
					<span
						class="rounded border px-2 py-0.5 text-xs font-600 {categoryColors[category] ?? 'bg-surface-600 text-text-secondary border-border'}"
					>
						{category}
					</span>
					<span class="text-xs text-text-secondary">{slots.length} map{slots.length !== 1 ? 's' : ''}</span>
				</div>

				<div class="flex flex-col gap-2">
					{#each slots as slot, i}
						<div
							class="group flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-2 transition-colors hover:border-accent/30"
						>
							<!-- Cover -->
							{#if slot.beatmap?.coverUrl}
								<img
									src={slot.beatmap.coverUrl}
									alt=""
									class="h-12 w-24 rounded object-cover"
								/>
							{:else}
								<div class="flex h-12 w-24 items-center justify-center rounded bg-surface-700 text-xs text-text-secondary">
									No cover
								</div>
							{/if}

							<!-- Info -->
							<div class="min-w-0 flex-1">
								{#if slot.beatmap}
<a
										href={slot.beatmap.url}
										target="_blank"
										rel="noopener"
										class="truncate text-sm font-500 hover:text-accent"
									>
										{slot.beatmap.artist} - {slot.beatmap.title}
									</a>
									<div class="mt-0.5 flex items-center gap-3 text-xs text-text-secondary">
										<span>[{slot.beatmap.version}]</span>
										<span>★ {slot.beatmap.starRating.toFixed(2)}</span>
										<span>{slot.beatmap.bpm} BPM</span>
										<span>{formatLength(slot.beatmap.totalLength)}</span>
									</div>
								{:else}
									<p class="text-sm text-text-secondary">Beatmap #{slot.beatmapId}</p>
								{/if}
							</div>

							<!-- Slot label -->
							<span class="text-xs font-600 text-text-secondary">
								{category}{i + 1}
							</span>

							<!-- Delete -->
							<form method="post" action="?/removeSlot" use:enhance>
								<input type="hidden" name="slotId" value={slot.id} />
								<button
									type="submit"
									class="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
								>
									✕
								</button>
							</form>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<p class="text-sm text-text-secondary">No maps yet. Add your first map above.</p>
			</div>
		{/each}
	</div>
</div>
