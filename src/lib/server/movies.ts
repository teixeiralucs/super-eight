import { prisma } from '$lib/server/db';
import { getMovieDetails } from '$lib/server/tmdb';

/**
 * Garante que o filme existe no cache local `Movie` (earlySetup.md §4.3.2),
 * buscando os metadados no TMDb e fazendo upsert.
 */
export async function ensureMovie(tmdbId: number, fetchFn?: typeof fetch) {
	const details = await getMovieDetails(tmdbId, fetchFn);

	const data = {
		title: details.title,
		originalTitle: details.originalTitle,
		overview: details.overview,
		posterPath: details.posterPath,
		backdropPath: details.backdropPath,
		releaseDate: details.releaseDate ? new Date(`${details.releaseDate}T00:00:00Z`) : null,
		runtime: details.runtime,
		genres: details.genres,
		directors: details.directors,
		countries: details.countries,
		voteAverage: details.voteAverage
	};

	return prisma.movie.upsert({
		where: { id: tmdbId },
		create: { id: tmdbId, ...data },
		update: data
	});
}
