<script lang="ts">
	import './layout.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-dvh">
	<Sidebar />
	<div class="ml-56 flex flex-1 flex-col">
		<Header />
		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</div>
</div>
