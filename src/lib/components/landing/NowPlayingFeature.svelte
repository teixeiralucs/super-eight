<script lang="ts">
	import { openMovie } from '$lib/movie/open.svelte';
	import { resolve } from '$app/paths';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import { backdropSrcset, backdropUrl, posterSrcset, posterUrl } from '$lib/tmdb/images';
	import type { TMDbMovie } from '$lib/tmdb/types';

	let { movie }: { movie: TMDbMovie } = $props();

	const releaseLabel = $derived(
		movie.releaseDate
			? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(
					new Date(`${movie.releaseDate}T12:00:00`)
				)
			: null
	);
</script>

<section id="em-cartaz" class="scroll-mt-24 py-16 md:py-24" aria-labelledby="em-cartaz-title">
	<div class="mx-auto max-w-[1600px] px-5 md:px-10">
		<p class="mb-3 font-mono text-xs tracking-widest text-muted-foreground">02.</p>
		<h2
			id="em-cartaz-title"
			class="font-display text-4xl leading-none font-bold tracking-[-0.03em] uppercase md:text-6xl"
		>
			Em cartaz
			<span
				class="font-serif text-3xl font-normal tracking-normal text-white/40 normal-case italic md:text-5xl"
				>nos cinemas</span
			>
		</h2>

		<article class="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
			<!-- Imagem grande -->
			<a
				href={resolve('/movie/[id]', { id: String(movie.id) })}
				onclick={(event) => openMovie(event, movie.id)}
				class="group relative block aspect-[4/5] overflow-hidden rounded-lg ring-1 ring-white/10 transition duration-300 hover:ring-2 hover:ring-neon-pink md:aspect-[16/10] lg:aspect-auto lg:min-h-[560px]"
			>
				<img
					src={backdropUrl(movie.backdropPath, 'w1280') ?? posterUrl(movie.posterPath, 'w780')}
					srcset={movie.backdropPath
						? backdropSrcset(movie.backdropPath)
						: posterSrcset(movie.posterPath)}
					sizes="(min-width: 1024px) 55vw, 100vw"
					alt=""
					loading="lazy"
					class="absolute inset-0 size-full object-cover"
				/>
				<div class="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent"></div>
			</a>

			<!-- Texto editorial -->
			<div class="flex flex-col">
				<div class="flex items-start justify-between gap-6">
					<h3
						class="font-display text-[clamp(2.5rem,5vw,4.75rem)] leading-[0.95] font-semibold tracking-[-0.04em]"
					>
						{movie.title}
					</h3>
					<span class="font-mono text-sm text-muted-foreground">01.</span>
				</div>

				{#if movie.year}
					<p
						class="mt-6 font-display text-[clamp(3.5rem,8vw,7rem)] leading-none font-light tracking-[-0.05em] text-white/90"
					>
						{movie.year}
					</p>
				{/if}

				<div class="mt-auto grid gap-8 pt-10 sm:grid-cols-[auto_1fr] sm:gap-12">
					{#if movie.posterPath}
						<img
							src={posterUrl(movie.posterPath, 'w342')}
							alt="Pôster de {movie.title}"
							loading="lazy"
							class="hidden w-40 rounded-md ring-1 ring-white/10 sm:block"
						/>
					{/if}
					<dl class="grid content-start gap-5 text-sm">
						{#if movie.genres.length}
							<div>
								<dt class="mb-1 text-xs text-muted-foreground">Gêneros</dt>
								<dd>{movie.genres.join(', ')}</dd>
							</div>
						{/if}
						{#if releaseLabel}
							<div>
								<dt class="mb-1 text-xs text-muted-foreground">Estreia</dt>
								<dd>{releaseLabel}</dd>
							</div>
						{/if}
						{#if movie.overview}
							<div>
								<dt class="mb-1 text-xs text-muted-foreground">Sinopse</dt>
								<dd class="line-clamp-4 leading-relaxed text-white/75">{movie.overview}</dd>
							</div>
						{/if}
						<div>
							<a
								href={resolve('/movie/[id]', { id: String(movie.id) })}
								onclick={(event) => openMovie(event, movie.id)}
								class="inline-flex items-center gap-1.5 text-sm font-medium text-neon-cyan underline-offset-4 hover:underline"
							>
								Ver detalhes <ArrowUpRightIcon class="size-4" aria-hidden="true" />
							</a>
						</div>
					</dl>
				</div>
			</div>
		</article>
	</div>
</section>
