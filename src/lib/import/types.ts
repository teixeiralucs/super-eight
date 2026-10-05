// Formatos do importador (Letterboxd e backup do Super Eight), compartilhados entre o
// navegador (que lê o arquivo) e o servidor (que encontra os filmes no TMDb e grava).

export interface ImportSession {
	/** YYYY-MM-DD. */
	date: string;
	/** 1–10 (Letterboxd 0,5–5 × 2). */
	rating: number | null;
	rewatch: boolean;
	note: string | null;
}

/** Tudo que o export diz sobre um filme (chave: nome + ano, ou o ID do TMDb no backup). */
export interface ImportFilm {
	key: string;
	/** Já conhecido (backup do Super Eight): não precisa procurar no TMDb. */
	tmdbId?: number;
	name: string;
	year: number | null;
	sessions: ImportSession[];
	/** Nota atual (ratings.csv). */
	rating: number | null;
	liked: boolean;
	watchlist: boolean;
	/** Review mais recente. */
	review: { text: string; date: string; spoilers?: boolean } | null;
	/** Pôster/fundo/logo escolhidos na Galeria (só no backup). */
	artwork?: {
		posterPath: string | null;
		backdropPath: string | null;
		logoPath: string | null;
	} | null;
}

export interface ImportList {
	title: string;
	description: string | null;
	/** Só no backup; no Letterboxd as listas entram livres e privadas. */
	kind?: 'RANKED' | 'COLLECTION';
	isPublic?: boolean;
	/** Chaves dos filmes, na ordem da lista. */
	films: string[];
}

export interface LetterboxdExport {
	films: ImportFilm[];
	lists: ImportList[];
	/** Só no backup. */
	hiddenCollections?: { source: 'tmdb' | 'trakt'; id: number }[];
}

/** Resultado de um lote gravado (somado no navegador). */
export interface ImportStats {
	films: number;
	sessions: number;
	watchlist: number;
	favorites: number;
	reviews: number;
	lists: number;
}
