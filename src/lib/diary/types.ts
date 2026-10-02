import type { LibraryState, MovieCard } from '$lib/library/types';

/** Uma sessão do diário com o filme e o estado atual dele na biblioteca. */
export interface DiaryLogEntry {
	id: string;
	watchedAt: Date;
	rating: number | null;
	isRewatch: boolean;
	note: string | null;
	createdAt: Date;
	movie: MovieCard;
	library: LibraryState | null;
}

export interface DiaryMonth {
	/** "2026-09" */
	key: string;
	month: number;
	entries: DiaryLogEntry[];
}

export interface DiaryYear {
	year: number;
	months: DiaryMonth[];
	count: number;
}
