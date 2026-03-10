<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	const categories = ['NM', 'HD', 'HR', 'DT', 'FM', 'TB'];

	let addingCategory = $state('NM');
	let beatmapInput = $state('');
	let addError = $state('');
	let searching = $state(false);

	// Inline per-category add state
	let inlineInputs = $state<Record<string, string>>({});
	let inlineSearching = $state<Record<string, boolean>>({});
	let inlineErrors = $state<Record<string, string>>({});

	// Drag-and-drop state
	let draggedSlot = $state<{ id: string; category: string; index: number } | null>(null);
	let dropTarget = $state<{ category: string; index: number } | null>(null);
	const isDragging = $derived(draggedSlot !== null);

	// Bulk import state
	let bulkOpen = $state(false);
	let bulkData = $state('');
	let bulkImporting = $state(false);
	let bulkResult = $state<{ successCount: number; errors: string[] } | null>(null);

	// Rename state
	let editing = $state(false);
	let editName = $derived(data.pool.name);

	// Check if pool has any maps at all
	const hasAnySlots = $derived(data.pool.slots.length > 0);

	// Svelte action: attaches drag listeners via addEventListener
	function makeDraggable(
		node: HTMLElement,
		params: { slotId: string; category: string; index: number; enabled: boolean }
	) {
		let current = params;
		node.draggable = current.enabled;

		function onDragStart(e: DragEvent) {
			if (!current.enabled || !e.dataTransfer) return;
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', current.slotId);

			// Delay reactive state update to next frame — setting draggedSlot
			// synchronously causes Svelte to insert empty category DOM nodes,
			// which shifts the dragged element and makes the browser cancel the drag.
			const snapshot = { ...current };
			requestAnimationFrame(() => {
				draggedSlot = { id: snapshot.slotId, category: snapshot.category, index: snapshot.index };
			});
		}

		function onDragEnd() {
			draggedSlot = null;
			dropTarget = null;
		}

		node.addEventListener('dragstart', onDragStart);
		node.addEventListener('dragend', onDragEnd);

		return {
			update(newParams: typeof params) {
				current = newParams;
				node.draggable = current.enabled;
			},
			destroy() {
				node.removeEventListener('dragstart', onDragStart);
				node.removeEventListener('dragend', onDragEnd);
			}
		};
	}

	function handleDragOver(e: DragEvent, category: string, index: number) {
		if (!draggedSlot) return;
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';

		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const midY = rect.top + rect.height / 2;
		const dropIndex = e.clientY < midY ? index : index + 1;

		if (
			draggedSlot.category === category &&
			(dropIndex === draggedSlot.index || dropIndex === draggedSlot.index + 1)
		) {
			dropTarget = null;
			return;
		}

		dropTarget = { category, index: dropIndex };
	}

	function handleCategoryDragOver(e: DragEvent, category: string, slotCount: number) {
		if (!draggedSlot) return;
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';
		dropTarget = { category, index: slotCount };
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (!draggedSlot || !dropTarget) {
			draggedSlot = null;
			dropTarget = null;
			return;
		}

		const { id: slotId } = draggedSlot;
		const { category: targetCategory, index: targetIndex } = dropTarget;

		let adjustedIndex = targetIndex;
		if (draggedSlot.category === targetCategory && draggedSlot.index < targetIndex) {
			adjustedIndex = targetIndex - 1;
		}

		draggedSlot = null;
		dropTarget = null;

		const formData = new FormData();
		formData.set('slotId', slotId);
		formData.set('targetCategory', targetCategory);
		formData.set('targetIndex', adjustedIndex.toString());

		await fetch('?/moveSlot', {
			method: 'POST',
			body: formData
		});
		await invalidateAll();
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

<style>
	:global([draggable='true']) {
		-webkit-user-select: none;
		user-select: none;
	}
</style>

<svelte:head>
	<title>{data.pool.name} — Mappool | Vash Esports</title>
	<meta
		name="description"
		content="View the {data.pool.name} mappool with {data.pool.slots.length} maps on Vash Esports."
	/>
	<meta property="og:title" content="{data.pool.name} — Mappool | Vash Esports" />
	<meta property="og:description" content="{data.pool.slots.length} maps · View on Vash Esports" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content="https://esports.vash.software/logo.png" />
	<meta property="og:site_name" content="Vash Esports" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="/mappools" class="text-text-secondary transition-colors hover:text-text-primary"
				>&larr;</a
			>
			<div>
				{#if editing && data.canEdit}
					<form
						method="post"
						action="?/rename"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success') {
									editing = false;
									await update();
								}
							};
						}}
						class="flex items-center gap-2"
					>
						<input
							type="text"
							name="name"
							value={editName}
							class="rounded-md border border-accent bg-surface-700 px-3 py-1 text-xl font-700 text-text-primary focus:outline-none"
						/>
						<button
							type="submit"
							class="rounded-md bg-accent px-3 py-1 text-xs font-600 text-surface-900 hover:bg-accent-hover"
						>
							Save
						</button>
						<button
							type="button"
							onclick={() => {
								editing = false;
							}}
							class="rounded-md border border-border px-3 py-1 text-xs text-text-secondary hover:bg-surface-700"
						>
							Cancel
						</button>
					</form>
				{:else}
					<div class="flex items-center gap-2">
						<h1 class="text-2xl font-700 tracking-tight">{data.pool.name}</h1>
						{#if data.pool.verifiedAt}
							<span
								class="flex items-center gap-1 rounded border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-600 text-green-400"
							>
								&#10003; Verified
							</span>
						{/if}
						{#if data.canEdit}
							<button
								onclick={() => {
									editing = true;
								}}
								class="rounded p-1 text-text-secondary transition-colors hover:text-accent"
								title="Rename"
							>
								&#9998;
							</button>
						{/if}
					</div>
				{/if}
				<p class="mt-1 text-sm text-text-secondary">
					{data.pool.slots.length} map{data.pool.slots.length !== 1 ? 's' : ''}
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if data.isAdmin}
				{#if data.pool.verifiedAt}
					<form method="post" action="?/unverify" use:enhance>
						<button
							type="submit"
							class="rounded-md border border-green-500/30 px-3 py-1.5 text-sm text-green-400 transition-colors hover:bg-green-500/10"
						>
							Unverify
						</button>
					</form>
				{:else}
					<form method="post" action="?/verify" use:enhance>
						<button
							type="submit"
							class="rounded-md border border-green-500/30 px-3 py-1.5 text-sm text-green-400 transition-colors hover:bg-green-500/10"
						>
							&#10003; Verify
						</button>
					</form>
				{/if}
			{/if}
			{#if data.canEdit}
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
			{/if}
		</div>
	</div>

	<!-- Add Map -->
	{#if data.canEdit}
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
						addError = (result.data as { error?: string })?.error ?? 'Failed to add map';
					}
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
					placeholder="Beatmap ID or URL (e.g. 75, /b/75, or osu.ppy.sh/beatmaps/75)"
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
	{/if}

	<!-- Bulk Import -->
	{#if data.isAdmin}
		<div class="mt-4 rounded-lg border border-border bg-surface-800">
			<button
				type="button"
				onclick={() => { bulkOpen = !bulkOpen; }}
				class="flex w-full items-center justify-between px-4 py-3 text-sm font-600 text-text-secondary hover:text-text-primary transition-colors"
			>
				Bulk Import
				<span class="text-xs">{bulkOpen ? '▲' : '▼'}</span>
			</button>

			{#if bulkOpen}
				<form
					method="post"
					action="?/bulkImport"
					use:enhance={() => {
						bulkImporting = true;
						bulkResult = null;
						return async ({ result, update }) => {
							bulkImporting = false;
							if (result.type === 'success') {
								const r = (result.data as any)?.bulkImportResult;
								if (r) {
									bulkResult = r;
									if (r.successCount > 0) {
										bulkData = '';
										await update();
									}
								}
							} else if (result.type === 'failure') {
								bulkResult = { successCount: 0, errors: [(result.data as any)?.error ?? 'Import failed'] };
							}
						};
					}}
					class="px-4 pb-4"
				>
					<textarea
						name="data"
						bind:value={bulkData}
						placeholder={"NM1\t181589\nNM2\t2603758\nHR1\t948389\nTB\t457061"}
						rows="6"
						class="w-full rounded-md border border-border bg-surface-700 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
					></textarea>
					<div class="mt-2 flex items-center gap-3">
						<button
							type="submit"
							disabled={bulkImporting || !bulkData.trim()}
							class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50"
						>
							{bulkImporting ? 'Importing...' : 'Import'}
						</button>
						<span class="text-xs text-text-secondary">
							Paste tab-separated lines: mod code + beatmap ID/URL
						</span>
					</div>

					{#if bulkResult}
						<div class="mt-3 rounded-md border border-border bg-surface-700 p-3 text-sm">
							{#if bulkResult.successCount > 0}
								<p class="text-green-400">{bulkResult.successCount} map{bulkResult.successCount !== 1 ? 's' : ''} imported successfully.</p>
							{/if}
							{#if bulkResult.errors.length > 0}
								<div class="mt-1 space-y-1">
									{#each bulkResult.errors as err}
										<p class="text-red-400">{err}</p>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</form>
			{/if}
		</div>
	{/if}

	<!-- Map List -->
	<div class="mt-6 flex flex-col gap-6">
		{#if hasAnySlots || isDragging}
			{#each categories as category (category)}
				{@const slots = data.pool.slots.filter((s) => s.category === category)}
				{#if slots.length > 0 || isDragging}
					<div>
						<!-- Category header (also a drop zone) -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="mb-2 flex items-center gap-2"
							ondragover={(e) => handleCategoryDragOver(e, category, slots.length)}
							ondrop={handleDrop}
						>
							<span
								class="rounded border px-2 py-0.5 text-xs font-600 {categoryColors[
									category
								] ?? 'bg-surface-600 text-text-secondary border-border'}"
							>
								{category}
							</span>
							<span class="text-xs text-text-secondary"
								>{slots.length} map{slots.length !== 1 ? 's' : ''}</span
							>
						</div>

						{#if slots.length === 0}
							<!-- Empty category drop zone during drag -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="rounded-lg border-2 border-dashed py-6 text-center transition-colors {dropTarget?.category ===
								category
									? 'border-accent bg-accent/5'
									: 'border-border/50'}"
								ondragover={(e) => handleCategoryDragOver(e, category, 0)}
								ondrop={handleDrop}
							>
								<p class="text-xs text-text-secondary">Drop here to add to {category}</p>
							</div>
						{:else}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="flex flex-col"
								ondragover={(e) => {
									if (!draggedSlot) return;
									e.preventDefault();
									e.dataTransfer!.dropEffect = 'move';
								}}
								ondrop={handleDrop}
							>
								{#each slots as slot, i (slot.id)}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="group relative flex items-center gap-3 rounded-lg border bg-surface-800 p-2 transition-colors
											{data.canEdit ? 'cursor-grab active:cursor-grabbing' : ''}
											{draggedSlot?.id === slot.id ? 'border-accent/50 opacity-40' : 'border-border hover:border-accent/30'}"
										style={dropTarget?.category === category && dropTarget.index === i
											? `box-shadow: 0 -3px 0 0 var(--color-accent, #8b5cf6); margin-top: 4px;`
											: dropTarget?.category === category &&
												  dropTarget.index === slots.length &&
												  i === slots.length - 1
												? `box-shadow: 0 3px 0 0 var(--color-accent, #8b5cf6); margin-bottom: 4px;`
												: ''}
										ondragover={(e) => handleDragOver(e, category, i)}
										ondrop={handleDrop}
										role={data.canEdit ? 'listitem' : undefined}
										use:makeDraggable={{ slotId: slot.id, category, index: i, enabled: data.canEdit }}
									>
										<!-- Drag grip icon -->
										{#if data.canEdit}
											<div class="flex flex-col gap-0.5 text-text-secondary/40">
												<svg
													class="h-4 w-4"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<circle cx="9" cy="6" r="1.5" />
													<circle cx="15" cy="6" r="1.5" />
													<circle cx="9" cy="12" r="1.5" />
													<circle cx="15" cy="12" r="1.5" />
													<circle cx="9" cy="18" r="1.5" />
													<circle cx="15" cy="18" r="1.5" />
												</svg>
											</div>
										{/if}

										<!-- Cover -->
										{#if slot.beatmap?.coverUrl}
											<img
												src={slot.beatmap.coverUrl}
												alt=""
												class="pointer-events-none h-12 w-24 rounded object-cover"
											/>
										{:else}
											<div
												class="flex h-12 w-24 items-center justify-center rounded bg-surface-700 text-xs text-text-secondary"
											>
												No cover
											</div>
										{/if}

										<!-- Info -->
										<div class="min-w-0 flex-1">
											{#if slot.beatmap}
												<button
													type="button"
													onclick={() => window.open(slot.beatmap?.url, '_blank')}
													class="truncate text-left text-sm font-500 hover:text-accent"
												>
													{slot.beatmap.artist} - {slot.beatmap.title}
												</button>
												<div
													class="mt-0.5 flex items-center gap-3 text-xs text-text-secondary"
												>
													<span>[{slot.beatmap.version}]</span>
													<span
														>{slot.beatmap.starRating.toFixed(
															2
														)}&#9733;</span
													>
													<span>{slot.beatmap.bpm} BPM</span>
													<span
														>{formatLength(
															slot.beatmap.totalLength
														)}</span
													>
												</div>
											{:else}
												<p class="text-sm text-text-secondary">
													Beatmap #{slot.beatmapId}
												</p>
											{/if}
										</div>

										<!-- Slot label -->
										<span class="text-xs font-600 text-text-secondary">
											{category}{i + 1}
										</span>

										<!-- Delete -->
										{#if data.canEdit}
											<form method="post" action="?/removeSlot" use:enhance>
												<input
													type="hidden"
													name="slotId"
													value={slot.id}
												/>
												<button
													type="submit"
													class="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
												>
													&#10005;
												</button>
											</form>
										{/if}
									</div>
								{/each}

								<!-- Inline add for this category -->
								{#if data.canEdit && !isDragging}
									<div class="mt-2">
										<form
											method="post"
											action="?/addSlot"
											use:enhance={() => {
												inlineSearching[category] = true;
												inlineErrors[category] = '';
												return async ({ result, update }) => {
													inlineSearching[category] = false;
													if (result.type === 'success') {
														inlineInputs[category] = '';
														await update();
													} else if (result.type === 'failure') {
														inlineErrors[category] =
															(result.data as { error?: string })
																?.error ?? 'Failed to add map';
													}
												};
											}}
											class="flex items-center gap-2"
										>
											<input
												type="hidden"
												name="category"
												value={category}
											/>
											<input
												type="text"
												name="beatmapId"
												bind:value={inlineInputs[category]}
												placeholder="Add {category}{slots.length +
													1} — paste beatmap ID or URL"
												class="flex-1 rounded-md border border-dashed border-border bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
											/>
											<button
												type="submit"
												disabled={inlineSearching[category] ||
													!inlineInputs[category]?.trim()}
												class="rounded-md bg-accent/10 px-3 py-1.5 text-xs font-600 text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
											>
												{inlineSearching[category]
													? 'Adding...'
													: '+ Add'}
											</button>
										</form>
										{#if inlineErrors[category]}
											<p class="mt-1 text-xs text-red-400">
												{inlineErrors[category]}
											</p>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		{:else}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<p class="text-sm text-text-secondary">No maps yet. Add your first map above.</p>
			</div>
		{/if}
	</div>
</div>
