<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';

	let { children } = $props();

	const umamiUrl = env.PUBLIC_UMAMI_URL;
	const umamiId = env.PUBLIC_UMAMI_WEBSITE_ID;
</script>

<svelte:head>
	{#if umamiUrl && umamiId}
		<!-- svelte-ignore a11y_missing_attribute -->
		<script async defer src={umamiUrl} data-website-id={umamiId}></script>
	{/if}
	<link rel="canonical" href={page.url.href} />
	<meta name="robots" content="index, follow" />
</svelte:head>

{@render children()}
