<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import InfoIcon from '@lucide/svelte/icons/info';
	import MoviePosterCard from '$lib/components/MoviePosterCard.svelte';
	import { yearOf } from '$lib/format';
	import { intlLocale } from '$lib/i18n';
	import { posterFromCard } from '$lib/library/poster';
	import {
		COLLECTION_VIEWS,
		SAGA_SORTS,
		type CollectionGhost,
		type CollectionItem,
		type CollectionView,
		type SagaSort
	} from '$lib/lists/types';
	import { m } from '$lib/paraglide/messages';
	import { backdropSrcset, backdropUrl } from '$lib/tmdb/images';
	import type { PageData } from './$types';

	/**
	 * Coleção do TMDb (earlySetup.md §6.8): os filmes da saga que estão na biblioteca e, apagados
	 * no meio deles pela ordem de lançamento, os que faltam ("fantasmas", com o "+" para
	 * adicionar). Não se edita: dá para filtrar e mudar a ordenação (sem salvar).
	 */
	let { data }: { data: PageData } = $props();

	const collection = $derived(data.collection);
	let view = $state<CollectionView>('all');
	let sort = $state<SagaSort>('saga');

	const viewLabel = (value: CollectionView) =>
		({
			all: m.collection_view_all,
			watched: m.collection_view_watched,
			watchlist: m.collection_view_watchlist,
			favorites: m.collection_view_favorites,
			missing: m.collection_view_missing
		})[value]();
	const sortLabel = (value: SagaSort) =>
		({
			saga: m.collection_sort_saga,
			title: m.collection_sort_title,
			rating: m.collection_sort_rating,
			watched: m.collection_sort_watched
		})[value]();

	const matches = (item: CollectionItem, value: CollectionView) =>
		value === 'all' ||
		(value === 'watched' && item.library.status === 'WATCHED') ||
		(value === 'watchlist' && item.library.status === 'WANT_TO_WATCH') ||
		(value === 'favorites' && item.library.isFavorite);
	const counts = $derived({
		...(Object.fromEntries(
			COLLECTION_VIEWS.map((value) => [
				value,
				collection.items.filter((item) => matches(item, value)).length
			])
		) as Record<CollectionView, number>),
		all: collection.items.length + collection.missing.length,
		missing: collection.missing.length
	});

	/** Datas e notas ausentes sempre no fim; empate desfaz pela ordem da saga. */
	const time = (date: Date | null) => date?.getTime() ?? null;
	const bySaga = (a: CollectionItem, b: CollectionItem) =>
		(time(a.movie.releaseDate) ?? Infinity) - (time(b.movie.releaseDate) ?? Infinity);
	const desc = (a: number | null, b: number | null) =>
		a === b ? 0 : a === null ? 1 : b === null ? -1 : b - a;

	type Entry =
		| { ghost: false; id: number; release: Date | null; item: CollectionItem }
		| { ghost: true; id: number; release: Date | null; movie: CollectionGhost };
	const byRelease = (a: Entry, b: Entry) =>
		(time(a.release) ?? Infinity) - (time(b.release) ?? Infinity);

	/**
	 * Fantasmas só em "Todos" e "Faltam". Na ordem da saga eles se intercalam pelo lançamento;
	 * nas outras ordenações (título, nota, assistido) vão para o fim, ainda por lançamento.
	 */
	const shown = $derived.by((): Entry[] => {
		const items = collection.items.filter((item) => matches(item, view));
		const compare: Record<SagaSort, (a: CollectionItem, b: CollectionItem) => number> = {
			saga: bySaga,
			title: (a, b) => a.movie.originalTitle.localeCompare(b.movie.originalTitle, intlLocale()),
			rating: (a, b) => desc(a.library.rating, b.library.rating) || bySaga(a, b),
			watched: (a, b) => desc(time(a.lastWatched), time(b.lastWatched)) || bySaga(a, b)
		};
		const owned: Entry[] = items
			.sort(compare[sort])
			.map((item) => ({ ghost: false, id: item.movie.id, release: item.movie.releaseDate, item }));
		const ghosts: Entry[] =
			view === 'all' || view === 'missing'
				? collection.missing.map((movie) => ({
						ghost: true,
						id: movie.id,
						release: movie.releaseDate,
						movie
					}))
				: [];
		return sort === 'saga'
			? [...owned, ...ghosts].sort(byRelease)
			: [...owned, ...ghosts.sort(byRelease)];
	});

	/** Fantasma no formato do card de pôster (sem equipe nem duração: só título e ano). */
	const ghostPoster = (movie: CollectionGhost) => ({
		id: movie.id,
		title: movie.title,
		originalTitle: movie.originalTitle,
		posterPath: movie.posterPath,
		year: yearOf(movie.releaseDate),
		directors: [],
		countries: [],
		runtime: null
	});

	const chip = 'shrink-0 rounded-full px-4 py-1.5 text-xs transition';
</script>

<svelte:head>
	<title>{m.collection_page_title({ name: collection.name })}</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-8 px-5 pt-6 pb-16 md:px-10">
	<header
		class="relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 md:min-h-[420px] md:p-10"
	>
		{#if collection.backdropPath}
			<div
				class="absolute inset-0 -z-10 bg-cover bg-center"
				style:background-image="url({backdropUrl(collection.backdropPath, 'w300')})"
			>
				<img
					src={backdropUrl(collection.backdropPath, 'w1280')}
					srcset={backdropSrcset(collection.backdropPath)}
					sizes="(min-width: 1600px) 1520px, 100vw"
					alt=""
					decoding="async"
					class="size-full object-cover"
				/>
			</div>
		{:else}
			<div
				class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--neon-cyan)_18%,transparent),transparent_65%)]"
			></div>
		{/if}
		<div
			class="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/60 to-background/10"
		></div>

		<a
			href="{resolve('/(app)/lists')}?tab=collections"
			class="inline-flex items-center gap-1.5 self-start text-[11px] font-semibold tracking-[0.2em] text-neon-cyan uppercase hover:underline"
		>
			<ArrowLeftIcon class="size-3.5" aria-hidden="true" />
			{m.collection_back()}
		</a>
		<div class="mt-3 flex items-end justify-between gap-6">
			<h1
				class="max-w-5xl font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.9] font-bold tracking-[-0.045em] text-balance"
			>
				{collection.name}
			</h1>
			<span
				class="shrink-0 font-display text-4xl font-light text-white/80 tabular-nums md:text-6xl"
				aria-label={m.collection_progress_label({
					owned: collection.items.length,
					total: collection.total
				})}
				>{m.collection_progress({ owned: collection.items.length, total: collection.total })}</span
			>
		</div>
		<p class="mt-4 flex items-center gap-2 text-sm text-white/60">
			<InfoIcon class="size-4 shrink-0" aria-hidden="true" />
			{m.collection_readonly()}
		</p>
	</header>

	{#if !collection.items.length}
		<section class="rounded-3xl border border-white/10 px-6 py-10 text-center">
			<p class="font-display text-xl font-semibold">{m.collection_empty_title()}</p>
			<p class="mt-2 text-sm text-muted-foreground">{m.collection_empty_text()}</p>
		</section>
	{/if}

	{#if counts.all}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div
				class="flex min-w-0 gap-1 overflow-x-auto"
				role="group"
				aria-label={m.collection_filter_label()}
			>
				{#each COLLECTION_VIEWS as value (value)}
					<button
						type="button"
						aria-pressed={view === value}
						disabled={value !== 'all' && !counts[value]}
						onclick={() => (view = value)}
						class={[
							chip,
							view === value
								? 'bg-white text-background'
								: 'text-white/65 hover:text-white disabled:opacity-35 disabled:hover:text-white/65'
						]}
					>
						{viewLabel(value)}
						<span class="ml-1 tabular-nums opacity-60">{counts[value]}</span>
					</button>
				{/each}
			</div>
			<label class="flex items-center gap-2 text-sm">
				<span class="sr-only">{m.filter_sort_by()}</span>
				<select
					bind:value={sort}
					class="rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-white/80 outline-none focus-visible:border-neon-cyan"
				>
					{#each SAGA_SORTS as value (value)}
						<option {value}>{sortLabel(value)}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if shown.length}
			<ul
				class="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6"
			>
				{#each shown as entry (entry.id)}
					{#if entry.ghost}
						<!-- Fantasma: apagado e sem cor até passar o mouse; o "+" adiciona em Quero ver -->
						<li
							class="opacity-45 grayscale transition duration-300 focus-within:opacity-100 focus-within:grayscale-0 hover:opacity-100 hover:grayscale-0"
						>
							<span class="sr-only">
								{m.collection_missing_label({ title: entry.movie.originalTitle })}
							</span>
							<MoviePosterCard
								movie={ghostPoster(entry.movie)}
								library={null}
								add={{ action: '?/add', signedIn: true, loginHref: '' }}
								onadded={() => invalidateAll()}
							/>
						</li>
					{:else}
						<li>
							<MoviePosterCard
								movie={posterFromCard(entry.item.movie)}
								library={entry.item.library}
							/>
						</li>
					{/if}
				{/each}
			</ul>
		{:else}
			<p class="py-10 text-center text-sm text-muted-foreground">{m.collection_empty_filter()}</p>
		{/if}
	{/if}
</main>
