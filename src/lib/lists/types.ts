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
