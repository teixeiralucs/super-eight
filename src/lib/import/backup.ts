import type { ImportFilm, ImportList, LetterboxdExport } from './types';

/**
 * Backup completo do Super Eight (earlySetup.md §6.9): gerado em Configurações → Exportar e
 * restaurável pela página de importação. Versionado: versões futuras continuam lendo esta.
 */
export const BACKUP_FORMAT = 'super-eight-backup';
export const BACKUP_VERSION = 1;

export interface BackupFilm {
	tmdbId: number;
	/** Título original e ano: só para leitura humana (o filme é identificado pelo `tmdbId`). */
	title: string;
	year: number | null;
	/** Nulo = fora da biblioteca (só sessões antigas, review ou imagens escolhidas). */
	status: 'WANT_TO_WATCH' | 'WATCHED' | null;
	/** 1–10. */
	rating: number | null;
	isFavorite: boolean;
	addedAt: string | null;
	sessions: { date: string; rating: number | null; rewatch: boolean; note: string | null }[];
	review: { content: string; containsSpoilers: boolean; createdAt: string } | null;
	artwork: {
		posterPath: string | null;
		backdropPath: string | null;
		logoPath: string | null;
	} | null;
}

export interface Backup {
	format: typeof BACKUP_FORMAT;
	version: number;
	exportedAt: string;
	profile: {
		username: string;
		name: string | null;
		bio: string | null;
		locale: string | null;
		region: string | null;
		isPrivate: boolean;
	};
	films: BackupFilm[];
	lists: {
		title: string;
		description: string | null;
		kind: 'RANKED' | 'COLLECTION';
		isPublic: boolean;
		createdAt: string;
		items: { tmdbId: number; title: string; year: number | null; note: string | null }[];
	}[];
	hiddenCollections: { source: 'tmdb' | 'trakt'; id: number }[];
}

export const isBackup = (value: unknown): value is Backup =>
	typeof value === 'object' &&
	value !== null &&
	(value as Backup).format === BACKUP_FORMAT &&
	typeof (value as Backup).version === 'number' &&
	Array.isArray((value as Backup).films);

const key = (tmdbId: number) => `tmdb:${tmdbId}`;

/**
 * Backup → mesmo formato do importador do Letterboxd, já com o ID do TMDb (não precisa
 * procurar os filmes) e com o que só o Super Eight tem: imagens escolhidas, spoiler, tipo e
 * visibilidade das listas e coleções ocultas.
 */
export function backupToImport(backup: Backup): LetterboxdExport {
	const films: ImportFilm[] = backup.films.map((film) => ({
		key: key(film.tmdbId),
		tmdbId: film.tmdbId,
		name: film.title,
		year: film.year,
		sessions: film.sessions.map((session) => ({
			date: session.date,
			rating: session.rating,
			rewatch: session.rewatch,
			note: session.note
		})),
		rating: film.rating,
		liked: film.isFavorite,
		watchlist: film.status === 'WANT_TO_WATCH',
		review: film.review
			? {
					text: film.review.content,
					date: film.review.createdAt.slice(0, 10),
					spoilers: film.review.containsSpoilers
				}
			: null,
		artwork: film.artwork
	}));

	// Filmes que só aparecem em listas também precisam de chave.
	const known = new Set(films.map((film) => film.key));
	for (const list of backup.lists ?? []) {
		for (const item of list.items) {
			if (known.has(key(item.tmdbId))) continue;
			known.add(key(item.tmdbId));
			films.push({
				key: key(item.tmdbId),
				tmdbId: item.tmdbId,
				name: item.title,
				year: item.year,
				sessions: [],
				rating: null,
				liked: false,
				watchlist: false,
				review: null
			});
		}
	}

	const lists: ImportList[] = (backup.lists ?? []).map((list) => ({
		title: list.title,
		description: list.description,
		kind: list.kind,
		isPublic: list.isPublic,
		films: list.items.map((item) => key(item.tmdbId))
	}));

	return { films, lists, hiddenCollections: backup.hiddenCollections ?? [] };
}
