<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import MovieOverlay from '$lib/components/movie/MovieOverlay.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://image.tmdb.org" />
</svelte:head>

<LoadingBar />

{@render children()}

<!-- Detalhes abertos por cima de qualquer página (shallow routing, ver $lib/movie/open) -->
{#if page.state.movie}
	{#key page.state.movie.movie.id}
		<MovieOverlay data={page.state.movie} />
	{/key}
{/if}
