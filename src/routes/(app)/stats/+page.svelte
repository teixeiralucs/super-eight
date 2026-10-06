<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import MoviePosterCard from '$lib/components/MoviePosterCard.svelte';
	import RatingHistogram from '$lib/components/dashboard/RatingHistogram.svelte';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';
	import BarChart from '$lib/components/stats/BarChart.svelte';
	import RankList, { type RankRow } from '$lib/components/stats/RankList.svelte';
	import {
		countryName,
		formatDuration,
		formatLongDate,
		formatMonthShort,
		formatWeekdayShort,
		languageName
	} from '$lib/format';
	import { intlLocale, plural } from '$lib/i18n';
	import { facetParams, type Facet, type PersonRole } from '$lib/library/facets';
	import type { RankItem } from '$lib/library/insights';
	import { posterFromCard, stateFromItem } from '$lib/library/poster';
	import { openMovie } from '$lib/movie/open.svelte';
	import { m } from '$lib/paraglide/messages';
	import { posterUrl } from '$lib/tmdb/images';
	import type { PageData } from './$types';

	/**
	 * Estatísticas (earlySetup.md §6.11): o seu ano em filmes (ou desde sempre), a partir do
	 * diário. Cada pessoa, país, idioma, gênero e estúdio leva aos filmes na biblioteca.
	 */
	let { data }: { data: PageData } = $props();

	const stats = $derived(data.insights);
	const isYear = $derived(data.period !== 'all');
	const hours = $derived(Math.round(stats.minutes / 60));

	const facetHref = (facet: Facet, value: string | number, role?: PersonRole) => {
		const path = resolve('/(app)/library/[facet]/[value]', facetParams(facet, value));
		return role ? `${path}?role=${role}` : path;
	};
	const periodHref = (period: number | 'all') => `${resolve('/stats')}?year=${period}`;

	const people = (
		items: (RankItem<number> & { name: string; imagePath: string | null })[],
		role: PersonRole
	) =>
		items.map((item): RankRow => ({
			...item,
			label: item.name,
			href: facetHref('person', item.key, role)
		}));

	const timeline = $derived(
		stats.timeline.map((bucket) => ({
			key: bucket.key,
			label: isYear ? formatMonthShort(Number(bucket.key.slice(5, 7)) - 1) : bucket.key,
			value: bucket.sessions
		}))
	);
	const weekdays = $derived(
		// Segunda primeiro: o fim de semana fica junto no fim.
		[1, 2, 3, 4, 5, 6, 0].map((day) => ({
			key: String(day),
			label: formatWeekdayShort(day),
			value: stats.weekdays[day]
		}))
	);
	const decades = $derived(
		stats.ranks.decade.map((item) => ({
			key: String(item.key),
			label: String(item.key),
			value: item.count
		}))
	);

	const card = (id: number | null | undefined) => (id != null ? data.cards[id] : undefined);
	const records = $derived(
		[
			stats.highlights.first && {
				label: isYear ? m.stats_record_first_year() : m.stats_record_first_all(),
				item: card(stats.highlights.first.movieId),
				detail: formatLongDate(stats.highlights.first.date)
			},
			stats.highlights.last && {
				label: m.stats_record_last(),
				item: card(stats.highlights.last.movieId),
				detail: formatLongDate(stats.highlights.last.date)
			},
			stats.highlights.mostWatched && {
				label: m.stats_record_most_watched(),
				item: card(stats.highlights.mostWatched.movieId),
				detail: plural(
					stats.highlights.mostWatched.sessions,
					m.sessions_count_one,
					m.sessions_count_other
				)
			},
			stats.highlights.longest && {
				label: m.stats_record_longest(),
				item: card(stats.highlights.longest),
				detail: formatDuration(card(stats.highlights.longest)?.movie.runtime ?? 0)
			},
			stats.highlights.oldest && {
				label: m.stats_record_oldest(),
				item: card(stats.highlights.oldest),
				detail: String(card(stats.highlights.oldest)?.movie.releaseDate?.getUTCFullYear() ?? '')
			}
		].filter((record) => !!record && !!record.item) as {
			label: string;
			item: NonNullable<ReturnType<typeof card>>;
			detail: string;
		}[]
	);
	const topRated = $derived(stats.highlights.topRated.flatMap((id) => card(id) ?? []));
	const title = $derived(isYear ? String(data.period) : m.stats_all_time());
</script>

<svelte:head>
	<title>{m.stats_page_title({ period: title })}</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-6 overflow-x-clip px-5 pt-6 pb-16 md:px-10">
	<header class="flex flex-col gap-5 pb-2">
		<div>
			<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">
				{isYear ? m.stats_kicker_year() : m.stats_kicker_all()}
			</p>
			<h1
				class="mt-3 font-display text-[clamp(2.5rem,7vw,6rem)] leading-none font-bold tracking-[-0.04em] tabular-nums first-letter:uppercase"
			>
				{title}<span class="font-serif font-normal tracking-normal text-white/40 italic">.</span>
			</h1>
		</div>
		{#if data.years.length}
			<nav aria-label={m.stats_period_label()} class="-mx-1 flex gap-1 overflow-x-auto px-1">
				{#each [...data.years, 'all' as const] as period (period)}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- caminho resolvido + query -->
					<a
						href={periodHref(period)}
						data-sveltekit-noscroll
						aria-current={data.period === period ? 'page' : undefined}
						class={[
							'shrink-0 rounded-full px-4 py-1.5 text-sm tabular-nums transition',
							data.period === period
								? 'bg-white text-background'
								: 'text-white/60 hover:bg-white/10 hover:text-white'
						]}
					>
						{period === 'all' ? m.stats_all_time() : period}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/each}
			</nav>
		{/if}
	</header>

	{#if !data.years.length}
		<div
			class="flex flex-col items-center gap-4 rounded-3xl border border-white/10 px-6 py-20 text-center"
		>
			<p class="max-w-md text-muted-foreground">{m.stats_empty()}</p>
			<a
				href={resolve('/search')}
				class="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-background"
				>{m.stats_empty_cta()} <ArrowRightIcon class="size-4" aria-hidden="true" /></a
			>
		</div>
	{:else}
		<!-- Números -->
		<section aria-label={m.metrics()} class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
			<StatTile
				label={m.stats_films()}
				value={String(stats.films)}
				accent="bg-neon-pink"
				caption={plural(stats.newFilms, m.stats_new_films_one, m.stats_new_films_other)}
			/>
			<StatTile
				label={m.stat_cinema_time()}
				value={String(hours)}
				unit="h"
				accent="bg-neon-cyan"
				caption={m.stats_days({
					days: new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 }).format(
						stats.minutes / 1440
					)
				})}
			/>
			<StatTile
				label={m.stats_sessions()}
				value={String(stats.sessions)}
				accent="bg-neon-peach"
				caption={plural(stats.rewatches, m.stats_rewatches_one, m.stats_rewatches_other)}
			/>
			<StatTile
				label={m.stat_average_rating()}
				value={stats.averageRating?.toFixed(1) ?? '—'}
				unit={stats.averageRating ? '/10' : undefined}
				accent="bg-neon-purple"
			>
				<RatingHistogram histogram={stats.ratingHistogram} />
			</StatTile>
		</section>

		<!-- Ritmo -->
		<div class="grid gap-6 xl:grid-cols-3">
			<div class="xl:col-span-2">
				<BarChart
					id="stats-timeline"
					title={isYear ? m.stats_by_month() : m.stats_by_year()}
					bars={timeline}
					columnLabel={isYear ? m.col_month() : m.stats_col_year()}
					valueLabel={(value) => plural(value, m.sessions_count_one, m.sessions_count_other)}
				/>
			</div>
			<BarChart
				id="stats-weekdays"
				title={m.stats_by_weekday()}
				bars={weekdays}
				color="bg-neon-cyan"
				columnLabel={m.stats_col_weekday()}
				valueLabel={(value) => plural(value, m.sessions_count_one, m.sessions_count_other)}
			/>
		</div>

		<!-- Destaques -->
		{#if topRated.length}
			<section aria-labelledby="stats-top-rated" class="pt-6">
				<h2
					id="stats-top-rated"
					class="mb-6 font-display text-3xl leading-none font-bold tracking-[-0.03em] uppercase md:text-5xl"
				>
					{m.stats_top_rated()}
				</h2>
				<ul
					class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6"
				>
					{#each topRated as item (item.movie.id)}
						<li>
							<MoviePosterCard movie={posterFromCard(item.movie)} library={stateFromItem(item)} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if records.length}
			<section aria-labelledby="stats-records">
				<h2 id="stats-records" class="sr-only">{m.stats_records()}</h2>
				<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
					{#each records as record (record.label)}
						<li>
							<a
								href={resolve('/movie/[id]', { id: String(record.item.movie.id) })}
								onclick={(event) => openMovie(event, record.item.movie.id)}
								class="flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
							>
								<img
									src={posterUrl(record.item.movie.posterPath, 'w185')}
									alt=""
									loading="lazy"
									class="h-20 w-14 shrink-0 rounded-md object-cover ring-1 ring-white/10"
								/>
								<div class="min-w-0">
									<p class="text-[11px] tracking-wider text-muted-foreground uppercase">
										{record.label}
									</p>
									<p class="mt-1 line-clamp-2 text-sm font-medium">
										{record.item.movie.originalTitle}
									</p>
									<p class="mt-0.5 text-xs text-white/55 tabular-nums">{record.detail}</p>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Pessoas -->
		<section aria-labelledby="stats-people" class="pt-6">
			<h2
				id="stats-people"
				class="mb-6 font-display text-3xl leading-none font-bold tracking-[-0.03em] uppercase md:text-5xl"
			>
				{m.stats_people()}
			</h2>
			<div class="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
				<RankList
					id="stats-directors"
					title={m.crew_directing()}
					rows={people(data.people.director, 'director')}
					image="person"
					color="bg-neon-pink"
				/>
				<RankList
					id="stats-cast"
					title={m.crew_cast()}
					rows={people(data.people.cast, 'cast')}
					image="person"
					color="bg-neon-cyan"
				/>
				<RankList
					id="stats-writers"
					title={m.crew_writing()}
					rows={people(data.people.writer, 'writer')}
					image="person"
					color="bg-neon-purple"
				/>
				<RankList
					id="stats-composers"
					title={m.fact_music()}
					rows={people(data.people.composer, 'composer')}
					image="person"
					color="bg-neon-peach"
				/>
			</div>
		</section>

		<!-- Origem e estilo -->
		<section aria-labelledby="stats-origins" class="pt-6">
			<h2
				id="stats-origins"
				class="mb-6 font-display text-3xl leading-none font-bold tracking-[-0.03em] uppercase md:text-5xl"
			>
				{m.stats_origins()}
			</h2>
			<div class="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
				<RankList
					id="stats-genres"
					title={m.fact_genre()}
					rows={stats.ranks.genre.map((item) => ({
						...item,
						label: item.name,
						href: facetHref('genre', item.key)
					}))}
				/>
				<RankList
					id="stats-countries"
					title={m.fact_country()}
					color="bg-neon-pink"
					rows={stats.ranks.country.map((item) => ({
						...item,
						label: countryName(item.key),
						href: facetHref('country', item.key)
					}))}
				/>
				<RankList
					id="stats-languages"
					title={m.fact_original_language()}
					color="bg-neon-purple"
					rows={stats.ranks.language.map((item) => ({
						...item,
						label: languageName(item.key),
						href: facetHref('language', item.key)
					}))}
				/>
				<RankList
					id="stats-studios"
					title={m.fact_studio()}
					image="logo"
					color="bg-neon-peach"
					rows={data.studios.map((item) => ({
						...item,
						label: item.name,
						href: facetHref('studio', item.key)
					}))}
				/>
			</div>
			{#if decades.length}
				<div class="mt-6">
					<BarChart
						id="stats-decades"
						title={m.stats_by_decade()}
						subtitle={m.stats_by_decade_subtitle()}
						bars={decades}
						color="bg-neon-purple"
						columnLabel={m.stats_col_decade()}
						valueLabel={(value) => plural(value, m.movies_count_one, m.movies_count_other)}
					/>
				</div>
			{/if}
		</section>
	{/if}
</main>
