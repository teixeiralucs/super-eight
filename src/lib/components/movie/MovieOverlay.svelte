<script lang="ts">
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { MovieDetailData } from '$lib/movie/types';
	import { closeMovie, heroTransition } from '$lib/movie/open.svelte';
	import MovieDetail from './MovieDetail.svelte';

	/** Painel de detalhes em tela cheia sobre a página atual. Fechar = voltar no histórico. */
	let { data }: { data: MovieDetailData } = $props();

	let dialog: HTMLDivElement | undefined = $state();
	// Com o zoom do pôster, o fundo volta para dentro do pôster de origem.
	const close = () => closeMovie(data.movie.id);

	$effect(() => {
		// Trava a rolagem da página de baixo e leva o foco para o painel.
		const previous = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		dialog?.focus();
		return () => {
			document.documentElement.style.overflow = previous;
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		// Com o trailer aberto, o Esc fecha só o trailer.
		if (event.key === 'Escape' && !document.querySelector('[data-nested-dialog]')) close();
	}}
/>

<div
	bind:this={dialog}
	role="dialog"
	aria-modal="true"
	aria-label={data.movie.originalTitle}
	tabindex="-1"
	class="fixed inset-0 z-[60] overflow-y-auto bg-background outline-none"
	transition:fly={{
		y: prefersReducedMotion.current ? 0 : 24,
		// Durante o zoom do pôster, a própria transição do navegador faz a entrada/saída.
		duration: heroTransition.active ? 0 : 350,
		opacity: 0
	}}
>
	<MovieDetail {data} onClose={close} />
</div>
