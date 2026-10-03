import type { LibraryState, MovieCard } from '$lib/library/types';

// Listas personalizadas (earlySetup.md §3.6, §6.1.7).

export type ListKind = 'RANKED' | 'COLLECTION';

/** Card da página /lists: capa = fundo do 1º filme (com o DNA visual do dono). */
export interface ListSummary {
	id: string;
	title: string;
	description: string | null;
	kind: ListKind;
	isPublic: boolean;
	count: number;
	cover: { backdropPath: string | null; originalTitle: string } | null;
	updatedAt: Date;
}

export interface ListItem {
	position: number;
	addedAt: Date;
	movie: MovieCard;
	/** Estado na biblioteca de quem está vendo (null se não estiver logado/na biblioteca). */
	library: LibraryState | null;
}

export interface ListDetail {
	id: string;
	title: string;
	description: string | null;
	kind: ListKind;
	isPublic: boolean;
	owner: { username: string; name: string | null };
	isOwner: boolean;
	items: ListItem[];
}

/** Listas do usuário no pop-up do filme: marcada se o filme já está nela. */
export interface ListMembership {
	id: string;
	title: string;
	kind: ListKind;
	isPublic: boolean;
	count: number;
	contains: boolean;
}

/** Ordenações de uma coleção (rankings usam sempre a posição). */
export const COLLECTION_SORTS = ['added', 'release', 'title'] as const;
export type CollectionSort = (typeof COLLECTION_SORTS)[number];

// ─── Coleções do TMDb (§6.8) ─────────────────────────────────────────
// Só leitura: mostram os filmes da saga que o usuário tem na biblioteca.

export interface CollectionSummary {
	id: number;
	name: string;
	/** Filmes da coleção na biblioteca do usuário. */
	owned: number;
	/** Filmes da coleção no TMDb. */
	total: number;
	backdropPath: string | null;
}

export interface CollectionItem {
	movie: MovieCard;
	library: LibraryState;
	/** Última sessão no diário (ordenação "última vez assistido"). */
	lastWatched: Date | null;
}

export interface CollectionDetail {
	id: number;
	name: string;
	total: number;
	backdropPath: string | null;
	items: CollectionItem[];
}

export const COLLECTION_VIEWS = ['all', 'watched', 'watchlist', 'favorites'] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

/** Ordenações de uma coleção do TMDb ("saga" = ordem de lançamento). */
export const SAGA_SORTS = ['saga', 'title', 'rating', 'watched'] as const;
export type SagaSort = (typeof SAGA_SORTS)[number];
