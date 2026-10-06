<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import MovieOverlay from '$lib/components/movie/MovieOverlay.svelte';
	import ConfirmDialog from '$lib/components/feedback/ConfirmDialog.svelte';
	import { Toaster } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import { reportClientError } from '$lib/client/report-error';
	import ErrorBoundary from '$lib/components/feedback/ErrorBoundary.svelte';

	let { children } = $props();

	// Erros soltos no navegador (fora de qualquer boundary) também são registrados (§6.4.7).
	onMount(() => {
		const onError = (event: ErrorEvent) =>
			reportClientError(event.error ?? event.message, 'window');
		const onRejection = (event: PromiseRejectionEvent) =>
			reportClientError(event.reason, 'rejection');
		window.addEventListener('error', onError);
		window.addEventListener('unhandledrejection', onRejection);
		return () => {
			window.removeEventListener('error', onError);
			window.removeEventListener('unhandledrejection', onRejection);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://image.tmdb.org" />
</svelte:head>

<LoadingBar />

<ErrorBoundary class="mx-auto my-24 max-w-md">
	{@render children()}
</ErrorBoundary>

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
