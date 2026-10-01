import { prisma } from '$lib/server/db';
import type { Prisma } from '$lib/server/generated/prisma/client';
import type { LibraryFilters } from '$lib/library/filters';
import { shuffle } from '$lib/library/shuffle';
import { computeStats } from '$lib/library/stats';
import { getArtworks, withArtwork } from '$lib/server/artwork';

const movieCard = {
	id: true,
	title: true,
	posterPath: true,
	backdropPath: true,
	releaseDate: true,
	runtime: true,
	genres: true,
	directors: true,
	countries: true
} satisfies Prisma.MovieSelect;

type Ordering = Prisma.LibraryEntryOrderByWithRelationInput[];

/** Ordenação no banco; `random` é embaralhado depois da consulta. Nulos sempre no fim. */
function orderBy({ sort, dir }: LibraryFilters): Ordering {
	switch (sort) {
		case 'recent':
			return [{ addedAt: dir }];
		case 'rating':
			return [{ rating: { sort: dir, nulls: 'last' } }, { movie: { title: 'asc' } }];
		case 'title':
			return [{ movie: { title: dir } }];
		case 'release':
			return [
				{ movie: { releaseDate: { sort: dir, nulls: 'last' } } },
				{ movie: { title: 'asc' } }
			];
		case 'random':
			return [];
	}
}

/** Grade da biblioteca (lista principal) com filtros da URL e nº de sessões por filme. */
export async function getLibraryGrid(userId: string, filters: LibraryFilters) {
	const where: Prisma.LibraryEntryWhereInput = { userId };
	if (filters.view === 'watched') where.status = 'WATCHED';
	if (filters.view === 'watchlist') where.status = 'WANT_TO_WATCH';
	if (filters.view === 'favorites') where.isFavorite = true;
	if (filters.genre) where.movie = { genres: { has: filters.genre } };

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
		movie: withArtwork(entry.movie, artworks),
		watchCount: watchCounts.get(entry.movie.id) ?? 0
	}));
	return filters.sort === 'random' ? shuffle(items) : items;
}

/** Filmes aleatórios da própria biblioteca (assistidos ou não) para o carrossel. */
export async function getLibrarySuggestions(userId: string, count = 8) {
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
			...withArtwork(entry.movie, artworks),
			watched: entry.status === 'WATCHED'
		}));
}

/** Métricas, diário recente e gêneros disponíveis para o filtro. */
export async function getDashboardOverview(userId: string) {
	const [library, diary, recentDiary, artworks] = await Promise.all([
		prisma.libraryEntry.findMany({
			where: { userId },
			select: { status: true, rating: true, isFavorite: true, movie: { select: { genres: true } } }
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
		getArtworks(userId)
	]);

	const stats = computeStats(
		library.map((entry) => ({ ...entry, genres: entry.movie.genres })),
		diary.map((entry) => ({ watchedAt: entry.watchedAt, runtime: entry.movie.runtime }))
	);

	const genres = [...new Set(library.flatMap((entry) => entry.movie.genres))].sort((a, b) =>
		a.localeCompare(b, 'pt-BR')
	);

	return {
		stats,
		recentDiary: recentDiary.map((entry) => ({
			...entry,
			movie: withArtwork(entry.movie, artworks)
		})),
		genres,
		isEmpty: library.length === 0
	};
}
