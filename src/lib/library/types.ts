// Formatos que o servidor entrega para os componentes da área logada.

export interface MovieCard {
	id: number;
	/** Título no idioma de quem vê (ou o original, sem tradução). */
	title: string;
	/** Título original — o destaque na UI (§6.5). */
	originalTitle: string;
	posterPath: string | null;
	backdropPath: string | null;
	releaseDate: Date | null;
	runtime: number | null;
	genreIds: number[];
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

/** O que um card de pôster precisa saber do filme (vale para biblioteca e busca). */
export interface PosterMovie {
	id: number;
	title: string;
	originalTitle: string;
	posterPath: string | null;
	year: number | null;
	directors: string[];
	countries: string[];
	runtime: number | null;
}

/** Relação do usuário com o filme; `null` quando o filme não está na biblioteca. */
export interface LibraryState {
	status: 'WANT_TO_WATCH' | 'WATCHED';
	rating: number | null;
	isFavorite: boolean;
	watchCount: number;
}

export interface SearchItem {
	movie: PosterMovie;
	library: LibraryState | null;
}

export interface LibraryItem {
	status: 'WANT_TO_WATCH' | 'WATCHED';
	rating: number | null;
	isFavorite: boolean;
	/** Nº de sessões no diário. */
	watchCount: number;
	movie: MovieCard;
}
