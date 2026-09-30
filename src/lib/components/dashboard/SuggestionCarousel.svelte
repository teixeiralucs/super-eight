<script lang="ts">
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import MovieMetaLine from '$lib/components/MovieMetaLine.svelte';
	import { movieMeta, yearOf } from '$lib/format';
	import type { MovieCard } from '$lib/library/types';
	import { backdropSrcset, backdropUrl } from '$lib/tmdb/images';

	// Filmes aleatórios da própria biblioteca (assistidos ou não). O card inteiro leva ao filme.
	let { movies }: { movies: MovieCard[] } = $props();

	const INTERVAL_MS = 6000;

	let index = $state(0);
	let paused = $state(false);
	const current = $derived(movies[index]);
	const pad = (n: number) => String(n).padStart(2, '0');

	/** Só troca depois que o próximo backdrop baixou (evita tela escura em rede lenta). */
	async function goTo(next: number) {
		const target = (next + movies.length) % movies.length;
		const path = movies[target]?.backdropPath;
		if (path) {
			const img = new Image();
			img.src = backdropUrl(path, 'w1280')!;
			await img.decode().catch(() => {});
		}
		index = target;
	}

	$effect(() => {
		if (movies.length < 2 || paused || prefersReducedMotion.current) return;
		const timer = setTimeout(() => goTo(index + 1), INTERVAL_MS);
		return () => clearTimeout(timer);
	});
</script>

<section
	aria-roledescription="carrossel"
	aria-label="Sugestões para você"
	class="relative isolate h-full min-h-[380px] overflow-hidden rounded-3xl ring-1 ring-white/10 transition duration-300 has-[a:hover]:ring-2 has-[a:hover]:ring-neon-pink md:min-h-[460px]"
	onmouseenter={() => (paused = true)}
	onmouseleave={() => (paused = false)}
	onfocusin={() => (paused = true)}
	onfocusout={() => (paused = false)}
>
	{#if current}
		<!-- Fundo -->
		{#key current.id}
			<div
				class="absolute inset-0 -z-10"
				transition:fade={{ duration: prefersReducedMotion.current ? 0 : 900 }}
			>
				<img
					src={backdropUrl(current.backdropPath, 'w300')}
					alt=""
					aria-hidden="true"
					class="absolute inset-0 size-full scale-110 object-cover blur-2xl"
				/>
				<img
					src={backdropUrl(current.backdropPath, 'w1280')}
					srcset={backdropSrcset(current.backdropPath)}
					sizes="(min-width: 1280px) 66vw, 100vw"
					alt=""
					class="absolute inset-0 size-full object-cover"
				/>
			</div>
		{/key}
		<div
			class="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/40 to-background/0"
		></div>
		<div
			class="absolute inset-0 -z-10 bg-linear-to-r from-background/60 via-transparent to-transparent"
		></div>

		<!-- Card clicável -->
		<a
			href={resolve('/movie/[id]', { id: String(current.id) })}
			class="absolute inset-0 flex flex-col justify-between p-6 md:p-8"
		>
			<p class="flex items-center gap-3 text-xs tracking-[0.25em] uppercase">
				<span class="text-neon-cyan">Sugestões para você</span>
				<span class="text-white/60 tabular-nums">{pad(index + 1)}/{pad(movies.length)}</span>
			</p>

			{#key current.id}
				<div in:fade={{ duration: prefersReducedMotion.current ? 0 : 500, delay: 150 }}>
					<div class="flex items-end justify-between gap-6">
						<h2
							class="font-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.03em]"
						>
							{current.title}
						</h2>
						{#if yearOf(current.releaseDate)}
							<span
								class="shrink-0 font-display text-2xl font-light text-white/80 tabular-nums md:text-3xl"
								>{yearOf(current.releaseDate)}</span
							>
						{/if}
					</div>
					<MovieMetaLine meta={movieMeta(current)} class="mt-3 text-sm text-white/65" />
				</div>
			{/key}
		</a>

		<!-- Controles (fora do link) -->
		<div class="absolute top-4 right-4 flex gap-2 md:top-6 md:right-6">
			<button
				type="button"
				onclick={() => goTo(index - 1)}
				class="grid size-9 place-items-center rounded-full border border-white/15 bg-background/40 backdrop-blur-md transition hover:border-white/40"
				aria-label="Sugestão anterior"
			>
				<ChevronLeftIcon class="size-4" />
			</button>
			<button
				type="button"
				onclick={() => goTo(index + 1)}
				class="grid size-9 place-items-center rounded-full border border-white/15 bg-background/40 backdrop-blur-md transition hover:border-white/40"
				aria-label="Próxima sugestão"
			>
				<ChevronRightIcon class="size-4" />
			</button>
		</div>
		<div class="pointer-events-none absolute inset-x-6 bottom-3 flex gap-1.5 md:inset-x-8">
			{#each movies as movie, i (movie.id)}
				<span
					class={[
						'h-0.5 flex-1 rounded-full transition-colors duration-500',
						i === index ? 'bg-neon-cyan' : 'bg-white/20'
					]}
				></span>
			{/each}
		</div>
	{:else}
		<div class="grid h-full place-items-center p-8 text-center text-muted-foreground">
			Não foi possível carregar sugestões agora.
		</div>
	{/if}
</section>
