<script lang="ts">
	import { enhance } from '$app/forms';

	let error = $state('');
	let submitting = $state(false);
	let format = $state('single_elim');
</script>

<svelte:head>
	<title>Create Tournament — Vash Esports</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
	<div>
		<h1 class="font-700 text-2xl tracking-tight">Create Tournament</h1>
		<p class="mt-1 text-sm text-text-secondary">
			Set up your tournament, then configure rounds and mappools
		</p>
	</div>

	{#if error}
		<p class="mt-4 text-sm text-red-400">{error}</p>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			error = '';
			return async ({ result, update }) => {
				submitting = false;
				if (
					result.type === 'failure' ||
					(result.type === 'success' && (result.data as any)?.error)
				) {
					error = (result.data as any)?.error ?? 'Failed to create tournament';
				} else {
					await update();
				}
			};
		}}
		class="mt-6 flex flex-col gap-5"
	>
		<!-- Name -->
		<div>
			<label for="name" class="font-500 text-xs text-text-secondary">Tournament Name</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				placeholder="e.g. Vash Open #1"
				class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
			/>
		</div>

		<!-- Description -->
		<div>
			<label for="description" class="font-500 text-xs text-text-secondary"
				>Description (optional)</label
			>
			<textarea
				id="description"
				name="description"
				rows="2"
				placeholder="What's this tournament about?"
				class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
			></textarea>
		</div>

		<!-- Format + Slots -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="format" class="font-500 text-xs text-text-secondary">Format</label>
				<select
					id="format"
					name="format"
					required
					bind:value={format}
					class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
				>
					<option value="single_elim">Single Elimination</option>
					<option value="double_elim">Double Elimination</option>
					<option value="groups_bracket">Groups + Bracket</option>
				</select>
			</div>

			<div>
				<label for="maxSlots" class="font-500 text-xs text-text-secondary">Max Players</label>
				<select
					id="maxSlots"
					name="maxSlots"
					required
					class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
				>
					{#each [4, 8, 16, 32, 64, 128] as n}
						<option value={n} selected={n === 16}>{n}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Team Size + Scoring -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="teamSize" class="font-500 text-xs text-text-secondary">Team Size</label>
				<select
					id="teamSize"
					name="teamSize"
					required
					class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
				>
					<option value="1" selected>1v1</option>
					<option value="2">2v2</option>
					<option value="3">3v3</option>
					<option value="4">4v4</option>
				</select>
			</div>

			<div>
				<label for="scoringType" class="font-500 text-xs text-text-secondary">Scoring</label>
				<select
					id="scoringType"
					name="scoringType"
					required
					class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
				>
					<option value="score_v2" selected>ScoreV2</option>
					<option value="score">Score V1</option>
					<option value="accuracy">Accuracy</option>
					<option value="combo">Combo</option>
				</select>
			</div>
		</div>

		<!-- Start Date -->
		<div>
			<label for="startAt" class="font-500 text-xs text-text-secondary">Start Date (optional)</label
			>
			<input
				id="startAt"
				name="startAt"
				type="datetime-local"
				class="mt-1 w-full rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
			/>
		</div>

		<div class="mt-1 flex justify-end">
			<button
				type="submit"
				disabled={submitting}
				class="font-600 rounded-md bg-accent px-5 py-2 text-sm text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50"
			>
				{submitting ? 'Creating...' : 'Create Tournament'}
			</button>
		</div>
	</form>
</div>
