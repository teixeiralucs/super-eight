<script lang="ts">
	import MovieDetail from '$lib/components/movie/MovieDetail.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.movie.title}{data.movie.year ? ` (${data.movie.year})` : ''} — Super Eight</title>
	{#if data.movie.overview}
		<meta name="description" content={data.movie.overview.slice(0, 160)} />
	{/if}
</svelte:head>

<MovieDetail {data} />
