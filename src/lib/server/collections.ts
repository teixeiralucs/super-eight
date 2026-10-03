import { prisma } from '$lib/server/db';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import type { Locale } from '$lib/i18n';
import type { CollectionDetail, CollectionSummary } from '$lib/lists/types';
import type { CollectionPart } from '$lib/tmdb/types';

/**
 * Coleções do TMDb (earlySetup.md §6.8): sagas importadas do TMDb, só leitura. Cada usuário
 * vê as coleções dos filmes que tem na biblioteca, com os filmes dele.
 */

const NAME = { pt: 'namePt', en: 'nameEn', es: 'nameEs' } as const;
const collectionSelect = {
	id: true,
	namePt: true,
	nameEn: true,
	nameEs: true,
	backdropPath: true,
	partIds: true
} as const;
type CollectionRow = {
	id: number;
	namePt: string | null;
	nameEn: string;
	nameEs: string | null;
	backdropPath: string | null;
	partIds: number[];
};

const nameOf = (row: CollectionRow, locale: Locale) => row[NAME[locale]] ?? row.nameEn;

/** Coleções com pelo menos um filme na biblioteca: as mais completas primeiro. */
export async function getUserCollections(
	userId: string,
	locale: Locale
): Promise<CollectionSummary[]> {
	const entries = await prisma.libraryEntry.findMany({
		where: { userId, movie: { collectionId: { not: null } } },
		select: { movie: { select: { collectionId: true, backdropPath: true } } }
	});
	const owned = new Map<number, number>();
	for (const { movie } of entries) {
		owned.set(movie.collectionId!, (owned.get(movie.collectionId!) ?? 0) + 1);
	}
	if (!owned.size) return [];

	const rows = await prisma.collection.findMany({
		where: { id: { in: [...owned.keys()] } },
		select: collectionSelect
	});
	return rows
		.map((row) => ({
			id: row.id,
			name: nameOf(row, locale),
			owned: owned.get(row.id) ?? 0,
			// A biblioteca pode ter um filme que saiu da coleção no TMDb: nunca "5 de 4".
			total: Math.max(row.partIds.length, owned.get(row.id) ?? 0),
			backdropPath: row.backdropPath
		}))
		.sort((a, b) => b.owned - a.owned || a.name.localeCompare(b.name, locale));
}

/** Uma coleção com os filmes que o usuário tem (nula = coleção desconhecida). */
export async function getUserCollection(
	userId: string,
	collectionId: number,
	locale: Locale
): Promise<CollectionDetail | null> {
	const row = await prisma.collection.findUnique({
		where: { id: collectionId },
		select: { ...collectionSelect, parts: true }
	});
	if (!row) return null;

	const entries = await prisma.libraryEntry.findMany({
		where: { userId, movie: { collectionId } },
		select: {
			status: true,
			rating: true,
			isFavorite: true,
			movie: { select: movieCardSelect }
		}
	});
	const movieIds = entries.map((entry) => entry.movie.id);
	const [sessions, artworks] = await Promise.all([
		prisma.diaryEntry.groupBy({
			by: ['movieId'],
			where: { userId, movieId: { in: movieIds } },
			_count: { _all: true },
			_max: { watchedAt: true }
		}),
		getArtworks(userId, movieIds)
	]);
	const diary = new Map(sessions.map((s) => [s.movieId, s]));
	const owned = new Set(movieIds);

	return {
		id: row.id,
		name: nameOf(row, locale),
		total: Math.max(row.partIds.length, entries.length),
		backdropPath: row.backdropPath,
		items: entries.map((entry) => ({
			movie: withArtwork(localizeCard(entry.movie, locale), artworks),
			library: {
				status: entry.status,
				rating: entry.rating,
				isFavorite: entry.isFavorite,
				watchCount: diary.get(entry.movie.id)?._count._all ?? 0
			},
			lastWatched: diary.get(entry.movie.id)?._max.watchedAt ?? null
		})),
		// JSON gravado por `collectionFields` (formato CollectionPart).
		missing: (row.parts as unknown as CollectionPart[])
			.filter((part) => !owned.has(part.id))
			.map((part) => ({
				id: part.id,
				title: part.titles[locale] ?? part.originalTitle,
				originalTitle: part.originalTitle,
				posterPath: part.posters[locale] ?? part.posters.en,
				releaseDate: part.releaseDate ? new Date(`${part.releaseDate}T00:00:00Z`) : null
			}))
	};
}
