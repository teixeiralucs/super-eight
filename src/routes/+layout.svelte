<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import MovieOverlay from '$lib/components/movie/MovieOverlay.svelte';
	import ConfirmDialog from '$lib/components/feedback/ConfirmDialog.svelte';
	import { Toaster } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';

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

<!-- Feedback global (earlySetup.md §6.4.3): toasts e o diálogo de confirmação -->
<Toaster
	theme="dark"
	position="top-center"
	closeButton
	closeButtonAriaLabel={m.toast_close()}
	toastOptions={{ classes: { toast: 'super-eight-toast' } }}
/>
<ConfirmDialog />
