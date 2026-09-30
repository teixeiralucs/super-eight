// Formatos que o servidor entrega para os componentes da área logada.

export interface MovieCard {
	id: number;
	title: string;
	posterPath: string | null;
	backdropPath: string | null;
	releaseDate: Date | null;
	runtime: number | null;
	genres: string[];
	directors: string[];
	countries: string[];
}

export interface DiarySession {
	id: string;
	watchedAt: Date;
	rating: number | null;
	isRewatch: boolean;
	movie: MovieCard;
}

export interface LibraryItem {
	status: 'WANT_TO_WATCH' | 'WATCHED';
	rating: number | null;
	isFavorite: boolean;
	/** Nº de sessões no diário. */
	watchCount: number;
	movie: MovieCard;
}
