import type { LibraryState } from '$lib/library/types';
import type { TMDbMovieFull } from '$lib/tmdb/types';

export interface DiarySessionRow {
	id: string;
	watchedAt: Date;
	rating: number | null;
	isRewatch: boolean;
	note: string | null;
}

export interface MovieUserData {
	library: LibraryState | null;
	sessions: DiarySessionRow[];
}

/** Dados da página /movie/[id] — também usados pelo painel sobreposto (shallow routing). */
export interface MovieDetailData {
	movie: TMDbMovieFull;
	userData: MovieUserData | null;
	signedIn: boolean;
}

export const DETAIL_TABS = ['about', 'cast', 'gallery', 'diary'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

export const TAB_LABELS: Record<DetailTab, string> = {
	about: 'Sobre',
	cast: 'Elenco',
	gallery: 'Galeria',
	diary: 'Diário'
};
