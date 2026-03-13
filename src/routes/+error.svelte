<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-dvh items-center justify-center bg-surface-900">
	<div class="text-center">
		<p class="font-800 text-6xl text-accent">{page.status}</p>
		<h1 class="font-700 mt-4 text-xl text-text-primary">
			{#if page.status === 404}
				Page not found
			{:else if page.status === 403}
				Access denied
			{:else if page.status === 401}
				Not logged in
			{:else}
				Something went wrong
			{/if}
		</h1>
		<p class="mt-2 text-sm text-text-secondary">
			{page.error?.message ?? 'An unexpected error occurred.'}
		</p>
		<a
			href="/"
			class="font-600 mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm text-surface-900 transition-colors hover:bg-accent-hover"
		>
			Back to Dashboard
		</a>
	</div>
</div>
