<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import StarIcon from '@lucide/svelte/icons/star';
	import { posterSrcset, posterUrl } from '$lib/tmdb/images';
	import type { TMDbMovie } from '$lib/tmdb/types';

	let {
		id,
		number,
		title,
		subtitle,
		movies,
		ranked = false
	}: {
		id: string;
		number: string;
		title: string;
		subtitle: string;
		movies: TMDbMovie[];
		ranked?: boolean;
	} = $props();

	let track: HTMLUListElement | undefined = $state();

	function scrollByPage(direction: 1 | -1) {
		track?.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
	}
</script>

<section {id} class="scroll-mt-24 py-16 md:py-24" aria-labelledby="{id}-title">
	<div class="mx-auto flex max-w-[1600px] items-end justify-between gap-6 px-5 md:px-10">
		<div>
			<p class="mb-3 font-mono text-xs tracking-widest text-muted-foreground">{number}</p>
			<h2
				id="{id}-title"
				class="font-display text-4xl leading-none font-bold tracking-[-0.03em] uppercase md:text-6xl"
			>
				{title}
				<span
					class="font-serif text-3xl font-normal tracking-normal text-white/40 normal-case italic md:text-5xl"
					>{subtitle}</span
				>
			</h2>
		</div>
		<div class="hidden gap-2 md:flex">
			<button
				type="button"
				onclick={() => scrollByPage(-1)}
				class="grid size-11 place-items-center rounded-full border border-white/15 transition hover:border-neon-cyan hover:text-neon-cyan"
				aria-label="Anterior"
			>
				<ArrowLeftIcon class="size-4" />
			</button>
			<button
				type="button"
				onclick={() => scrollByPage(1)}
				class="grid size-11 place-items-center rounded-full border border-white/15 transition hover:border-neon-cyan hover:text-neon-cyan"
				aria-label="Próximo"
			>
				<ArrowRightIcon class="size-4" />
			</button>
		</div>
	</div>

	<ul
		bind:this={track}
		class="relative mt-10 flex snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] gap-4 overflow-x-auto px-5 pb-4 md:scroll-px-10 md:gap-6 md:px-10 [&::-webkit-scrollbar]:hidden"
	>
		{#each movies as movie, i (movie.id)}
			<li class="w-[58vw] shrink-0 snap-start sm:w-[220px] md:w-[260px]">
				<a href={resolve('/movie/[id]', { id: String(movie.id) })} class="group block">
					<div
						class="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted ring-1 ring-white/10 transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_18px_50px_-12px_var(--neon-pink)] group-hover:ring-[var(--neon-pink)]/70"
					>
						<img
							src={posterUrl(movie.posterPath, 'w342')}
							srcset={posterSrcset(movie.posterPath)}
							sizes="(min-width: 768px) 260px, (min-width: 640px) 220px, 58vw"
							alt="Pôster de {movie.title}"
							loading="lazy"
							class="size-full object-cover transition duration-700 group-hover:scale-[1.03]"
						/>
						{#if ranked}
							<span
								class="absolute bottom-2 left-3 font-display text-6xl leading-none font-bold text-white/90 [text-shadow:0_4px_24px_rgb(0_0_0/0.8)]"
								>{i + 1}</span
							>
						{/if}
					</div>
					<div class="mt-3 flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3 class="truncate text-sm font-medium">{movie.title}</h3>
							<p class="text-xs text-muted-foreground">{movie.year ?? '—'}</p>
						</div>
						{#if movie.voteAverage}
							<span class="flex shrink-0 items-center gap-1 text-xs text-neon-peach tabular-nums">
								<StarIcon class="size-3 fill-current" aria-hidden="true" />
								<span class="sr-only">Nota</span>{movie.voteAverage.toFixed(1)}
							</span>
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ul>
</section>
