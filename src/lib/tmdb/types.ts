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
