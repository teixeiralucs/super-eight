<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowDownWideNarrowIcon from '@lucide/svelte/icons/arrow-down-wide-narrow';
	import ArrowUpNarrowWideIcon from '@lucide/svelte/icons/arrow-up-narrow-wide';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';
	import { VIEW_ICONS } from './library-icons';
	import {
		DIRECTION_LABELS,
		filtersQuery,
		LIBRARY_SORTS,
		LIBRARY_VIEWS,
		SORT_LABELS,
		VIEW_LABELS,
		type LibraryFilters,
		type LibraryView
	} from '$lib/library/filters';

	let {
		filters,
		genres,
		counts
	}: {
		filters: LibraryFilters;
		genres: string[];
		counts: Record<LibraryView, number>;
	} = $props();

	/** Link para a biblioteca com os filtros alterados (valores padrão omitidos da URL). */
	const hrefWith = (changes: Partial<LibraryFilters>) =>
		`${resolve('/dashboard')}${filtersQuery({ ...filters, ...changes })}#biblioteca`;

	const submit = (event: Event) => (event.currentTarget as HTMLSelectElement).form?.requestSubmit();

	/** Trocar a ordenação volta a direção ao padrão natural dela. */
	function submitSort(event: Event) {
		const form = (event.currentTarget as HTMLSelectElement).form;
		const dir = form?.elements.namedItem('dir');
		if (dir instanceof HTMLInputElement) dir.disabled = true;
		form?.requestSubmit();
	}

	const nextDir = $derived(filters.dir === 'asc' ? 'desc' : 'asc');
</script>

<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
	<nav aria-label="Filtrar biblioteca" class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
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
				{VIEW_LABELS[view]}
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
		action="{resolve('/dashboard')}#biblioteca"
		data-sveltekit-noscroll
		data-sveltekit-keepfocus
		class="flex flex-wrap items-center gap-2"
	>
		{#if filters.view !== 'all'}<input type="hidden" name="view" value={filters.view} />{/if}
		{#if filters.sort !== 'random'}<input type="hidden" name="dir" value={filters.dir} />{/if}

		<label class="sr-only" for="filtro-genero">Gênero</label>
		<select
			id="filtro-genero"
			name="genre"
			onchange={submit}
			class="rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-white/80 outline-none focus-visible:border-neon-cyan"
		>
			<option value="">Todos os gêneros</option>
			{#each genres as genre (genre)}
				<option value={genre} selected={filters.genre === genre}>{genre}</option>
			{/each}
		</select>

		<label class="sr-only" for="filtro-ordem">Ordenar por</label>
		<select
			id="filtro-ordem"
			name="sort"
			onchange={submitSort}
			class="rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-white/80 outline-none focus-visible:border-neon-cyan"
		>
			{#each LIBRARY_SORTS as sort (sort)}
				<option value={sort} selected={filters.sort === sort}>{SORT_LABELS[sort]}</option>
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
				class="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:text-white"
				title="Embaralhar de novo"
			>
				<ShuffleIcon class="size-4" aria-hidden="true" /> Embaralhar
			</a>
		{:else}
			{@const DirIcon = filters.dir === 'asc' ? ArrowUpNarrowWideIcon : ArrowDownWideNarrowIcon}
			<a
				href={hrefWith({ dir: nextDir })}
				data-sveltekit-noscroll
				class="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:text-white"
				title="Inverter ordem"
			>
				<DirIcon class="size-4" aria-hidden="true" />
				{DIRECTION_LABELS[filters.sort][filters.dir]}
				<span class="sr-only">(clique para inverter)</span>
			</a>
		{/if}
		<!-- eslint-enable svelte/no-navigation-without-resolve -->

		<!-- Sem JavaScript, o formulário precisa de um botão -->
		<noscript><button class="rounded-full bg-white/10 px-4 py-2 text-sm">Aplicar</button></noscript>
	</form>
</div>
