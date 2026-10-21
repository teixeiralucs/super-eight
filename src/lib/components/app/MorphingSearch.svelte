<script lang="ts">
	import { tick } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { backOut, cubicIn } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import { VIEW_ICONS } from '$lib/components/dashboard/library-icons';
	import type { LibraryState, SearchItem } from '$lib/library/types';
	import { showMovie } from '$lib/movie/open.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		addRecentSearch,
		loadRecentSearches,
		recentSearches,
		removeRecentSearch
	} from '$lib/recent-searches.svelte';
	import { MAX_QUERY_LENGTH } from '$lib/search';
	import { posterUrl } from '$lib/tmdb/images';

	/**
	 * Busca rápida (earlySetup.md §6.14, "Morphing Search" da beUI): o campo do topo (ou a lupa,
	 * no celular) estica com quique até virar uma superfície de vidro, por clique ou atalho
	 * (`/` ou Ctrl/⌘ K). Vazia: as 3 últimas buscas. Digitando: até 6 filmes. Enter ou a lupa
	 * levam à página completa de resultados.
	 */
	let { showTrigger = true }: { showTrigger?: boolean } = $props();

	const SUGGESTIONS = 6;
	const MIN_CHARS = 2;

	let open = $state(false);
	let query = $state('');
	let results = $state<SearchItem[] | null>(null);
	let loading = $state(false);
	let failed = $state(false);
	let active = $state(-1);
	let input = $state<HTMLInputElement>();
	let desktopTrigger = $state<HTMLElement>();
	let mobileTrigger = $state<HTMLElement>();

	const term = $derived(query.trim());
	const typing = $derived(term.length >= MIN_CHARS);

	type Option =
		{ kind: 'recent'; term: string } | { kind: 'movie'; item: SearchItem } | { kind: 'all' };
	const options = $derived<Option[]>(
		typing
			? [...(results ?? []).map((item): Option => ({ kind: 'movie', item })), { kind: 'all' }]
			: recentSearches.terms.map((value): Option => ({ kind: 'recent', term: value }))
	);
	const optionId = (i: number) => `busca-rapida-opcao-${i}`;

	// ─── Abrir / fechar ─────────────────────────────────────────────────
	let previousOverflow = '';
	let returnFocus: HTMLElement | null = null;

	async function openSearch() {
		if (open) return input?.focus();
		loadRecentSearches();
		returnFocus = document.activeElement as HTMLElement | null;
		// Sempre abre vazia: primeiro as buscas recentes (clique ou atalho).
		query = '';
		results = null;
		open = true;
		active = -1;
		previousOverflow = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		await tick();
		input?.focus();
		input?.select();
	}

	function closeSearch() {
		if (!open) return;
		open = false;
		document.documentElement.style.overflow = previousOverflow;
		returnFocus?.focus?.();
	}

	/** Campo visível de onde a superfície nasce (desktop: o campo; celular: a lupa). */
	const triggerRect = () => {
		for (const element of [desktopTrigger, mobileTrigger]) {
			const rect = element?.getBoundingClientRect();
			if (rect?.width) return rect;
		}
		return null;
	};

	/**
	 * O painel nasce do recorte do campo (mesma posição e tamanho) e se abre até o tamanho
	 * final com um quique (`backOut`) — recorte, não escala, para o texto não deformar.
	 * Fechando, volta para o campo rápido.
	 */
	function morph(
		node: HTMLElement,
		_: unknown,
		{ direction }: { direction: 'in' | 'out' | 'both' }
	) {
		const from = triggerRect();
		if (!from || prefersReducedMotion.current) return { duration: 0 };
		const to = node.getBoundingClientRect();
		const inset = {
			top: from.top - to.top,
			right: to.right - from.right,
			bottom: to.bottom - from.bottom,
			left: from.left - to.left
		};
		const out = direction === 'out';
		return {
			duration: out ? 200 : 560,
			easing: out ? cubicIn : backOut,
			css: (t: number) => {
				const u = 1 - t;
				const radius = 999 * u + 28 * t;
				return `clip-path: inset(${inset.top * u}px ${inset.right * u}px ${inset.bottom * u}px ${inset.left * u}px round ${radius}px); opacity: ${Math.min(1, 0.4 + t * 1.5)}`;
			}
		};
	}

	// ─── Sugestões enquanto digita ──────────────────────────────────────
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	$effect(() => {
		const current = term;
		clearTimeout(timer);
		controller?.abort();
		active = -1;
		if (current.length < MIN_CHARS) {
			results = null;
			loading = false;
			return;
		}
		loading = true;
		failed = false;
		timer = setTimeout(async () => {
			const abort = (controller = new AbortController());
			try {
				const params = new URLSearchParams({ q: current, limit: String(SUGGESTIONS) });
				const response = await fetch(`${resolve('/api/search')}?${params}`, {
					signal: abort.signal
				});
				if (!response.ok) throw new Error(String(response.status));
				const page: { items: SearchItem[] } = await response.json();
				results = page.items.slice(0, SUGGESTIONS);
			} catch (err) {
				if (abort.signal.aborted) return;
				failed = true;
				results = [];
				console.warn('[busca rápida]', err);
			} finally {
				if (!abort.signal.aborted) loading = false;
			}
		}, 180);
	});

	// ─── Escolhas ───────────────────────────────────────────────────────
	async function seeAll() {
		if (!term) return;
		addRecentSearch(term);
		closeSearch();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- caminho de resolve() + query
		await goto(`${resolve('/search')}?q=${encodeURIComponent(term)}`);
	}

	function choose(option: Option) {
		if (option.kind === 'recent') {
			// Busca recente: refaz a busca aqui mesmo (Enter leva à página completa).
			query = option.term;
			input?.focus();
		} else if (option.kind === 'movie') {
			addRecentSearch(term);
			closeSearch();
			void showMovie(option.item.movie.id);
		} else {
			void seeAll();
		}
	}

	function onInputKeydown(event: KeyboardEvent) {
		const count = options.length;
		if (event.key === 'ArrowDown' && count) {
			event.preventDefault();
			active = (active + 1) % count;
		} else if (event.key === 'ArrowUp' && count) {
			event.preventDefault();
			active = active <= 0 ? count - 1 : active - 1;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (active >= 0 && options[active]) choose(options[active]);
			else void seeAll();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			closeSearch();
		}
	}

	$effect(() => {
		if (active >= 0)
			document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
	});

	// ─── Atalho: "/" (fora de campos) ou Ctrl/⌘ K, de qualquer tela ─────
	function onWindowKeydown(event: KeyboardEvent) {
		const target = event.target instanceof Element ? event.target : null;
		const editing = target?.closest('input, textarea, select, [contenteditable="true"]');
		const slash = event.key === '/' && !editing && !event.metaKey && !event.ctrlKey;
		const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
		if (!slash && !commandK) return;
		event.preventDefault();
		if (!showTrigger) {
			// Na página de busca, o atalho vai para o campo grande dela.
			document.querySelector<HTMLInputElement>('main input[type="search"]')?.focus();
			return;
		}
		void openSearch();
	}

	const libraryIcon = (state: LibraryState) =>
		state.isFavorite
			? VIEW_ICONS.favorites
			: state.status === 'WATCHED'
				? VIEW_ICONS.watched
				: VIEW_ICONS.watchlist;

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if showTrigger}
	<!-- Fechada: parece o campo de sempre (desktop) ou uma lupa (celular) -->
	<button
		bind:this={desktopTrigger}
		type="button"
		onclick={openSearch}
		aria-haspopup="dialog"
		aria-expanded={open}
		class={[
			'mx-auto hidden h-10 w-full max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-left text-sm text-white/40 transition hover:border-white/20 md:flex',
			open && 'invisible'
		]}
	>
		<SearchIcon class="size-4 text-white/50" aria-hidden="true" />
		<span class="flex-1 truncate">{m.search_movies_placeholder()}</span>
		<kbd
			class="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/45"
			title={m.quick_search_shortcut({ keys: isMac ? '⌘K' : 'Ctrl K' })}>/</kbd
		>
	</button>
	<button
		bind:this={mobileTrigger}
		type="button"
		onclick={openSearch}
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-label={m.search_movies()}
		class="ml-auto grid size-9 place-items-center rounded-full border border-white/10 text-white/70 transition hover:text-white md:hidden"
	>
		<SearchIcon class="size-4" aria-hidden="true" />
	</button>
{/if}

{#if open}
	<!-- Fundo: escurece e desfoca a página; clicar fecha -->
	<div
		class="fixed inset-0 z-[80] bg-background/60 backdrop-blur-sm"
		aria-hidden="true"
		onclick={closeSearch}
		transition:fade={{ duration: prefersReducedMotion.current ? 0 : 180 }}
	></div>

	<div
		role="dialog"
		aria-modal="true"
		aria-label={m.quick_search_label()}
		class="fixed top-3 left-1/2 z-[81] w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2"
	>
		<form
			role="search"
			onsubmit={(event) => {
				event.preventDefault();
				void seeAll();
			}}
			transition:morph
			class="overflow-hidden rounded-[28px] border border-white/15 bg-card/80 shadow-2xl shadow-black/60 backdrop-blur-xl"
		>
			<div class="flex h-14 items-center gap-3 px-4">
				<button
					type="submit"
					class="grid size-9 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
					aria-label={m.quick_search_see_all_short()}
					title={m.quick_search_see_all_short()}
				>
					{#if loading}
						<LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
					{:else}
						<SearchIcon class="size-4" aria-hidden="true" />
					{/if}
				</button>
				<input
					bind:this={input}
					bind:value={query}
					onkeydown={onInputKeydown}
					type="search"
					name="q"
					role="combobox"
					aria-expanded={options.length > 0}
					aria-controls="busca-rapida-lista"
					aria-activedescendant={active >= 0 ? optionId(active) : undefined}
					aria-autocomplete="list"
					autocomplete="off"
					maxlength={MAX_QUERY_LENGTH}
					placeholder={m.search_movies_placeholder()}
					class="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
				/>
				{#if query}
					<button
						type="button"
						onclick={() => {
							query = '';
							input?.focus();
						}}
						class="grid size-8 place-items-center rounded-full text-white/50 transition hover:text-white"
						aria-label={m.quick_search_clear()}
					>
						<XIcon class="size-4" aria-hidden="true" />
					</button>
				{/if}
				<kbd
					class="hidden rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/45 sm:block"
					>Esc</kbd
				>
			</div>

			<!-- Resultados: desdobram da borda do campo -->
			<div
				transition:slide={{ duration: prefersReducedMotion.current ? 0 : 280 }}
				class="max-h-[min(70svh,560px)] overflow-y-auto border-t border-white/10 p-2"
			>
				<ul id="busca-rapida-lista" role="listbox" aria-label={m.quick_search_label()}>
					{#if !typing}
						{#if recentSearches.terms.length}
							<li
								role="presentation"
								class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase"
							>
								{m.quick_search_recent()}
							</li>
						{/if}
						{#each recentSearches.terms as recent, i (recent)}
							<!-- svelte-ignore a11y_click_events_have_key_events (teclado: setas + Enter no campo, padrão combobox) -->
							<li
								id={optionId(i)}
								role="option"
								aria-selected={active === i}
								in:fly={{ y: 6, delay: i * 30, duration: 220 }}
								class={[
									'group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition',
									active === i ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/[0.06]'
								]}
								onclick={() => choose({ kind: 'recent', term: recent })}
								onmouseenter={() => (active = i)}
							>
								<ClockIcon class="size-4 shrink-0 text-white/40" aria-hidden="true" />
								<span class="min-w-0 flex-1 truncate">{recent}</span>
								<button
									type="button"
									tabindex="-1"
									onclick={(event) => {
										event.stopPropagation();
										removeRecentSearch(recent);
										input?.focus();
									}}
									class="grid size-7 place-items-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
									aria-label={m.quick_search_remove_recent({ term: recent })}
								>
									<XIcon class="size-3.5" aria-hidden="true" />
								</button>
							</li>
						{:else}
							<li role="presentation" class="px-3 py-4 text-sm text-white/50">
								{m.quick_search_hint()}
							</li>
						{/each}
					{:else}
						{#if results === null && loading}
							{#each [0, 1, 2] as i (i)}
								<li role="presentation" class="flex items-center gap-3 px-3 py-2">
									<span class="h-[54px] w-9 animate-pulse rounded-md bg-white/[0.06]"></span>
									<span class="flex flex-1 flex-col gap-2">
										<span class="h-3.5 w-2/3 animate-pulse rounded bg-white/[0.06]"></span>
										<span class="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]"></span>
									</span>
								</li>
							{/each}
						{:else if results && !results.length}
							<li role="presentation" class="px-3 py-4 text-sm text-white/55">
								{failed ? m.error_search_unavailable() : m.quick_search_none({ q: term })}
							</li>
						{/if}
						{#each results ?? [] as item, i (item.movie.id)}
							{@const movie = item.movie}
							<!-- svelte-ignore a11y_click_events_have_key_events (teclado: setas + Enter no campo, padrão combobox) -->
							<li
								id={optionId(i)}
								role="option"
								aria-selected={active === i}
								in:fly={{ y: 8, delay: i * 35, duration: 260, easing: backOut }}
								class={[
									'flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition',
									active === i ? 'bg-white/10' : 'hover:bg-white/[0.06]'
								]}
								onclick={() => choose({ kind: 'movie', item })}
								onmouseenter={() => (active = i)}
							>
								{#if movie.posterPath}
									<img
										src={posterUrl(movie.posterPath, 'w185')}
										alt=""
										loading="lazy"
										class="h-[54px] w-9 shrink-0 rounded-md object-cover ring-1 ring-white/10"
									/>
								{:else}
									<span class="h-[54px] w-9 shrink-0 rounded-md bg-white/[0.06]"></span>
								{/if}
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-medium text-white"
										>{movie.originalTitle}</span
									>
									<span class="block truncate text-xs text-white/50">
										{[
											movie.title !== movie.originalTitle ? movie.title : null,
											movie.year,
											movie.directors[0]
										]
											.filter(Boolean)
											.join(' · ')}
									</span>
								</span>
								{#if item.library}
									{@const status = libraryIcon(item.library)}
									<status.icon
										class={[
											'size-4 shrink-0',
											status.color,
											item.library.isFavorite && 'fill-current'
										]}
										aria-hidden="true"
									/>
								{/if}
							</li>
						{/each}
						<!-- Sempre por último: a página completa de resultados (também o Enter e a lupa) -->
						<!-- svelte-ignore a11y_click_events_have_key_events (teclado: setas + Enter no campo, padrão combobox) -->
						<li
							id={optionId(results?.length ?? 0)}
							role="option"
							aria-selected={active === (results?.length ?? 0)}
							class={[
								'mt-1 flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm transition',
								active === (results?.length ?? 0)
									? 'bg-white/10 text-white'
									: 'text-white/70 hover:bg-white/[0.06]'
							]}
							onclick={() => choose({ kind: 'all' })}
							onmouseenter={() => (active = results?.length ?? 0)}
						>
							<SearchIcon class="size-4 shrink-0 text-neon-cyan" aria-hidden="true" />
							<span class="min-w-0 flex-1 truncate">{m.quick_search_see_all({ q: term })}</span>
							<kbd
								class="hidden rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/45 sm:block"
								>Enter</kbd
							>
							<ArrowRightIcon class="size-4 shrink-0 text-white/40" aria-hidden="true" />
						</li>
					{/if}
				</ul>
			</div>
		</form>
	</div>
{/if}
