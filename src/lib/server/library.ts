import { prisma } from '$lib/server/db';
import type { Prisma } from '$lib/server/generated/prisma/client';
import {
	foldText,
	type LibraryFilterOptions,
	type LibraryFilters,
	type LibraryView
} from '$lib/library/filters';
import { shuffle } from '$lib/library/shuffle';
import { computeStats } from '$lib/library/stats';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { localizeCard, movieCardSelect, type MovieCardRow } from '$lib/server/movie-locale';
import { getGenreNames } from '$lib/server/tmdb';
import { getStreamingServices, libraryProviders } from '$lib/server/watch';
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

/** Filtros que viram consulta ao banco (a busca por texto é feita depois, sem acentos). */
async function movieFilters(
	userId: string,
	filters: LibraryFilters,
	region: string
): Promise<Prisma.MovieWhereInput[]> {
	const where: Prisma.MovieWhereInput[] = [];
	if (filters.genre) where.push({ genreIds: { has: Number(filters.genre) } });
	if (filters.decade) {
		const from = Number(filters.decade);
		where.push({
			releaseDate: { gte: new Date(Date.UTC(from, 0, 1)), lt: new Date(Date.UTC(from + 10, 0, 1)) }
		});
	}
	if (filters.country) where.push({ countries: { has: filters.country } });
	if (filters.lang) where.push({ originalLanguage: filters.lang });
	if (filters.year) {
		const year = Number(filters.year);
		where.push({
			diaryEntries: {
				some: {
					userId,
					watchedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
				}
			}
		});
	}
	if (filters.stream) {
		const ids =
			filters.stream === 'mine' ? await getStreamingServices(userId) : [Number(filters.stream)];
		where.push({
			watch: {
				some: { region, OR: [{ flatrate: { hasSome: ids } }, { free: { hasSome: ids } }] }
			}
		});
	}
	return where;
}

/** O filme bate com a busca? Título original, traduções ou diretor, sem acento nem caixa. */
function matchesQuery(movie: MovieCardRow, query: string) {
	const needle = foldText(query);
	return [
		movie.originalTitle,
		movie.titlePt,
		movie.titleEn,
		movie.titleEs,
		...movie.directors
	].some((text) => text && foldText(text).includes(needle));
}

/**
 * Grade da biblioteca com filtros da URL e nº de sessões por filme. `movieWhere` restringe aos
 * filmes de uma pessoa, país, estúdio… (páginas filtradas, §6.10). As contagens das abas
 * respeitam os demais filtros (busca, gênero, década…).
 */
export async function getLibraryGrid(
	userId: string,
	filters: LibraryFilters,
	{ locale, region }: { locale: Locale; region: string },
	movieWhere: Prisma.MovieWhereInput = {}
) {
	const where: Prisma.LibraryEntryWhereInput = {
		userId,
		movie: { AND: [movieWhere, ...(await movieFilters(userId, filters, region))] }
	};
	if (filters.rating === 'none') where.rating = null;
	else if (filters.rating) where.rating = { gte: Number(filters.rating) };

	const [rows, sessions, artworks] = await Promise.all([
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

	const entries = filters.q ? rows.filter((row) => matchesQuery(row.movie, filters.q!)) : rows;
	const counts = {
		all: entries.length,
		watched: entries.filter((entry) => entry.status === 'WATCHED').length,
		watchlist: entries.filter((entry) => entry.status === 'WANT_TO_WATCH').length,
		favorites: entries.filter((entry) => entry.isFavorite).length
	} satisfies Record<LibraryView, number>;
	const inView = entries.filter(
		(entry) =>
			filters.view === 'all' ||
			(filters.view === 'watched' && entry.status === 'WATCHED') ||
			(filters.view === 'watchlist' && entry.status === 'WANT_TO_WATCH') ||
			(filters.view === 'favorites' && entry.isFavorite)
	);

	const watchCounts = new Map(sessions.map((row) => [row.movieId, row._count._all]));
	const items = inView.map((entry) => ({
		...entry,
		movie: withArtwork(localizeCard(entry.movie, locale), artworks),
		watchCount: watchCounts.get(entry.movie.id) ?? 0
	}));
	return { items: filters.sort === 'random' ? shuffle(items) : items, counts };
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
export async function getDashboardOverview(
	userId: string,
	{ locale, region }: { locale: Locale; region: string },
	fetchFn?: typeof fetch
) {
	const [library, diary, recentDiary, artworks, genreNames, providers, services] =
		await Promise.all([
			prisma.libraryEntry.findMany({
				where: { userId },
				select: {
					status: true,
					rating: true,
					isFavorite: true,
					movie: {
						select: { genreIds: true, countries: true, originalLanguage: true, releaseDate: true }
					}
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
			getGenreNames(locale, fetchFn).catch(() => new Map<number, string>()),
			libraryProviders(userId, region),
			getStreamingServices(userId)
		]);

	const genreName = (id: number) => genreNames.get(id) ?? null;
	const stats = computeStats(
		library.map((entry) => ({
			...entry,
			genres: entry.movie.genreIds.flatMap((id) => genreName(id) ?? [])
		})),
		diary.map((entry) => ({ watchedAt: entry.watchedAt, runtime: entry.movie.runtime }))
	);

	// Valores presentes na biblioteca, para o painel de filtros (rótulos traduzidos na UI).
	const genres = [...new Set(library.flatMap((entry) => entry.movie.genreIds))]
		.flatMap((id) => {
			const name = genreName(id);
			return name ? [{ id, name }] : [];
		})
		.sort((a, b) => a.name.localeCompare(b.name, locale));
	const distinct = <T>(values: T[]) => [...new Set(values)];
	const options: LibraryFilterOptions = {
		genres,
		decades: distinct(
			library.flatMap(({ movie }) =>
				movie.releaseDate ? [Math.floor(movie.releaseDate.getUTCFullYear() / 10) * 10] : []
			)
		).sort((a, b) => b - a),
		countries: distinct(library.flatMap(({ movie }) => movie.countries)),
		languages: distinct(library.flatMap(({ movie }) => movie.originalLanguage ?? [])),
		years: distinct(diary.map((entry) => entry.watchedAt.getUTCFullYear())).sort((a, b) => b - a),
		providers,
		hasServices: services.length > 0
	};

	return {
		stats,
		recentDiary: recentDiary.map((entry) => ({
			...entry,
			movie: withArtwork(localizeCard(entry.movie, locale), artworks)
		})),
		options,
		isEmpty: library.length === 0
	};
}
