import { prisma } from '$lib/server/db';
import { getMovieDetails, getNowPlaying, getPopular, getTopRated } from '$lib/server/tmdb';
import type { TMDbMovie } from '$lib/tmdb/types';

/** Embaralhamento Fisher–Yates (não altera o array original). */
export function shuffle<T>(items: T[], random = Math.random): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

/** Candidatos únicos, com backdrop, que o usuário ainda não assistiu. */
export function pickSuggestions(pool: TMDbMovie[], watchedIds: Set<number>, count: number) {
	const unique = [...new Map(pool.map((movie) => [movie.id, movie])).values()];
	return shuffle(unique.filter((movie) => movie.backdropPath && !watchedIds.has(movie.id))).slice(
		0,
		count
	);
}

/** 8 filmes aleatórios para o carrossel do dashboard, com direção/país/duração. */
export async function getSuggestions(userId: string, fetchFn?: typeof fetch, count = 8) {
	const [popular, nowPlaying, topRated, watched] = await Promise.all([
		getPopular(fetchFn).catch(() => []),
		getNowPlaying(fetchFn).catch(() => []),
		getTopRated(fetchFn).catch(() => []),
		prisma.libraryEntry.findMany({
			where: { userId, status: 'WATCHED' },
			select: { movieId: true }
		})
	]);

	const picks = pickSuggestions(
		[...popular, ...nowPlaying, ...topRated],
		new Set(watched.map((entry) => entry.movieId)),
		count
	);

	const details = await Promise.all(
		picks.map((movie) => getMovieDetails(movie.id, fetchFn).catch(() => null))
	);
	return details.filter((movie) => movie !== null);
}
