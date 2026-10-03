import { yearOf } from '$lib/format';
import type { LibraryItem, LibraryState, MovieCard, PosterMovie } from './types';

/** Filme do cache local (`Movie`) → formato do card de pôster. */
export const posterFromCard = (movie: MovieCard): PosterMovie => ({
	id: movie.id,
	title: movie.title,
	originalTitle: movie.originalTitle,
	posterPath: movie.posterPath,
	logoPath: movie.logoPath,
	year: yearOf(movie.releaseDate),
	directors: movie.directors,
	countries: movie.countries,
	runtime: movie.runtime
});

export const stateFromItem = (item: LibraryItem): LibraryState => ({
	status: item.status,
	rating: item.rating,
	isFavorite: item.isFavorite,
	watchCount: item.watchCount
});
