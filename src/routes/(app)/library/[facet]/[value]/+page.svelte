<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import UserIcon from '@lucide/svelte/icons/user';
	import LibraryToolbar from '$lib/components/dashboard/LibraryToolbar.svelte';
	import MoviePosterCard from '$lib/components/MoviePosterCard.svelte';
	import { countryName, formatDayMonth, languageName } from '$lib/format';
	import { plural } from '$lib/i18n';
	import { PERSON_ROLES, roleLabel, type PersonRole } from '$lib/library/facets';
	import { posterFromCard, stateFromItem } from '$lib/library/poster';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';

	/**
	 * Biblioteca filtrada (earlySetup.md §6.10): os filmes do usuário de uma pessoa, país,
	 * idioma, gênero ou estúdio (grade igual ao dashboard), ou lançados num dia (por ano, como
	 * o diário).
	 */
	let { data }: { data: PageData } = $props();

	const kicker = $derived(
		{
			person: m.facet_person,
			country: m.fact_country,
			language: m.fact_original_language,
			genre: m.fact_genre,
			studio: m.fact_studio,
			release: m.facet_release
		}[data.facet]()
	);

	const title = $derived.by(() => {
		const header = data.page?.header;
		if (data.facet === 'release') return formatDayMonth(data.value);
		if (data.facet === 'country') return countryName(data.value);
		if (data.facet === 'language') return languageName(data.value);
		return header && 'name' in header ? header.name : data.value;
	});

	const total = $derived(
		data.years
			? data.years.reduce((sum, year) => sum + year.items.length, 0)
			: (data.page?.total ?? 0)
	);

	const image = $derived(
		data.page?.header && 'imagePath' in data.page.header ? data.page.header.imagePath : null
	);

	const roleHref = (role: PersonRole) =>
		role === 'all' ? page.url.pathname : `${page.url.pathname}?role=${role}`;
	const grid =
		'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6';
</script>

<svelte:head>
	<title>{title} — Super Eight</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="flex flex-wrap items-center gap-6 pb-2">
		{#if data.facet === 'person'}
			{#if image}
				<img
					src="https://image.tmdb.org/t/p/w185{image}"
					alt=""
					class="size-24 shrink-0 rounded-full object-cover ring-1 ring-white/15 md:size-28"
				/>
			{:else}
				<span
					class="grid size-24 shrink-0 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 md:size-28"
					><UserIcon class="size-10 text-white/40" aria-hidden="true" /></span
				>
			{/if}
		{:else if data.facet === 'studio'}
			<!-- Logos de estúdio costumam ser escuras: fundo claro -->
			<span
				class="grid h-20 w-36 shrink-0 place-items-center rounded-2xl bg-white/90 p-3 ring-1 ring-white/15"
			>
				{#if image}
					<img
						src="https://image.tmdb.org/t/p/w300{image}"
						alt=""
						class="max-h-full max-w-full object-contain"
					/>
				{:else}
					<Building2Icon class="size-8 text-background/50" aria-hidden="true" />
				{/if}
			</span>
		{/if}
		<div class="min-w-0">
			<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">{kicker}</p>
			<h1
				class="mt-3 font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-none font-bold tracking-[-0.04em] text-balance first-letter:uppercase"
			>
				{title}<span class="font-serif font-normal tracking-normal text-white/40 italic">.</span>
			</h1>
			<p class="mt-3 text-sm text-muted-foreground">
				{plural(total, m.facet_count_one, m.facet_count_other)}
			</p>
		</div>
	</header>

	{#if data.years}
		<!-- Lançamentos do dia, por ano (como o diário) -->
		{#if !data.years.length}
			<p class="rounded-3xl border border-white/10 px-6 py-16 text-center text-muted-foreground">
				{m.facet_empty()}
			</p>
		{/if}
		{#each data.years as group (group.year)}
			<section aria-labelledby="ano-{group.year}" class="pt-6">
				<div class="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
					<h2
						id="ano-{group.year}"
						class="font-display text-6xl leading-none font-bold tracking-[-0.04em] tabular-nums md:text-8xl"
					>
						{group.year}
					</h2>
					<p class="pb-2 text-sm text-muted-foreground">
						{plural(group.items.length, m.movies_count_one, m.movies_count_other)}
					</p>
				</div>
				<ul class="mt-6 {grid}">
					{#each group.items as item (item.movie.id)}
						<li>
							<MoviePosterCard movie={posterFromCard(item.movie)} library={stateFromItem(item)} />
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{:else if data.page && data.filters}
		{#if data.page.roles}
			{@const roles = data.page.roles}
			<!-- Funções da pessoa (só as que têm filmes) -->
			<nav aria-label={m.facet_roles_label()} class="-mx-1 flex gap-1 overflow-x-auto px-1">
				{#each PERSON_ROLES.filter((role) => role === 'all' || roles[role]) as role (role)}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- caminho atual (já resolvido) + query -->
					<a
						href={roleHref(role)}
						data-sveltekit-noscroll
						aria-current={data.role === role ? 'page' : undefined}
						class={[
							'shrink-0 rounded-full px-4 py-1.5 text-xs transition',
							data.role === role ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
						]}
					>
						{roleLabel(role)}
						<span class="ml-1 tabular-nums opacity-60">{roles[role]}</span>
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/each}
			</nav>
		{/if}

		<LibraryToolbar
			filters={data.filters}
			options={null}
			counts={data.page.counts}
			base={page.url.pathname}
			anchor=""
			keep={data.role === 'all' ? {} : { role: data.role }}
		/>

		{#if data.page.library.length}
			<ul class="mt-2 {grid}">
				{#each data.page.library as item (item.movie.id)}
					<li>
						<MoviePosterCard movie={posterFromCard(item.movie)} library={stateFromItem(item)} />
					</li>
				{/each}
			</ul>
		{:else}
			<p class="rounded-3xl border border-white/10 px-6 py-16 text-center text-muted-foreground">
				{data.page.total ? m.no_movies_with_filters() : m.facet_empty()}
			</p>
		{/if}
		<a href={resolve('/dashboard')} class="self-start text-sm text-white/55 hover:text-white"
			>{m.facet_back_library()}</a
		>
	{/if}
</main>
