<script lang="ts">
	import HeartIcon from '@lucide/svelte/icons/heart';
	import MessageSquareTextIcon from '@lucide/svelte/icons/message-square-text';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import MovieMetaLine from '$lib/components/MovieMetaLine.svelte';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import { formatLongDate, movieMeta, yearOf } from '$lib/format';
	import type { DiaryLogEntry } from '$lib/diary/types';
	import { posterSrcset, posterUrl } from '$lib/tmdb/images';

	/**
	 * Card de uma sessão do diário: mesmo visual do card da biblioteca, mas o selo é o dia
	 * assistido e o clique abre o painel do registro (não o filme).
	 */
	let {
		entry,
		selected = false,
		onselect
	}: { entry: DiaryLogEntry; selected?: boolean; onselect: () => void } = $props();

	const meta = $derived(movieMeta(entry.movie));
	const day = $derived(String(entry.watchedAt.getUTCDate()).padStart(2, '0'));
	const badge = 'grid h-7 min-w-7 place-items-center rounded-full bg-background/80 px-2';
</script>

<article class="group relative">
	<div
		class={[
			'relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 transition duration-300',
			selected
				? 'ring-2 ring-neon-pink'
				: 'ring-white/10 group-hover:ring-2 group-hover:ring-neon-pink'
		]}
	>
		{#if entry.movie.posterPath}
			<img
				src={posterUrl(entry.movie.posterPath, 'w342')}
				srcset={posterSrcset(entry.movie.posterPath)}
				sizes="(min-width: 1280px) 16vw, (min-width: 768px) 22vw, 45vw"
				alt="Pôster de {entry.movie.title}"
				loading="lazy"
				decoding="async"
				class="size-full object-cover"
			/>
		{/if}

		{#if entry.rating}
			<div
				class="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/90 to-transparent px-3 pt-8 pb-2.5 text-sm"
			>
				<RatingBadge rating={entry.rating} />
			</div>
		{/if}

		<!-- Selos: dia à esquerda; revisto/anotação/favorito à direita -->
		<div class="absolute inset-x-2 top-2 flex items-start justify-between">
			<span class="{badge} text-xs font-semibold tabular-nums" aria-hidden="true">{day}</span>
			<span class="flex gap-1">
				{#if entry.note}
					<span class={badge} title="Com anotação">
						<MessageSquareTextIcon class="size-3.5 text-neon-cyan" aria-hidden="true" />
					</span>
				{/if}
				{#if entry.isRewatch}
					<span class={badge} title="Revisto">
						<RotateCcwIcon class="size-3.5 text-white/80" aria-hidden="true" />
					</span>
				{/if}
				{#if entry.library?.isFavorite}
					<span class={badge} title="Favorito">
						<HeartIcon class="size-3.5 fill-current text-neon-pink" aria-hidden="true" />
					</span>
				{/if}
			</span>
		</div>
	</div>

	<div class="mt-2.5 flex items-baseline justify-between gap-2">
		<p class="truncate text-sm font-medium">{entry.movie.title}</p>
		<p class="shrink-0 text-xs text-muted-foreground tabular-nums">
			{yearOf(entry.movie.releaseDate) ?? '—'}
		</p>
	</div>
	<MovieMetaLine
		{meta}
		class="mt-0.5 text-xs text-muted-foreground"
		directorClass="text-white/75"
	/>

	<!-- O card inteiro é clicável; abre o painel do registro -->
	<button
		type="button"
		onclick={onselect}
		aria-haspopup="dialog"
		aria-pressed={selected}
		aria-label="Ver registro: {entry.movie.title}, {formatLongDate(entry.watchedAt)}"
		class="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-pink"
	></button>
</article>
