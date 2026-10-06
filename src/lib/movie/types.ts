import type { LibraryState } from '$lib/library/types';
import type { ListMembership } from '$lib/lists/types';
import type { TMDbMovieFull } from '$lib/tmdb/types';
import { m } from '$lib/paraglide/messages';

export interface DiarySessionRow {
	id: string;
	watchedAt: Date;
	rating: number | null;
	isRewatch: boolean;
	note: string | null;
}

/** Pôster/fundo/logo escolhidos pelo usuário; nulo = padrão do TMDb. */
export interface Artwork {
	posterPath: string | null;
	backdropPath: string | null;
	logoPath: string | null;
}

export type ArtworkKind = 'poster' | 'backdrop' | 'logo';

/** Campo de `Artwork` de cada tipo de imagem. */
export const artworkField = <K extends ArtworkKind>(kind: K) => `${kind}Path` as `${K}Path`;

export interface MovieUserData {
	library: LibraryState | null;
	sessions: DiarySessionRow[];
	artwork: Artwork | null;
	/** Listas do usuário, marcadas se já contêm o filme. */
	lists: ListMembership[];
}

/** Dados da página /movie/[id] — também usados pelo painel sobreposto (shallow routing). */
export interface MovieDetailData {
	movie: TMDbMovieFull;
	userData: MovieUserData | null;
	signedIn: boolean;
	/** País do usuário (estreia local, onde assistir). */
	region: string;
	/** Streamings que a pessoa assina (destaque em "Onde assistir"). */
	services: number[];
}

export const DETAIL_TABS = ['about', 'cast', 'reviews', 'gallery'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

/** Função: o rótulo depende do idioma de cada requisição. */
export const tabLabel = (tab: DetailTab) =>
	({ about: m.tab_about, cast: m.tab_cast, reviews: m.tab_reviews, gallery: m.tab_gallery })[tab]();
