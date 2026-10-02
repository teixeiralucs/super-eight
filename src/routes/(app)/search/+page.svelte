<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import MoviePosterCard from '$lib/components/MoviePosterCard.svelte';
	import { infiniteScroll } from '$lib/attachments/infinite-scroll';
	import type { SearchItem } from '$lib/library/types';
	import { MAX_QUERY_LENGTH } from '$lib/search';
	import type { SearchPage } from '$lib/server/search';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const DEBOUNCE_MS = 400;

	// Resultados acumulados; recomeça sempre que a busca (dados do load) muda.
	let loaded = $derived({ items: data.items, page: data.page, totalPages: data.totalPages });
	let loadingMore = $state(false);
	let loadError = $state(false);
	// O campo é de quem digita: NÃO derivar de `data.q`, senão a resposta de uma busca antiga
	// ("The") sobrescreve o que já foi digitado depois ("Avengers").
	let term = $state(untrack(() => data.q));
	// Último termo que este campo pediu; a URL só manda no campo quando muda por fora
	// (voltar/avançar, link da barra do topo).
	let requested = untrack(() => data.q);
	$effect(() => {
		const q = data.q;
		untrack(() => {
			if (q !== requested) {
				requested = q;
				term = q;
			}
		});
	});

	const hasMore = $derived(loaded.page < loaded.totalPages);
	const signedIn = $derived(data.profile !== null);
	const loginHref = $derived(
		`${resolve('/login')}?next=${encodeURIComponent(`/search${data.q ? `?q=${encodeURIComponent(data.q)}` : ''}`)}`
	);

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		loadError = false;
		const query = `page=${loaded.page + 1}${data.q ? `&q=${encodeURIComponent(data.q)}` : ''}`;
		try {
			const response = await fetch(`${resolve('/api/search')}?${query}`);
			if (!response.ok) throw new Error(String(response.status));
			const next: SearchPage = await response.json();
			const seen = new Set(loaded.items.map((item) => item.movie.id));
			loaded = {
				items: [
					...loaded.items,
					...next.items.filter((item: SearchItem) => !seen.has(item.movie.id))
				],
				page: next.page,
				totalPages: next.totalPages
			};
		} catch {
			loadError = true;
		} finally {
			loadingMore = false;
		}
	}

	// Busca enquanto digita (com espera), refletida na URL.
	let timer: ReturnType<typeof setTimeout> | undefined;
	function search(value: string, delay = DEBOUNCE_MS) {
		clearTimeout(timer);
		timer = setTimeout(() => {
			const q = value.trim();
			requested = q;
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- caminho vem de resolve(); a regra não suporta query string
			goto(q ? `${resolve('/search')}?q=${encodeURIComponent(q)}` : resolve('/search'), {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		}, delay);
	}
</script>

<svelte:head>
	<title>{data.q ? `${data.q} — Busca` : 'Buscar'} — Super Eight</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-8 px-5 pt-6 pb-16 md:px-10">
	<header>
		<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">Buscar</p>

		<form
			method="GET"
			action={resolve('/search')}
			role="search"
			class="mt-4"
			onsubmit={(event) => {
				event.preventDefault();
				search(term, 0);
			}}
		>
			<label
				class="flex items-center gap-4 border-b border-white/15 pb-3 transition-colors focus-within:border-neon-cyan"
			>
				<SearchIcon class="size-7 shrink-0 text-white/40 md:size-9" aria-hidden="true" />
				<span class="sr-only">Buscar filmes</span>
				<input
					name="q"
					type="search"
					bind:value={term}
					oninput={() => search(term)}
					placeholder="Que filme você procura?"
					autocomplete="off"
					maxlength={MAX_QUERY_LENGTH}
					class="w-full bg-transparent font-display text-[clamp(1.75rem,4vw,3.5rem)] leading-tight font-semibold tracking-[-0.03em] outline-none placeholder:text-white/25 [&::-webkit-search-cancel-button]:hidden"
				/>
				{#if term}
					<button
						type="button"
						onclick={() => {
							term = '';
							search('', 0);
						}}
						class="grid size-9 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
						aria-label="Limpar busca"
					>
						<XIcon class="size-5" />
					</button>
				{/if}
			</label>
		</form>

		<p class="mt-4 text-sm text-muted-foreground" aria-live="polite">
			{#if data.q}
				Resultados para <span class="text-foreground">“{data.q}”</span>
			{:else}
				Em alta agora — digite para buscar entre milhares de filmes.
			{/if}
		</p>
	</header>

	{#if data.failed}
		<p class="rounded-3xl border border-white/10 px-6 py-16 text-center text-muted-foreground">
			A busca está indisponível no momento. Tente de novo em instantes.
		</p>
	{:else if loaded.items.length === 0}
		<div class="rounded-3xl border border-white/10 px-6 py-20 text-center">
			<p class="font-display text-2xl font-semibold">Nenhum filme encontrado.</p>
			<p class="mt-2 text-muted-foreground">Confira a grafia ou tente pelo título original.</p>
		</div>
	{:else}
		<ul
			class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6"
		>
			{#each loaded.items as item (item.movie.id)}
				<li>
					<MoviePosterCard
						movie={item.movie}
						library={item.library}
						add={{ action: '?/add', signedIn, loginHref }}
					/>
				</li>
			{/each}
		</ul>

		<!-- Sentinela da rolagem infinita (recriada a cada página para re-observar) -->
		{#if hasMore && !loadError}
			{#key loaded.items.length}
				<div {@attach infiniteScroll(loadMore)} class="h-px"></div>
			{/key}
		{/if}

		<div class="flex min-h-12 items-center justify-center text-sm text-muted-foreground">
			{#if loadingMore}
				<LoaderCircleIcon class="mr-2 size-4 animate-spin" aria-hidden="true" /> Carregando mais filmes…
			{:else if loadError}
				<button
					type="button"
					onclick={loadMore}
					class="rounded-full border border-white/15 px-5 py-2 text-white/80 transition hover:border-white/30"
				>
					Não foi possível carregar mais. Tentar de novo
				</button>
			{:else if !hasMore}
				Fim dos resultados.
			{/if}
		</div>
	{/if}
</main>
