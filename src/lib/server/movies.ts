import { prisma } from '$lib/server/db';
import {
	collectionFields,
	getCollection,
	getMovieCacheData,
	getMovieImages,
	localizedLogos
} from '$lib/server/tmdb';

/**
 * Garante a coleção (saga) no cache `Collection`. Já existente não é buscada de novo (o
 * script `movies:backfill-i18n` renova). Falhou: o filme fica sem coleção, sem quebrar nada.
 */
async function ensureCollection(id: number, fetchFn?: typeof fetch): Promise<number | null> {
	if (await prisma.collection.findUnique({ where: { id }, select: { id: true } })) return id;
	try {
		const fields = collectionFields(await getCollection(id, fetchFn));
		await prisma.collection.upsert({ where: { id }, create: { id, ...fields }, update: fields });
		return id;
	} catch (err) {
		console.error('[movies] coleção indisponível:', id, String(err));
		return null;
	}
}

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
	const collectionId = details.collectionId
		? await ensureCollection(details.collectionId, fetchFn)
		: null;

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
		voteAverage: details.voteAverage,
		collectionId,
		imdbId: details.imdbId
	};

	return prisma.movie.upsert({
		where: { id: tmdbId },
		create: { id: tmdbId, ...data },
		update: data
	});
}
