<script lang="ts">
	import DevTools from '$lib/components/dashboard/DevTools.svelte';
	import EmptyLibrary from '$lib/components/dashboard/EmptyLibrary.svelte';
	import GenreBars from '$lib/components/dashboard/GenreBars.svelte';
	import LibraryPosterCard from '$lib/components/dashboard/LibraryPosterCard.svelte';
	import LibraryToolbar from '$lib/components/dashboard/LibraryToolbar.svelte';
	import MonthlyChart from '$lib/components/dashboard/MonthlyChart.svelte';
	import RatingHistogram from '$lib/components/dashboard/RatingHistogram.svelte';
	import RecentDiary from '$lib/components/dashboard/RecentDiary.svelte';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';
	import SuggestionCarousel from '$lib/components/dashboard/SuggestionCarousel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived(data.stats);
	const today = new Intl.DateTimeFormat('pt-BR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(new Date());
	const year = new Date().getFullYear();
	const hours = $derived(Math.floor(stats.minutesWatched / 60));
	const counts = $derived({
		all: stats.watched + stats.watchlist,
		watched: stats.watched,
		watchlist: stats.watchlist,
		favorites: stats.favorites
	});
</script>

<svelte:head>
	<title>Biblioteca — Super Eight</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<!-- Saudação -->
	<header class="flex flex-wrap items-end justify-between gap-4 pb-2">
		<div>
			<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase first-letter:uppercase">
				{today}
			</p>
			<h1
				class="mt-3 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-bold tracking-[-0.04em]"
			>
				Olá, {data.profile.name?.split(' ')[0] ?? `@${data.profile.username}`}
				<span class="font-serif font-normal tracking-normal text-white/40 italic">.</span>
			</h1>
		</div>
		{#if data.dev}
			<DevTools hasData={!data.isEmpty} />
		{/if}
	</header>

	<!-- Sugestões + diário recente (mesma altura no bento) -->
	{#if data.suggestions.length || data.recentDiary.length}
		<div class="grid gap-6 xl:grid-cols-3">
			{#if data.suggestions.length}
				<div class={data.recentDiary.length ? 'xl:col-span-2' : 'xl:col-span-3'}>
					<SuggestionCarousel movies={data.suggestions} />
				</div>
			{/if}
			{#if data.recentDiary.length}
				<RecentDiary sessions={data.recentDiary} />
			{/if}
		</div>
	{/if}

	{#if data.isEmpty}
		<EmptyLibrary />
	{:else}
		<!-- Métricas -->
		<section aria-label="Métricas" class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
			<StatTile
				label="Assistidos"
				value={String(stats.watched)}
				accent="bg-neon-pink"
				caption={`${stats.favorites} ${stats.favorites === 1 ? 'favorito' : 'favoritos'}`}
			/>
			<StatTile
				label="Tempo de cinema"
				value={String(hours)}
				unit="h"
				accent="bg-neon-cyan"
				caption={`${stats.sessionsThisYear} ${stats.sessionsThisYear === 1 ? 'sessão' : 'sessões'} em ${year}`}
			/>
			<StatTile
				label="Nota média"
				value={stats.averageRating?.toFixed(1) ?? '—'}
				unit={stats.averageRating ? '/10' : undefined}
				accent="bg-neon-purple"
			>
				<RatingHistogram histogram={stats.ratingHistogram} />
			</StatTile>
			<StatTile
				label="Quero ver"
				value={String(stats.watchlist)}
				accent="bg-neon-peach"
				caption="filmes na sua lista"
			/>
		</section>

		<!-- Gráficos -->
		<div class="grid gap-6 xl:grid-cols-3">
			<div class="xl:col-span-2"><MonthlyChart months={stats.monthly} /></div>
			<GenreBars genres={stats.topGenres} />
		</div>

		<!-- Biblioteca (lista principal) -->
		<section id="biblioteca" aria-labelledby="biblioteca-title" class="scroll-mt-24 pt-10">
			<div class="mb-6">
				<p class="mb-3 font-mono text-xs tracking-widest text-muted-foreground">01.</p>
				<h2
					id="biblioteca-title"
					class="font-display text-4xl leading-none font-bold tracking-[-0.03em] uppercase md:text-6xl"
				>
					Minha biblioteca
				</h2>
			</div>

			<LibraryToolbar filters={data.filters} genres={data.genres} {counts} />

			{#if data.library.length}
				<ul
					class="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6"
				>
					{#each data.library as item (item.movie.id)}
						<li><LibraryPosterCard {item} /></li>
					{/each}
				</ul>
			{:else}
				<p
					class="mt-10 rounded-3xl border border-white/10 px-6 py-16 text-center text-muted-foreground"
				>
					Nenhum filme com esses filtros.
				</p>
			{/if}
		</section>
	{/if}
</main>
