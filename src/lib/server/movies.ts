import { prisma } from '$lib/server/db';
import { getMovieCacheData, getMovieImages, localizedLogos } from '$lib/server/tmdb';

/**
 * Garante que o filme existe no cache local `Movie` (earlySetup.md §4.3.2), buscando no
 * TMDb o título original, as traduções pt/en/es, o pôster e a logo de cada idioma.
 */
export async function ensureMovie(tmdbId: number, fetchFn?: typeof fetch) {
	const [details, images] = await Promise.all([
		getMovieCacheData(tmdbId, fetchFn),
		// Sem as imagens, o card mostra o título em texto.
		getMovieImages(tmdbId, fetchFn).catch(() => null)
	]);
	const logos = localizedLogos(images?.logos ?? [], details.originalLanguage);

	const data = {
		originalTitle: details.originalTitle,
		originalLanguage: details.originalLanguage,
		titlePt: details.titles.pt,
		titleEn: details.titles.en,
		titleEs: details.titles.es,
		posterPt: details.posters.pt,
		posterEn: details.posters.en,
		posterEs: details.posters.es,
		logoPt: logos.pt,
		logoEn: logos.en,
		logoEs: logos.es,
		backdropPath: details.backdropPath,
		releaseDate: details.releaseDate ? new Date(`${details.releaseDate}T00:00:00Z`) : null,
		runtime: details.runtime,
		genreIds: details.genreIds,
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
