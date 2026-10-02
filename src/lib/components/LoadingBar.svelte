<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { navigating } from '$app/state';
	import { movieOpening } from '$lib/movie/open.svelte';

	// Barra no topo enquanto navega ou abre detalhes (earlySetup.md §6.4.1).
	// Pequeno atraso: navegações rápidas não piscam a barra.
	const busy = $derived(Boolean(navigating.to) || movieOpening.id !== null);
	let visible = $state(false);

	$effect(() => {
		if (!busy) {
			visible = false;
			return;
		}
		const timer = setTimeout(() => (visible = true), 150);
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div
		class="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden"
		role="progressbar"
		aria-label={m.loading()}
	>
		<div
			class="loading-bar h-full w-1/3 bg-linear-to-r from-neon-pink via-neon-purple to-neon-cyan"
		></div>
	</div>
{/if}

<style>
	.loading-bar {
		animation: slide 1.1s ease-in-out infinite;
	}
	@keyframes slide {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(300%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.loading-bar {
			animation: none;
			width: 100%;
			opacity: 0.6;
		}
	}
</style>
