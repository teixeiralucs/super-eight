<script lang="ts">
	import { resolve } from '$app/paths';
	import MovieMetaLine from '$lib/components/MovieMetaLine.svelte';
	import { movieMeta, yearOf } from '$lib/format';
	import type { LibraryItem } from '$lib/library/types';
	import { posterSrcset, posterUrl } from '$lib/tmdb/images';
	import { VIEW_ICONS } from './library-icons';
	import RatingBadge from './RatingBadge.svelte';

	let { item }: { item: LibraryItem } = $props();

	// Um único selo de estado (as abas funcionam como legenda). Favorito implica assistido
	// (regra de negócio), então o coração substitui o olho.
	const status = $derived(
		item.isFavorite
			? { ...VIEW_ICONS.favorites, label: 'Favorito', fill: true }
			: item.status === 'WATCHED'
				? { ...VIEW_ICONS.watched, label: 'Assistido', fill: false }
				: { ...VIEW_ICONS.watchlist, label: 'Quero ver', fill: false }
	);
	const meta = $derived(movieMeta(item.movie));
</script>

<a href={resolve('/movie/[id]', { id: String(item.movie.id) })} class="group block">
	<div
		class="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-white/10 transition duration-300 group-hover:ring-2 group-hover:ring-neon-pink"
	>
		{#if item.movie.posterPath}
			<img
				src={posterUrl(item.movie.posterPath, 'w342')}
				srcset={posterSrcset(item.movie.posterPath)}
				sizes="(min-width: 1280px) 16vw, (min-width: 768px) 22vw, 45vw"
				alt="Pôster de {item.movie.title}"
				loading="lazy"
				class="size-full object-cover"
			/>
		{/if}

		<div class="absolute inset-x-2 top-2 flex items-start justify-between">
			<!-- Estado (esquerda) -->
			<span
				class="grid size-7 place-items-center rounded-full bg-background/70 backdrop-blur-md"
				title={status.label}
			>
				<status.icon
					class={['size-3.5', status.color, status.fill && 'fill-current']}
					aria-hidden="true"
				/>
				<span class="sr-only">{status.label}</span>
			</span>

			<!-- Contador de sessões (direita), só a partir da 2ª vez -->
			{#if item.watchCount > 1}
				<span
					class="grid h-7 min-w-7 place-items-center rounded-full bg-background/70 px-2 text-xs font-medium tabular-nums backdrop-blur-md"
					title="Assistido {item.watchCount} vezes"
				>
					<span aria-hidden="true">{item.watchCount}×</span>
					<span class="sr-only">Assistido {item.watchCount} vezes</span>
				</span>
			{/if}
		</div>

		{#if item.rating}
			<div
				class="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/90 to-transparent px-3 pt-8 pb-2.5 text-sm"
			>
				<RatingBadge rating={item.rating} />
			</div>
		{/if}
	</div>

	<div class="mt-2.5 flex items-baseline justify-between gap-2">
		<p class="truncate text-sm font-medium">{item.movie.title}</p>
		<p class="shrink-0 text-xs text-muted-foreground tabular-nums">
			{yearOf(item.movie.releaseDate) ?? '—'}
		</p>
	</div>
	<MovieMetaLine
		{meta}
		class="mt-0.5 text-xs text-muted-foreground"
		directorClass="text-white/75"
	/>
</a>
