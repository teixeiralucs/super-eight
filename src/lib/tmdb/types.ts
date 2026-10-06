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

export interface CrewMember {
	id: number;
	name: string;
	/** Função já traduzida (ex.: "Roteiro, História"). */
	job: string;
	profilePath: string | null;
}

export interface MovieImage {
	path: string;
	/** ISO 639-1 do texto na imagem; `null` = sem texto. */
	language: string | null;
}

export interface MovieImages {
	backdrops: MovieImage[];
	posters: MovieImage[];
	/** Logos do título (PNG transparente ou SVG). */
	logos: MovieImage[];
}

export interface Trailer {
	/** ID do vídeo no YouTube. */
	key: string;
	name: string;
}

/** Tudo que a página de detalhes precisa (earlySetup.md §4.2.2), no idioma de quem vê. */
export interface TMDbMovieFull extends TMDbMovie {
	originalLanguage: string | null;
	runtime: number | null;
	/** Nomes de quem dirigiu (pode haver mais de um). */
	directors: string[];
	/** Códigos ISO 3166-1 (ex.: "US", "BR"); o nome é traduzido na UI. */
	countries: string[];
	tagline: string | null;
	voteCount: number;
	/** Estreia na região do usuário (YYYY-MM-DD), se o TMDb tiver. */
	regionalRelease: string | null;
	directing: CrewMember[];
	writing: CrewMember[];
	/** IDs de gênero (os nomes traduzidos estão em `genres`, na mesma ordem). */
	genreIds: number[];
	composers: { id: number; name: string }[];
	/** Produtoras (até 3). */
	studios: { id: number; name: string }[];
	cast: CastMember[];
	trailer: Trailer | null;
	/** Logo padrão do título; nulo = sem logo (o título vai em texto). */
	logoPath: string | null;
	/** Coleção (saga) do TMDb, com o nome no idioma de quem vê. */
	collection: { id: number; name: string } | null;
}

export type Localized<T> = { pt: T; en: T; es: T };

/** Dados do filme independentes de idioma, para o cache local `Movie` (§3.3). */
export interface MovieCacheData {
	id: number;
	originalTitle: string;
	originalLanguage: string | null;
	/** Título traduzido por idioma; nulo = sem tradução ou igual ao original. */
	titles: Localized<string | null>;
	posters: Localized<string | null>;
	backdropPath: string | null;
	releaseDate: string | null;
	year: number | null;
	runtime: number | null;
	genreIds: number[];
	directors: string[];
	countries: string[];
	voteAverage: number;
	/** Coleção (saga) do TMDb; nula = nenhuma. */
	collectionId: number | null;
	/** ID do IMDb (ex.: "tt0114709"), para o Trakt. */
	imdbId: string | null;
	/** IDs do TMDb de quem fez o filme (filtros da biblioteca, §6.10). */
	credits: {
		directorIds: number[];
		writerIds: number[];
		castIds: number[];
		composerIds: number[];
		studioIds: number[];
	};
}

/** Coleção do TMDb para o cache `Collection`. */
export interface CollectionData {
	id: number;
	/** Nome por idioma; pt/es nulos = sem tradução (a UI cai no inglês). */
	names: { pt: string | null; en: string; es: string | null };
	posterPath: string | null;
	backdropPath: string | null;
	/** Todos os filmes, por lançamento. */
	partIds: number[];
	parts: CollectionPart[];
}

/** Filme de uma coleção (mesma ordem de `partIds`), para mostrar os que o usuário não tem. */
// `type` (não `interface`): o Prisma aceita como JSON.
export type CollectionPart = {
	id: number;
	originalTitle: string;
	/** Título por idioma; nulo = igual ao original. */
	titles: Localized<string | null>;
	posters: Localized<string | null>;
	/** YYYY-MM-DD; nulo = sem data (anunciado). */
	releaseDate: string | null;
};
