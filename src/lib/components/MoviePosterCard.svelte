<script lang="ts">
	import { openMovie } from '$lib/movie/open.svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MovieMetaLine from '$lib/components/MovieMetaLine.svelte';
	import { VIEW_ICONS } from '$lib/components/dashboard/library-icons';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import { movieMeta } from '$lib/format';
	import type { LibraryState, PosterMovie } from '$lib/library/types';
	import { posterSrcset, posterUrl } from '$lib/tmdb/images';

	/**
	 * Card de pôster usado na biblioteca e na busca.
	 * Canto superior esquerdo: estado na biblioteca ou, se o filme não está nela e `add` foi
	 * passado, o botão de adicionar ("Quero ver"). Direito: nº de sessões a partir da 2ª.
	 */
	let {
		movie,
		library,
		add
	}: {
		movie: PosterMovie;
		library: LibraryState | null;
		/** Habilita o botão "+". `action` é a form action; sem login, o botão leva ao login. */
		add?: { action: string; signedIn: boolean; loginHref: string };
	} = $props();

	// Estado adicionado localmente (sem recarregar a página nem perder a rolagem infinita).
	let addedLocally = $state(false);
	let adding = $state(false);
	const current = $derived<LibraryState | null>(
		library ??
			(addedLocally
				? { status: 'WANT_TO_WATCH', rating: null, isFavorite: false, watchCount: 0 }
				: null)
	);

	// Um único selo: favorito implica assistido (regra de negócio), então o coração substitui o olho.
	const status = $derived(
		!current
			? null
			: current.isFavorite
				? { ...VIEW_ICONS.favorites, label: 'Favorito', fill: true }
				: current.status === 'WATCHED'
					? { ...VIEW_ICONS.watched, label: 'Assistido', fill: false }
					: { ...VIEW_ICONS.watchlist, label: 'Quero ver', fill: false }
	);
	const meta = $derived(movieMeta(movie));
	const badge = 'grid size-7 place-items-center rounded-full bg-background/80';
</script>

<article class="group relative">
	<a
		href={resolve('/movie/[id]', { id: String(movie.id) })}
		onclick={(event) => openMovie(event, movie.id)}
		class="block"
	>
		<div
			class="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-white/10 transition duration-300 group-hover:ring-2 group-hover:ring-neon-pink"
		>
			{#if movie.posterPath}
				<img
					src={posterUrl(movie.posterPath, 'w342')}
					srcset={posterSrcset(movie.posterPath)}
					sizes="(min-width: 1280px) 16vw, (min-width: 768px) 22vw, 45vw"
					alt="Pôster de {movie.title}"
					loading="lazy"
					decoding="async"
					class="size-full object-cover"
				/>
			{/if}

			{#if current?.rating}
				<div
					class="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/90 to-transparent px-3 pt-8 pb-2.5 text-sm"
				>
					<RatingBadge rating={current.rating} />
				</div>
			{/if}
		</div>

		<div class="mt-2.5 flex items-baseline justify-between gap-2">
			<p class="truncate text-sm font-medium">{movie.title}</p>
			<p class="shrink-0 text-xs text-muted-foreground tabular-nums">{movie.year ?? '—'}</p>
		</div>
		<MovieMetaLine
			{meta}
			class="mt-0.5 text-xs text-muted-foreground"
			directorClass="text-white/75"
		/>
	</a>

	<!-- Selos sobre o pôster (fora do link: botões não podem ficar dentro de <a>) -->
	<div class="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between">
		<div class="pointer-events-auto">
			{#if status}
				<span class={badge} title={status.label}>
					<status.icon
						class={['size-3.5', status.color, status.fill && 'fill-current']}
						aria-hidden="true"
					/>
					<span class="sr-only">{status.label}</span>
				</span>
			{:else if add && !add.signedIn}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- loginHref é montado com resolve('/login') pela página -->
				<a
					href={add.loginHref}
					class="{badge} transition hover:bg-primary hover:text-primary-foreground"
					title="Entre para adicionar"
				>
					<PlusIcon class="size-4" aria-hidden="true" />
					<span class="sr-only">Entre para adicionar {movie.title} à biblioteca</span>
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{:else if add}
				<form
					method="POST"
					action={add.action}
					use:enhance={() => {
						adding = true;
						// Não recarrega os dados da página: atualiza só este card.
						return async ({ result }) => {
							adding = false;
							if (result.type === 'success') addedLocally = true;
						};
					}}
				>
					<input type="hidden" name="movieId" value={movie.id} />
					<button
						disabled={adding}
						class="{badge} transition hover:bg-primary hover:text-primary-foreground disabled:opacity-70"
						title="Adicionar à biblioteca (Quero ver)"
					>
						{#if adding}
							<LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
						{:else}
							<PlusIcon class="size-4" aria-hidden="true" />
						{/if}
						<span class="sr-only">Adicionar {movie.title} à biblioteca</span>
					</button>
				</form>
			{/if}
		</div>

		{#if current && current.watchCount > 1}
			<span
				class="pointer-events-auto grid h-7 min-w-7 place-items-center rounded-full bg-background/80 px-2 text-xs font-medium tabular-nums"
				title="Assistido {current.watchCount} vezes"
			>
				<span aria-hidden="true">{current.watchCount}×</span>
				<span class="sr-only">Assistido {current.watchCount} vezes</span>
			</span>
		{/if}
	</div>
</article>
