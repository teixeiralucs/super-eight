<script lang="ts">
	import { openMovie } from '$lib/movie/open.svelte';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import StarIcon from '@lucide/svelte/icons/star';
	import { backdropSrcset, backdropUrl } from '$lib/tmdb/images';
	import type { TMDbMovie } from '$lib/tmdb/types';

	let { movies, signedIn }: { movies: TMDbMovie[]; signedIn: boolean } = $props();

	const INTERVAL_MS = 7000;

	let index = $state(0);
	let paused = $state(false);
	const current = $derived(movies[index]);

	/** Só troca de slide depois que o próximo backdrop já baixou (evita tela escura em rede lenta). */
	async function goTo(next: number) {
		const path = movies[next]?.backdropPath;
		if (path) {
			const img = new Image();
			img.src = backdropUrl(path, 'w1280')!;
			await img.decode().catch(() => {});
		}
		index = next;
	}

	$effect(() => {
		if (movies.length < 2 || paused || prefersReducedMotion.current) return;
		const timer = setTimeout(() => goTo((index + 1) % movies.length), INTERVAL_MS);
		return () => clearTimeout(timer);
	});

	const pad = (n: number) => String(n).padStart(2, '0');
</script>

<section
	class="relative isolate flex min-h-svh flex-col justify-end overflow-hidden"
	aria-label="Destaques"
	onmouseenter={() => (paused = true)}
	onmouseleave={() => (paused = false)}
>
	<!-- Backdrop em tela cheia -->
	<div class="absolute inset-0 -z-10">
		{#if current?.backdropPath}
			{#key current.id}
				<div
					class="absolute inset-0"
					transition:fade={{ duration: prefersReducedMotion.current ? 0 : 1200 }}
				>
					<!-- Prévia leve e desfocada enquanto a versão grande carrega -->
					<img
						src={backdropUrl(current.backdropPath, 'w300')}
						alt=""
						aria-hidden="true"
						class="absolute inset-0 size-full scale-110 object-cover blur-2xl"
					/>
					<img
						src={backdropUrl(current.backdropPath, 'w1280')}
						srcset={backdropSrcset(current.backdropPath)}
						sizes="100vw"
						alt=""
						class="absolute inset-0 size-full object-cover"
						fetchpriority={index === 0 ? 'high' : 'auto'}
					/>
				</div>
			{/key}
		{/if}
		<!-- Vinhetas para legibilidade -->
		<div
			class="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"
		></div>
		<div
			class="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent"
		></div>
		<div
			class="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/60 to-transparent"
		></div>
	</div>

	<div
		class="mx-auto grid w-full max-w-[1600px] gap-10 px-5 pt-32 pb-14 md:px-10 md:pb-20 lg:grid-cols-[1fr_auto] lg:items-end"
	>
		<!-- Chamada principal -->
		<div class="max-w-4xl">
			<p class="mb-6 text-xs font-medium tracking-[0.35em] text-neon-cyan uppercase">
				Seu diário de cinema
			</p>
			<h1
				class="font-display text-[clamp(2.75rem,8vw,7.5rem)] leading-[0.9] font-bold tracking-[-0.04em] uppercase"
			>
				Tudo que você assiste.
				<span class="block text-white/35">Num só lugar.</span>
			</h1>
			<p class="mt-6 max-w-md text-base text-white/70 md:text-lg">
				Registre, avalie e organize seus filmes — e descubra o que
				<em class="font-serif text-xl text-white italic md:text-2xl">vale a próxima sessão</em>.
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<a
					href={resolve(signedIn ? '/dashboard' : '/signup')}
					class="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition hover:shadow-[0_0_32px_var(--neon-pink)]"
				>
					{signedIn ? 'Abrir minha biblioteca' : 'Começar minha biblioteca'}
				</a>
				<a
					href="#em-alta"
					class="rounded-full border border-white/20 px-7 py-3 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:border-white/40 hover:bg-white/5"
				>
					Explorar filmes
				</a>
			</div>
		</div>

		<!-- Filme em destaque -->
		{#if current}
			<aside class="w-full max-w-xs lg:justify-self-end">
				<div class="mb-4 flex items-center gap-3 text-xs tracking-[0.25em] text-white/50 uppercase">
					<span>Em alta</span>
					<span class="text-white/80 tabular-nums">{pad(index + 1)}/{pad(movies.length)}</span>
				</div>
				{#key current.id}
					<a
						href={resolve('/movie/[id]', { id: String(current.id) })}
						onclick={(event) => openMovie(event, current.id)}
						class="group block"
						in:fade={{ duration: prefersReducedMotion.current ? 0 : 600, delay: 200 }}
					>
						<h2 class="font-display text-2xl leading-tight font-semibold">
							{current.title}
							<ArrowUpRightIcon
								class="inline size-5 -translate-y-0.5 text-neon-cyan opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
								aria-hidden="true"
							/>
						</h2>
						<p class="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-white/60">
							{#if current.year}<span>{current.year}</span>{/if}
							{#if current.genres.length}<span aria-hidden="true">·</span><span
									>{current.genres.slice(0, 2).join(', ')}</span
								>{/if}
							{#if current.voteAverage}
								<span aria-hidden="true">·</span>
								<span class="flex items-center gap-1 text-neon-peach">
									<StarIcon class="size-3.5 fill-current" aria-hidden="true" />
									<span class="sr-only">Nota</span>{current.voteAverage.toFixed(1)}
								</span>
							{/if}
						</p>
					</a>
				{/key}

				<!-- Indicadores -->
				<div class="mt-6 flex gap-2" role="tablist" aria-label="Escolher destaque">
					{#each movies as movie, i (movie.id)}
						<button
							type="button"
							role="tab"
							aria-selected={i === index}
							aria-label={movie.title}
							class="group relative h-6 flex-1"
							onclick={() => goTo(i)}
						>
							<span
								class={[
									'absolute inset-x-0 top-1/2 h-px -translate-y-1/2 transition-all duration-500',
									i === index
										? 'h-0.5 bg-neon-cyan shadow-[0_0_10px_var(--neon-cyan)]'
										: 'bg-white/25 group-hover:bg-white/50'
								]}
							></span>
						</button>
					{/each}
				</div>
			</aside>
		{/if}
	</div>
</section>
