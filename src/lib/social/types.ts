import type { LibraryState, MovieCard } from '$lib/library/types';
import type { ListSummary } from '$lib/lists/types';

// Comunidade (earlySetup.md §6.6).

export interface UserChip {
	username: string;
	name: string | null;
	avatarUrl: string | null;
}

export interface ReviewView {
	id: string;
	content: string;
	containsSpoilers: boolean;
	createdAt: Date;
	updatedAt: Date;
	author: UserChip;
	/** Nota atual do autor para o filme (biblioteca), se houver. */
	rating: number | null;
	likeCount: number;
	commentCount: number;
	likedByMe: boolean;
	isMine: boolean;
	/** Quem está vendo segue o autor. */
	followed: boolean;
}

export interface CommentView {
	id: string;
	content: string;
	createdAt: Date;
	author: UserChip;
	/** Quem está vendo pode apagar (autor do comentário ou da review). */
	canDelete: boolean;
}

export interface MovieReviews {
	mine: ReviewView | null;
	others: ReviewView[];
}

export interface ProfileStats {
	watched: number;
	reviews: number;
	lists: number;
	followers: number;
	following: number;
}

export interface ProfileSession {
	id: string;
	watchedAt: Date;
	rating: number | null;
	isRewatch: boolean;
	movie: MovieCard;
}

export interface ProfileReview {
	review: Omit<ReviewView, 'author' | 'followed'>;
	movie: MovieCard;
}

export interface ProfileData {
	user: UserChip & { bio: string | null; isPrivate: boolean; createdAt: Date };
	isMe: boolean;
	/** Quem está vendo segue este perfil. */
	isFollowing: boolean;
	stats: ProfileStats;
	/** Perfil privado (de outra pessoa): só nome e listas públicas. */
	restricted: boolean;
	favorites: { movie: MovieCard; library: LibraryState | null }[];
	recentSessions: ProfileSession[];
	reviews: ProfileReview[];
	lists: ListSummary[];
}

/**
 * Evento do feed (§6.6.3): sessão assistida, review ou lista pública nova de quem se segue.
 * `at` ordena e agrupa por dia (sessão: dia assistido; review/lista: quando foi criada).
 */
export type FeedItem =
	| {
			kind: 'session';
			id: string;
			at: Date;
			createdAt: Date;
			rating: number | null;
			isRewatch: boolean;
			author: UserChip;
			movie: MovieCard;
	  }
	| {
			kind: 'review';
			id: string;
			at: Date;
			createdAt: Date;
			/** Nota atual do autor para o filme. */
			rating: number | null;
			content: string;
			containsSpoilers: boolean;
			author: UserChip;
			movie: MovieCard;
	  }
	| {
			kind: 'list';
			id: string;
			at: Date;
			createdAt: Date;
			author: UserChip;
			list: ListSummary;
	  };

export type FeedKind = FeedItem['kind'];

/** Pessoa sugerida para seguir, com o motivo. */
export interface PersonSuggestion {
	user: UserChip;
	reason:
		| { kind: 'taste'; shared: number }
		| { kind: 'network'; via: string; count: number }
		| { kind: 'popular'; followers: number };
}

export interface PersonResult extends UserChip {
	bio: string | null;
	followers: number;
	isFollowing: boolean;
	isMe: boolean;
}
