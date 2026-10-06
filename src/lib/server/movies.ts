import { prisma } from '$lib/server/db';
import {
	collectionFields,
	getCollection,
	getMovieCacheData,
	getMovieImages,
	localizedLogos
} from '$lib/server/tmdb';
import { refreshWatch } from '$lib/server/watch';

/** Busca a coleção (saga) no TMDb e grava/renova o cache `Collection`. */
export async function refreshCollection(id: number, fetchFn?: typeof fetch) {
	const fields = collectionFields(await getCollection(id, fetchFn));
	await prisma.collection.upsert({ where: { id }, create: { id, ...fields }, update: fields });
}

/**
 * Garante a coleção (saga) no cache `Collection`. Já existente não é buscada de novo (a
 * rotina diária renova). Falhou: o filme fica sem coleção, sem quebrar nada.
 */
async function ensureCollection(id: number, fetchFn?: typeof fetch): Promise<number | null> {
	if (await prisma.collection.findUnique({ where: { id }, select: { id: true } })) return id;
	try {
		await refreshCollection(id, fetchFn);
		return id;
	} catch (err) {
		console.error('[movies] coleção indisponível:', id, String(err));
		return null;
	}
}

/**
 * Garante que o filme existe no cache local `Movie` (earlySetup.md §4.3.2), buscando no
 * TMDb o título original, as traduções pt/en/es, o pôster e a logo de cada idioma. Sempre
 * busca de novo: também serve para renovar (rotina diária).
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
		imdbId: details.imdbId,
		...details.credits
	};

	const movie = await prisma.movie.upsert({
		where: { id: tmdbId },
		create: { id: tmdbId, ...data },
		update: data
	});
	// Filme novo no cache: já sai com "onde assistir" (a rotina diária renova depois).
	if (!movie.watchCheckedAt) {
		await refreshWatch(tmdbId, fetchFn).catch((err) =>
			console.error('[movies] onde assistir indisponível:', tmdbId, String(err))
		);
	}
	return movie;
}
