import { prisma } from '$lib/server/db';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { getMovieCacheData, getMoviePage, type TmdbContext } from '$lib/server/tmdb';
import type { Artwork } from '$lib/movie/types';
import type { LibraryState, SearchItem } from '$lib/library/types';

export interface SearchPage {
	items: SearchItem[];
	page: number;
	totalPages: number;
}

/**
 * Uma página da busca (ou dos filmes em alta, sem termo), enriquecida com
 * direção/país/duração (detalhes do TMDb, em cache) e o estado na biblioteca do usuário.
 */
export async function searchPage(
	userId: string | null,
	query: string,
	page: number,
	ctx: TmdbContext
): Promise<SearchPage> {
	const result = await getMoviePage(query, page, ctx);
	const ids = result.results.map((movie) => movie.id);

	const [details, library, artworks] = await Promise.all([
		Promise.all(ids.map((id) => getMovieCacheData(id, ctx.fetch).catch(() => null))),
		userId ? getLibraryStates(userId, ids) : new Map<number, LibraryState>(),
		userId ? getArtworks(userId, ids) : new Map<number, Artwork>()
	]);

	return {
		page: result.page,
		totalPages: result.totalPages,
		items: result.results.map((movie, i) => ({
			movie: withArtwork(
				{
					id: movie.id,
					title: movie.title,
					originalTitle: movie.originalTitle,
					posterPath: movie.posterPath,
					year: movie.year,
					directors: details[i]?.directors ?? [],
					countries: details[i]?.countries ?? [],
					runtime: details[i]?.runtime ?? null
				},
				artworks
			),
			library: library.get(movie.id) ?? null
		}))
	};
}

/** Estado na biblioteca (status, nota, favorito, nº de sessões) para um conjunto de filmes. */
export async function getLibraryStates(userId: string, movieIds: number[]) {
	if (!movieIds.length) return new Map<number, LibraryState>();

	const [entries, sessions] = await Promise.all([
		prisma.libraryEntry.findMany({
			where: { userId, movieId: { in: movieIds } },
			select: { movieId: true, status: true, rating: true, isFavorite: true }
		}),
		prisma.diaryEntry.groupBy({
			by: ['movieId'],
			where: { userId, movieId: { in: movieIds } },
			_count: { _all: true }
		})
	]);

	const counts = new Map(sessions.map((row) => [row.movieId, row._count._all]));
	return new Map<number, LibraryState>(
		entries.map(({ movieId, ...state }) => [
			movieId,
			{ ...state, watchCount: counts.get(movieId) ?? 0 }
		])
	);
}
