<script lang="ts">
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { backdropUrl } from '$lib/tmdb/images';
	import { trackVisibility } from '$lib/attachments/visibility';

	/**
	 * Painel de imagem com efeito de letreiro de LED: o backdrop em baixa resolução (w300)
	 * é ampliado com `image-rendering: pixelated` e recoberto por uma malha de pontos.
	 * Bônus: w300 carrega rápido mesmo em rede lenta.
	 */
	let {
		movies
	}: { movies: { id: number; title: string; year: number | null; backdropPath: string }[] } =
		$props();

	const INTERVAL_MS = 7000;
	let index = $state(0);
	let onScreen = $state(true);
	const current = $derived(movies[index]);

	$effect(() => {
		if (movies.length < 2 || !onScreen || prefersReducedMotion.current) return;
		const timer = setTimeout(async () => {
			const next = (index + 1) % movies.length;
			const img = new Image();
			img.src = backdropUrl(movies[next].backdropPath, 'w300')!;
			await img.decode().catch(() => {});
			index = next;
		}, INTERVAL_MS);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="relative isolate size-full overflow-hidden bg-ocean-night"
	{@attach trackVisibility((visible) => (onScreen = visible))}
>
	{#if current}
		{#key current.id}
			<img
				src={backdropUrl(current.backdropPath, 'w300')}
				alt=""
				class="led-image absolute inset-0 -z-10 size-full object-cover"
				transition:fade={{ duration: prefersReducedMotion.current ? 0 : 1400 }}
			/>
		{/key}
	{/if}

	<!-- Malha de LEDs + vinheta -->
	<div class="led-grid pointer-events-none absolute inset-0"></div>
	<div
		class="pointer-events-none absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-background/20"
	></div>

	{#if current}
		{#key current.id}
			<p
				class="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/10 bg-background/85 px-3 py-1.5 text-xs"
				in:fade={{ duration: prefersReducedMotion.current ? 0 : 600, delay: 400 }}
			>
				<span class="size-1.5 rounded-full bg-neon-pink shadow-[0_0_8px_var(--neon-pink)]"></span>
				<span class="text-white/60">Em alta</span>
				<span class="font-medium">{current.title}</span>
				{#if current.year}<span class="text-white/50 tabular-nums">{current.year}</span>{/if}
			</p>
		{/key}
	{/if}
</div>

<style>
	.led-image {
		image-rendering: pixelated;
		/* Leve saturação/contraste para o brilho de LED. */
		filter: saturate(1.25) contrast(1.05);
	}

	/* Cada célula de 7px vira um "LED" redondo; o fundo escuro aparece entre eles. */
	.led-grid {
		background-image: radial-gradient(
			circle at center,
			transparent 0 2.2px,
			var(--background) 2.9px
		);
		background-size: 7px 7px;
		opacity: 0.92;
	}
</style>
