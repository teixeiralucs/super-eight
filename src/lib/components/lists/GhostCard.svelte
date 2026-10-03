<script lang="ts">
	import MoviePosterCard from '$lib/components/MoviePosterCard.svelte';
	import { yearOf } from '$lib/format';
	import type { CollectionGhost } from '$lib/lists/types';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Filme da coleção que o usuário não tem: apagado e sem cor até passar o mouse; o "+"
	 * adiciona em Quero ver. Sem pôster (listas do Trakt), busca pôster e título traduzido no
	 * TMDb quando o card chega perto da tela.
	 */
	let { movie, onadded }: { movie: CollectionGhost; onadded: () => void } = $props();

	let loaded = $state<{ title: string; originalTitle: string; posterPath: string | null } | null>(
		null
	);

	function lazyPoster(element: HTMLElement) {
		if (movie.posterPath) return;
		const observer = new IntersectionObserver(
			async (entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				const response = await fetch(`/api/movie/${movie.id}/card`).catch(() => null);
				if (response?.ok) loaded = await response.json();
			},
			{ rootMargin: '400px' }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}

	const poster = $derived({
		id: movie.id,
		title: loaded?.title ?? movie.title,
		originalTitle: loaded?.originalTitle ?? movie.originalTitle,
		posterPath: loaded?.posterPath ?? movie.posterPath,
		year: yearOf(movie.releaseDate),
		directors: [],
		countries: [],
		runtime: null
	});
</script>

<div
	{@attach lazyPoster}
	class="opacity-45 grayscale transition duration-300 focus-within:opacity-100 focus-within:grayscale-0 hover:opacity-100 hover:grayscale-0"
>
	<span class="sr-only">{m.collection_missing_label({ title: poster.originalTitle })}</span>
	<MoviePosterCard
		movie={poster}
		library={null}
		add={{ action: '?/add', signedIn: true, loginHref: '' }}
		{onadded}
	/>
</div>
