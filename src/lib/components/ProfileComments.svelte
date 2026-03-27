<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	type Comment = {
		id: string;
		content: string;
		createdAt: string | Date;
		author: { id: string; name: string; image: string | null };
	};

	const { comments, actionUrl }: { comments: Comment[]; actionUrl: string } = $props();

	const user = $derived(page.data?.user);
	let content = $state('');
	let posting = $state(false);

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
</script>

<div class="mt-6">
	<h2 class="font-600 text-sm text-text-secondary">Comments</h2>

	{#if user}
		<form
			method="POST"
			action={actionUrl}
			use:enhance={() => {
				posting = true;
				return async ({ result, update }) => {
					posting = false;
					if (result.type === 'success') {
						content = '';
						await update();
					}
				};
			}}
			class="mt-3"
		>
			<div class="flex gap-3">
				{#if user.image}
					<img src={user.image} alt="" class="h-8 w-8 shrink-0 rounded-full" />
				{:else}
					<div class="h-8 w-8 shrink-0 rounded-full bg-surface-600"></div>
				{/if}
				<div class="flex-1">
					<textarea
						name="content"
						bind:value={content}
						placeholder="Leave a comment..."
						rows="2"
						class="w-full resize-none rounded-lg border border-border bg-surface-800 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
					></textarea>
					<div class="mt-1.5 flex justify-end">
						<button
							type="submit"
							disabled={posting || !content.trim()}
							class="font-600 rounded-md bg-accent px-3 py-1.5 text-xs text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50"
						>
							{posting ? 'Posting...' : 'Post'}
						</button>
					</div>
				</div>
			</div>
		</form>
	{:else}
		<p class="mt-3 text-sm text-text-secondary">Sign in to leave a comment.</p>
	{/if}

	{#if comments.length > 0}
		<div class="mt-4 flex flex-col gap-3">
			{#each comments as comment}
				<div class="flex gap-3">
					{#if comment.author.image}
						<a href="/users/{comment.author.id}" class="shrink-0">
							<img src={comment.author.image} alt="" class="h-8 w-8 rounded-full" />
						</a>
					{:else}
						<a href="/users/{comment.author.id}" class="shrink-0">
							<div
								class="font-700 flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs text-text-secondary"
							>
								{comment.author.name.charAt(0).toUpperCase()}
							</div>
						</a>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<a href="/users/{comment.author.id}" class="font-600 text-sm hover:text-accent"
								>{comment.author.name}</a
							>
							<span class="text-[10px] text-text-secondary/50">{timeAgo(comment.createdAt)}</span>
						</div>
						<p class="mt-0.5 text-sm break-words whitespace-pre-wrap text-text-secondary">
							{comment.content}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{:else if !user}
		<p class="mt-4 text-sm text-text-secondary/50">No comments yet.</p>
	{/if}
</div>
