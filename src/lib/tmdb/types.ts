// Formatos já normalizados que a aplicação usa (earlySetup.md §4.3.1).
// Campos crus do TMDb que não usamos são descartados em src/lib/server/tmdb.ts.

export interface TMDbMovie {
	id: number;
	title: string;
	originalTitle: string;
	overview: string;
	posterPath: string | null;
	backdropPath: string | null;
	releaseDate: string | null;
	year: number | null;
	voteAverage: number;
	genres: string[];
}

export interface TMDbMovieDetails extends TMDbMovie {
	runtime: number | null;
	/** Nomes de quem dirigiu (pode haver mais de um). */
	directors: string[];
	/** Códigos ISO 3166-1 (ex.: "US", "BR"); o nome é traduzido na UI. */
	countries: string[];
}
