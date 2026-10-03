// Formatos do importador do Letterboxd, compartilhados entre o navegador (que lê o .zip) e
// o servidor (que encontra os filmes no TMDb e grava).

export interface ImportSession {
	/** YYYY-MM-DD. */
	date: string;
	/** 1–10 (Letterboxd 0,5–5 × 2). */
	rating: number | null;
	rewatch: boolean;
	note: string | null;
}

/** Tudo que o export diz sobre um filme (chave: nome + ano). */
export interface ImportFilm {
	key: string;
	name: string;
	year: number | null;
	sessions: ImportSession[];
	/** Nota atual (ratings.csv). */
	rating: number | null;
	liked: boolean;
	watchlist: boolean;
	/** Review mais recente. */
	review: { text: string; date: string } | null;
}

export interface ImportList {
	title: string;
	description: string | null;
	/** Chaves dos filmes, na ordem da lista. */
	films: string[];
}

export interface LetterboxdExport {
	films: ImportFilm[];
	lists: ImportList[];
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
