import type { LibraryState } from '$lib/library/types';
import type { TMDbMovieFull } from '$lib/tmdb/types';
import { m } from '$lib/paraglide/messages';

export interface DiarySessionRow {
	id: string;
	watchedAt: Date;
	rating: number | null;
	isRewatch: boolean;
	note: string | null;
}

/** Pôster/fundo escolhidos pelo usuário; nulo = padrão do TMDb. */
export interface Artwork {
	posterPath: string | null;
	backdropPath: string | null;
}

export type ArtworkKind = 'poster' | 'backdrop';

export interface MovieUserData {
	library: LibraryState | null;
	sessions: DiarySessionRow[];
	artwork: Artwork | null;
}

/** Dados da página /movie/[id] — também usados pelo painel sobreposto (shallow routing). */
export interface MovieDetailData {
	movie: TMDbMovieFull;
	userData: MovieUserData | null;
	signedIn: boolean;
	/** País do usuário (estreia local). */
	region: string;
}

export const DETAIL_TABS = ['about', 'cast', 'gallery'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

/** Função: o rótulo depende do idioma de cada requisição. */
export const tabLabel = (tab: DetailTab) =>
	({ about: m.tab_about, cast: m.tab_cast, gallery: m.tab_gallery })[tab]();
