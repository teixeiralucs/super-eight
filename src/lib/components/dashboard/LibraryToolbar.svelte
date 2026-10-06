<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowDownWideNarrowIcon from '@lucide/svelte/icons/arrow-down-wide-narrow';
	import ArrowUpNarrowWideIcon from '@lucide/svelte/icons/arrow-up-narrow-wide';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import XIcon from '@lucide/svelte/icons/x';
	import { countryName, languageName } from '$lib/format';
	import { intlLocale, plural } from '$lib/i18n';
	import { VIEW_ICONS } from './library-icons';
	import {
		directionLabel,
		EXTRA_FILTERS,
		filtersQuery,
		parseLibraryFilters,
		hasActiveFilters,
		LIBRARY_SORTS,
		LIBRARY_VIEWS,
		RATING_FILTERS,
		sortLabel,
		viewLabel,
		type ExtraFilter,
		type LibraryFilterOptions,
		type LibraryFilters,
		type LibraryView,
		type RatingFilter
	} from '$lib/library/filters';

	let {
		filters,
		options,
		counts,
		base = resolve('/dashboard'),
		anchor = '#biblioteca',
		keep = {}
	}: {
		filters: LibraryFilters;
		/** Valores do painel de filtros (nulo = só a busca, ex.: páginas filtradas §6.10). */
		options: LibraryFilterOptions | null;
		/** Filmes em cada aba, já com os demais filtros aplicados. */
		counts: Record<LibraryView, number>;
		/** Página da grade (padrão: o dashboard; também as páginas filtradas, §6.10). */
		base?: string;
		anchor?: string;
		/** Parâmetros da página que os filtros mantêm (ex.: `role` na página de uma pessoa). */
		keep?: Record<string, string>;
	} = $props();

	const keepQuery = $derived(
		Object.entries(keep)
			.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
			.join('&')
	);

	/** Link com os filtros alterados (valores padrão omitidos da URL). */
	const hrefWith = (changes: Partial<LibraryFilters>) => hrefFor({ ...filters, ...changes });

	function hrefFor(next: LibraryFilters) {
		const query = filtersQuery(next);
		const joined = keepQuery ? (query ? `${query}&${keepQuery}` : `?${keepQuery}`) : query;
		return `${base}${joined}${anchor}`;
	}

	/** Com JavaScript, o formulário navega para a URL limpa (sem campos vazios ou padrão). */
	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local, não reativo
		const params = new URLSearchParams();
		for (const [key, value] of new FormData(form)) {
			if (typeof value === 'string') params.set(key, value);
		}
		if (resetDir) params.delete('dir');
		resetDir = false;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- `base` vem de resolve()
		goto(hrefFor(parseLibraryFilters(params)), { noScroll: true, keepFocus: true });
	}

	const submit = (event: Event) => (event.currentTarget as HTMLSelectElement).form?.requestSubmit();

	/** Trocar a ordenação volta a direção ao padrão natural dela. */
	let resetDir = false;
	function submitSort(event: Event) {
		resetDir = true;
		(event.currentTarget as HTMLSelectElement).form?.requestSubmit();
	}

	const nextDir = $derived(filters.dir === 'asc' ? 'desc' : 'asc');

	// ─── Busca enquanto digita ──────────────────────────────────────────
	let searchInput = $state<HTMLInputElement>();
	let query = $state(untrack(() => filters.q ?? ''));
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	// A URL manda; enquanto a pessoa digita, o campo não é sobrescrito pela resposta.
	$effect(() => {
		const fromUrl = filters.q ?? '';
		if (document.activeElement !== searchInput) query = fromUrl;
	});

	/** Digitando: atualiza a grade sem empilhar uma entrada de histórico por tecla. */
	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			const q = query.trim();
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- `base` vem de resolve()
			goto(hrefWith({ q: q || undefined }), {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		}, 300);
	}

	// ─── Painel de filtros ──────────────────────────────────────────────
	let panelOpen = $state(false);
	const activeExtras = $derived(EXTRA_FILTERS.filter((key) => filters[key]));
	const byName = (a: { name: string }, b: { name: string }) =>
		a.name.localeCompare(b.name, intlLocale());
	const countries = $derived(
		(options?.countries ?? []).map((code) => ({ code, name: countryName(code) })).sort(byName)
	);
	const languages = $derived(
		(options?.languages ?? []).map((code) => ({ code, name: languageName(code) })).sort(byName)
	);

	const ratingLabel = (rating: RatingFilter) =>
		rating === 'none'
			? m.filter_rating_none()
			: rating === '10'
				? m.filter_rating_ten()
				: m.filter_rating_min({ rating });

	/** Texto do chip de um filtro ativo. */
	function chipLabel(key: ExtraFilter, value: string) {
		switch (key) {
			case 'genre':
				return options?.genres.find((genre) => String(genre.id) === value)?.name ?? value;
			case 'decade':
				return m.filter_decade_value({ decade: value });
			case 'country':
				return countryName(value);
			case 'lang':
				return languageName(value);
			case 'rating':
				return ratingLabel(value as RatingFilter);
			case 'year':
				return m.filter_year_value({ year: value });
		}
	}

	const selectClass =
		'w-full rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-white/80 outline-none focus-visible:border-neon-cyan';
	const pillClass =
		'flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:text-white';
</script>

<div class="flex flex-col gap-4">
	<nav aria-label={m.filter_library()} class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
		{#each LIBRARY_VIEWS as view (view)}
			{@const { icon: Icon, color } = VIEW_ICONS[view]}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- caminho vem de resolve(); a regra não suporta query string -->
			<a
				href={hrefWith({ view })}
				data-sveltekit-noscroll
				aria-current={filters.view === view ? 'page' : undefined}
				class={[
					'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition',
					filters.view === view
						? 'bg-white text-background'
						: 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white'
				]}
			>
				<Icon
					class={['size-4', filters.view !== view && color, view === 'favorites' && 'fill-current']}
					aria-hidden="true"
				/>
				{viewLabel(view)}
				<span
					class={[
						'text-xs tabular-nums',
						filters.view === view ? 'text-background/60' : 'text-white/40'
					]}>{counts[view]}</span
				>
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/each}
	</nav>

	<form
		method="GET"
		action="{base}{anchor}"
		data-sveltekit-noscroll
		data-sveltekit-keepfocus
		role="search"
		onsubmit={onSubmit}
		class="flex flex-col gap-3"
	>
		{#if filters.view !== 'all'}<input type="hidden" name="view" value={filters.view} />{/if}
		{#if filters.sort !== 'random'}<input type="hidden" name="dir" value={filters.dir} />{/if}
		{#each Object.entries(keep) as [key, value] (key)}
			<input type="hidden" name={key} {value} />
		{/each}

		<div class="flex flex-wrap items-center gap-2">
			<label class="relative w-full sm:w-72">
				<span class="sr-only">{m.filter_search_label()}</span>
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/40"
					aria-hidden="true"
				/>
				<input
					bind:this={searchInput}
					bind:value={query}
					oninput={onSearchInput}
					type="search"
					name="q"
					maxlength="100"
					autocomplete="off"
					placeholder={m.filter_search_placeholder()}
					class="w-full rounded-full border border-white/10 bg-background py-2 pr-4 pl-10 text-sm text-white/90 outline-none placeholder:text-white/35 focus-visible:border-neon-cyan"
				/>
			</label>

			{#if options}
				<button
					type="button"
					onclick={() => (panelOpen = !panelOpen)}
					aria-expanded={panelOpen}
					aria-controls="painel-filtros"
					class={[pillClass, panelOpen && 'border-white/25 text-white']}
				>
					<SlidersHorizontalIcon class="size-4" aria-hidden="true" />
					{m.filter_panel()}
					{#if activeExtras.length}
						<span
							class="grid size-5 place-items-center rounded-full bg-neon-cyan text-[11px] font-semibold text-background tabular-nums"
							>{activeExtras.length}</span
						>
					{/if}
				</button>
			{/if}

			<div class="flex items-center gap-2 sm:ml-auto">
				<label class="sr-only" for="filtro-ordem">{m.filter_sort_by()}</label>
				<select
					id="filtro-ordem"
					name="sort"
					onchange={submitSort}
					class="rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-white/80 outline-none focus-visible:border-neon-cyan"
				>
					{#each LIBRARY_SORTS as sort (sort)}
						<option value={sort} selected={filters.sort === sort}>{sortLabel(sort)}</option>
					{/each}
				</select>

				<!-- eslint-disable svelte/no-navigation-without-resolve -- caminho vem de resolve(); a regra não suporta query string -->
				{#if filters.sort === 'random'}
					<a
						href={hrefWith({})}
						onclick={(event) => {
							event.preventDefault();
							invalidateAll();
						}}
						class={pillClass}
						title={m.filter_shuffle_again()}
					>
						<ShuffleIcon class="size-4" aria-hidden="true" />
						{m.filter_shuffle()}
					</a>
				{:else}
					{@const DirIcon = filters.dir === 'asc' ? ArrowUpNarrowWideIcon : ArrowDownWideNarrowIcon}
					<a
						href={hrefWith({ dir: nextDir })}
						data-sveltekit-noscroll
						class={pillClass}
						title={m.filter_reverse()}
					>
						<DirIcon class="size-4" aria-hidden="true" />
						{directionLabel(filters.sort, filters.dir)}
						<span class="sr-only">{m.filter_reverse_hint()}</span>
					</a>
				{/if}
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		</div>

		{#if options}
			<!-- Fechado, o painel continua no formulário: os filtros escolhidos seguem valendo. -->
			<div
				id="painel-filtros"
				hidden={!panelOpen}
				class="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
			>
				<div class="flex flex-col gap-1.5 text-xs text-muted-foreground">
					<label for="filtro-genero">{m.filter_genre()}</label>
					<select id="filtro-genero" name="genre" onchange={submit} class={selectClass}>
						<option value="">{m.filter_all_genres()}</option>
						{#each options.genres as genre (genre.id)}
							<option value={genre.id} selected={filters.genre === String(genre.id)}
								>{genre.name}</option
							>
						{/each}
					</select>
				</div>
				<div class="flex flex-col gap-1.5 text-xs text-muted-foreground">
					<label for="filtro-decada">{m.filter_decade()}</label>
					<select id="filtro-decada" name="decade" onchange={submit} class={selectClass}>
						<option value="">{m.filter_any_decade()}</option>
						{#each options.decades as decade (decade)}
							<option value={decade} selected={filters.decade === String(decade)}
								>{m.filter_decade_value({ decade })}</option
							>
						{/each}
					</select>
				</div>
				<div class="flex flex-col gap-1.5 text-xs text-muted-foreground">
					<label for="filtro-pais">{m.fact_country()}</label>
					<select id="filtro-pais" name="country" onchange={submit} class={selectClass}>
						<option value="">{m.filter_any_country()}</option>
						{#each countries as country (country.code)}
							<option value={country.code} selected={filters.country === country.code}
								>{country.name}</option
							>
						{/each}
					</select>
				</div>
				<div class="flex flex-col gap-1.5 text-xs text-muted-foreground">
					<label for="filtro-idioma">{m.fact_original_language()}</label>
					<select id="filtro-idioma" name="lang" onchange={submit} class={selectClass}>
						<option value="">{m.filter_any_language()}</option>
						{#each languages as language (language.code)}
							<option value={language.code} selected={filters.lang === language.code}
								>{language.name}</option
							>
						{/each}
					</select>
				</div>
				<div class="flex flex-col gap-1.5 text-xs text-muted-foreground">
					<label for="filtro-nota">{m.filter_rating()}</label>
					<select id="filtro-nota" name="rating" onchange={submit} class={selectClass}>
						<option value="">{m.filter_any_rating()}</option>
						{#each RATING_FILTERS as rating (rating)}
							<option value={rating} selected={filters.rating === rating}
								>{ratingLabel(rating)}</option
							>
						{/each}
					</select>
				</div>
				<div class="flex flex-col gap-1.5 text-xs text-muted-foreground">
					<label for="filtro-ano">{m.filter_watched_in()}</label>
					<select id="filtro-ano" name="year" onchange={submit} class={selectClass}>
						<option value="">{m.filter_any_year()}</option>
						{#each options.years as year (year)}
							<option value={year} selected={filters.year === String(year)}>{year}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}

		{#if hasActiveFilters(filters)}
			<!-- Filtros ativos: cada chip remove o seu -->
			<div class="flex flex-wrap items-center gap-2 text-sm">
				<span class="mr-1 text-muted-foreground tabular-nums" aria-live="polite">
					{plural(counts[filters.view], m.movies_count_one, m.movies_count_other)}
				</span>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- caminho vem de resolve(); a regra não suporta query string -->
				{#if filters.q}
					<a
						href={hrefWith({ q: undefined })}
						data-sveltekit-noscroll
						class="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-2 pl-3 text-white/85 transition hover:bg-white/15"
						aria-label={m.filter_remove({ filter: `“${filters.q}”` })}
					>
						“{filters.q}”
						<XIcon class="size-3.5" aria-hidden="true" />
					</a>
				{/if}
				{#each activeExtras as key (key)}
					<a
						href={hrefWith({ [key]: undefined })}
						data-sveltekit-noscroll
						class="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-2 pl-3 text-white/85 transition hover:bg-white/15"
						aria-label={m.filter_remove({ filter: chipLabel(key, filters[key]!) })}
					>
						{chipLabel(key, filters[key]!)}
						<XIcon class="size-3.5" aria-hidden="true" />
					</a>
				{/each}
				<a
					href={hrefWith({
						q: undefined,
						...Object.fromEntries(EXTRA_FILTERS.map((k) => [k, undefined]))
					})}
					data-sveltekit-noscroll
					class="px-2 text-white/55 underline-offset-4 hover:text-white hover:underline"
					>{m.filter_clear()}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		{/if}

		<!-- Sem JavaScript, o formulário precisa de um botão -->
		<noscript><button class="rounded-full bg-white/10 px-4 py-2 text-sm">Aplicar</button></noscript>
	</form>
</div>
