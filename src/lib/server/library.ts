import { prisma } from '$lib/server/db';
import type { Prisma } from '$lib/server/generated/prisma/client';
import type { LibraryFilters } from '$lib/library/filters';
import { computeStats } from '$lib/library/stats';

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

const ORDER_BY: Record<LibraryFilters['sort'], Prisma.LibraryEntryOrderByWithRelationInput[]> = {
	recent: [{ updatedAt: 'desc' }],
	rating: [{ rating: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
	release: [{ movie: { releaseDate: { sort: 'desc', nulls: 'last' } } }],
	title: [{ movie: { title: 'asc' } }]
};

/** Grade da biblioteca (lista principal) com filtros da URL e nº de sessões por filme. */
export async function getLibraryGrid(userId: string, filters: LibraryFilters) {
	const where: Prisma.LibraryEntryWhereInput = { userId };
	if (filters.view === 'watched') where.status = 'WATCHED';
	if (filters.view === 'watchlist') where.status = 'WANT_TO_WATCH';
	if (filters.view === 'favorites') where.isFavorite = true;
	if (filters.genre) where.movie = { genres: { has: filters.genre } };

	const [entries, sessions] = await Promise.all([
		prisma.libraryEntry.findMany({
			where,
			orderBy: ORDER_BY[filters.sort],
			select: {
				status: true,
				rating: true,
				isFavorite: true,
				movie: { select: movieCard }
			}
		}),
		prisma.diaryEntry.groupBy({ by: ['movieId'], where: { userId }, _count: { _all: true } })
	]);

	const watchCounts = new Map(sessions.map((row) => [row.movieId, row._count._all]));
	return entries.map((entry) => ({ ...entry, watchCount: watchCounts.get(entry.movie.id) ?? 0 }));
}

/** Métricas, diário recente e gêneros disponíveis para o filtro. */
export async function getDashboardOverview(userId: string) {
	const [library, diary, recentDiary] = await Promise.all([
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
		})
	]);

	const stats = computeStats(
		library.map((entry) => ({ ...entry, genres: entry.movie.genres })),
		diary.map((entry) => ({ watchedAt: entry.watchedAt, runtime: entry.movie.runtime }))
	);

	const genres = [...new Set(library.flatMap((entry) => entry.movie.genres))].sort((a, b) =>
		a.localeCompare(b, 'pt-BR')
	);

	return { stats, recentDiary, genres, isEmpty: library.length === 0 };
}
