<script lang="ts">
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { MovieDetailData } from '$lib/movie/types';
	import MovieDetail from './MovieDetail.svelte';

	/** Painel de detalhes em tela cheia sobre a página atual. Fechar = voltar no histórico. */
	let { data }: { data: MovieDetailData } = $props();

	let dialog: HTMLDivElement | undefined = $state();
	const close = () => history.back();

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
	aria-label={data.movie.title}
	tabindex="-1"
	class="fixed inset-0 z-[60] overflow-y-auto bg-background outline-none"
	transition:fly={{ y: prefersReducedMotion.current ? 0 : 24, duration: 350, opacity: 0 }}
>
	<MovieDetail {data} onClose={close} />
</div>
