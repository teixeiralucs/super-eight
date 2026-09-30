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

export interface CastMember {
	id: number;
	name: string;
	character: string;
	profilePath: string | null;
}

export interface Trailer {
	/** ID do vídeo no YouTube. */
	key: string;
	name: string;
}

/** Tudo que a página de detalhes precisa (earlySetup.md §4.2.2). */
export interface TMDbMovieFull extends TMDbMovieDetails {
	tagline: string | null;
	posterPath: string | null;
	writers: string[];
	composers: string[];
	cast: CastMember[];
	trailer: Trailer | null;
	/** Caminhos de backdrops sem texto, para a galeria. */
	gallery: string[];
	voteCount: number;
}

export interface TMDbMovieDetails extends TMDbMovie {
	runtime: number | null;
	/** Nomes de quem dirigiu (pode haver mais de um). */
	directors: string[];
	/** Códigos ISO 3166-1 (ex.: "US", "BR"); o nome é traduzido na UI. */
	countries: string[];
}
