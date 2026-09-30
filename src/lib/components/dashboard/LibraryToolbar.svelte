<script lang="ts">
	import { resolve } from '$app/paths';
	import { VIEW_ICONS } from './library-icons';
	import {
		DEFAULT_SORT,
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

	/** Link da aba preservando gênero/ordenação; omite valores padrão para URLs limpas. */
	function viewHref(view: LibraryView) {
		const pairs = [
			view !== 'all' && ['view', view],
			filters.genre && ['genre', filters.genre],
			filters.sort !== DEFAULT_SORT && ['sort', filters.sort]
		].filter((pair): pair is [string, string] => Array.isArray(pair));
		const query = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
		return `${resolve('/dashboard')}${query ? `?${query}` : ''}#biblioteca`;
	}

	const submit = (event: Event) => (event.currentTarget as HTMLSelectElement).form?.requestSubmit();
</script>

<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
	<nav aria-label="Filtrar biblioteca" class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
		{#each LIBRARY_VIEWS as view (view)}
			{@const { icon: Icon, color } = VIEW_ICONS[view]}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- caminho vem de resolve(); a regra não suporta query string -->
			<a
				href={viewHref(view)}
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
			onchange={submit}
			class="rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-white/80 outline-none focus-visible:border-neon-cyan"
		>
			{#each LIBRARY_SORTS as sort (sort)}
				<option value={sort} selected={filters.sort === sort}>{SORT_LABELS[sort]}</option>
			{/each}
		</select>

		<!-- Sem JavaScript, o formulário precisa de um botão -->
		<noscript><button class="rounded-full bg-white/10 px-4 py-2 text-sm">Aplicar</button></noscript>
	</form>
</div>
