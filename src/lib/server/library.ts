import { prisma } from '$lib/server/db';
import type { Prisma } from '$lib/server/generated/prisma/client';
import type { LibraryFilters } from '$lib/library/filters';
import { shuffle } from '$lib/library/shuffle';
import { computeStats } from '$lib/library/stats';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { getGenreNames } from '$lib/server/tmdb';
import type { Locale } from '$lib/i18n';

export const movieCard = movieCardSelect;

type Ordering = Prisma.LibraryEntryOrderByWithRelationInput[];

/** Ordenação no banco; `random` é embaralhado depois da consulta. Nulos sempre no fim. */
function orderBy({ sort, dir }: LibraryFilters): Ordering {
	switch (sort) {
		case 'recent':
			return [{ addedAt: dir }];
		case 'rating':
			return [{ rating: { sort: dir, nulls: 'last' } }, { movie: { originalTitle: 'asc' } }];
		// O título original é o destaque na UI (§6.5), então é ele que ordena.
		case 'title':
			return [{ movie: { originalTitle: dir } }];
		case 'release':
			return [
				{ movie: { releaseDate: { sort: dir, nulls: 'last' } } },
				{ movie: { originalTitle: 'asc' } }
			];
		case 'random':
			return [];
	}
}

/** Grade da biblioteca (lista principal) com filtros da URL e nº de sessões por filme. */
export async function getLibraryGrid(userId: string, filters: LibraryFilters, locale: Locale) {
	const where: Prisma.LibraryEntryWhereInput = { userId };
	if (filters.view === 'watched') where.status = 'WATCHED';
	if (filters.view === 'watchlist') where.status = 'WANT_TO_WATCH';
	if (filters.view === 'favorites') where.isFavorite = true;
	if (filters.genre) where.movie = { genreIds: { has: Number(filters.genre) } };

	const [entries, sessions, artworks] = await Promise.all([
		prisma.libraryEntry.findMany({
			where,
			orderBy: orderBy(filters),
			select: {
				status: true,
				rating: true,
				isFavorite: true,
				movie: { select: movieCard }
			}
		}),
		prisma.diaryEntry.groupBy({ by: ['movieId'], where: { userId }, _count: { _all: true } }),
		getArtworks(userId)
	]);

	const watchCounts = new Map(sessions.map((row) => [row.movieId, row._count._all]));
	const items = entries.map((entry) => ({
		...entry,
		movie: withArtwork(localizeCard(entry.movie, locale), artworks),
		watchCount: watchCounts.get(entry.movie.id) ?? 0
	}));
	return filters.sort === 'random' ? shuffle(items) : items;
}

/** Filmes aleatórios da própria biblioteca (assistidos ou não) para o carrossel. */
export async function getLibrarySuggestions(userId: string, locale: Locale, count = 8) {
	const [entries, artworks] = await Promise.all([
		prisma.libraryEntry.findMany({
			where: { userId, movie: { backdropPath: { not: null } } },
			select: { status: true, movie: { select: movieCard } }
		}),
		getArtworks(userId)
	]);
	return shuffle(entries)
		.slice(0, count)
		.map((entry) => ({
			...withArtwork(localizeCard(entry.movie, locale), artworks),
			watched: entry.status === 'WATCHED'
		}));
}

/** Métricas, diário recente e gêneros disponíveis para o filtro. */
export async function getDashboardOverview(userId: string, locale: Locale, fetchFn?: typeof fetch) {
	const [library, diary, recentDiary, artworks, genreNames] = await Promise.all([
		prisma.libraryEntry.findMany({
			where: { userId },
			select: {
				status: true,
				rating: true,
				isFavorite: true,
				movie: { select: { genreIds: true } }
			}
		}),
		prisma.diaryEntry.findMany({
			where: { userId },
			select: { watchedAt: true, movie: { select: { runtime: true } } }
		}),
		prisma.diaryEntry.findMany({
			where: { userId },
			orderBy: [{ watchedAt: 'desc' }, { createdAt: 'desc' }],
			take: 6,
			select: {
				id: true,
				watchedAt: true,
				rating: true,
				isRewatch: true,
				movie: { select: movieCard }
			}
		}),
		getArtworks(userId),
		getGenreNames(locale, fetchFn).catch(() => new Map<number, string>())
	]);

	const genreName = (id: number) => genreNames.get(id) ?? null;
	const stats = computeStats(
		library.map((entry) => ({
			...entry,
			genres: entry.movie.genreIds.flatMap((id) => genreName(id) ?? [])
		})),
		diary.map((entry) => ({ watchedAt: entry.watchedAt, runtime: entry.movie.runtime }))
	);

	// Gêneros presentes na biblioteca, para o filtro (valor = ID; rótulo no idioma de quem vê).
	const genres = [...new Set(library.flatMap((entry) => entry.movie.genreIds))]
		.flatMap((id) => {
			const name = genreName(id);
			return name ? [{ id, name }] : [];
		})
		.sort((a, b) => a.name.localeCompare(b.name, locale));

	return {
		stats,
		recentDiary: recentDiary.map((entry) => ({
			...entry,
			movie: withArtwork(localizeCard(entry.movie, locale), artworks)
		})),
		genres,
		isEmpty: library.length === 0
	};
}
