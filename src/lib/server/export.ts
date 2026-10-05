import { strToU8, zipSync } from 'fflate';
import { prisma } from '$lib/server/db';
import { BACKUP_FORMAT, BACKUP_VERSION, type Backup, type BackupFilm } from '$lib/import/backup';

/**
 * Exportação dos dados do usuário (earlySetup.md §6.9): backup completo em JSON (restaurável
 * pela página de importação) e CSVs compatíveis com o importador do Letterboxd.
 */

const iso = (date: Date) => date.toISOString();
const day = (date: Date) => date.toISOString().slice(0, 10);
const yearOf = (date: Date | null) => (date ? date.getUTCFullYear() : null);

/** Tudo que é do usuário, com o filme identificado pelo ID do TMDb (título e ano para leitura). */
export async function buildBackup(userId: string): Promise<Backup> {
	const movie = { select: { id: true, originalTitle: true, titleEn: true, releaseDate: true } };
	const [user, library, sessions, reviews, artworks, lists, hidden] = await Promise.all([
		prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: {
				username: true,
				name: true,
				bio: true,
				locale: true,
				region: true,
				isPrivate: true
			}
		}),
		prisma.libraryEntry.findMany({
			where: { userId },
			select: {
				status: true,
				rating: true,
				isFavorite: true,
				addedAt: true,
				movie
			}
		}),
		prisma.diaryEntry.findMany({
			where: { userId },
			orderBy: [{ watchedAt: 'asc' }, { createdAt: 'asc' }],
			select: { watchedAt: true, rating: true, isRewatch: true, note: true, movie }
		}),
		prisma.review.findMany({
			where: { userId },
			select: { content: true, containsSpoilers: true, createdAt: true, movie }
		}),
		prisma.movieArtwork.findMany({
			where: { userId },
			select: { posterPath: true, backdropPath: true, logoPath: true, movie }
		}),
		prisma.list.findMany({
			where: { userId },
			orderBy: { createdAt: 'asc' },
			select: {
				title: true,
				description: true,
				kind: true,
				isPublic: true,
				createdAt: true,
				items: { orderBy: { position: 'asc' }, select: { note: true, movie } }
			}
		}),
		prisma.hiddenCollection.findMany({
			where: { userId },
			select: { source: true, collectionId: true }
		})
	]);

	// Um registro por filme que tenha qualquer coisa do usuário.
	const films = new Map<number, BackupFilm>();
	const film = (m: {
		id: number;
		originalTitle: string | null;
		titleEn: string | null;
		releaseDate: Date | null;
	}) => {
		let entry = films.get(m.id);
		if (!entry) {
			entry = {
				tmdbId: m.id,
				title: m.originalTitle ?? m.titleEn ?? '',
				year: yearOf(m.releaseDate),
				status: null,
				rating: null,
				isFavorite: false,
				addedAt: null,
				sessions: [],
				review: null,
				artwork: null
			};
			films.set(m.id, entry);
		}
		return entry;
	};

	for (const row of library) {
		Object.assign(film(row.movie), {
			status: row.status,
			rating: row.rating,
			isFavorite: row.isFavorite,
			addedAt: iso(row.addedAt)
		});
	}
	for (const row of sessions) {
		film(row.movie).sessions.push({
			date: day(row.watchedAt),
			rating: row.rating,
			rewatch: row.isRewatch,
			note: row.note
		});
	}
	for (const row of reviews) {
		film(row.movie).review = {
			content: row.content,
			containsSpoilers: row.containsSpoilers,
			createdAt: iso(row.createdAt)
		};
	}
	for (const row of artworks) {
		film(row.movie).artwork = {
			posterPath: row.posterPath,
			backdropPath: row.backdropPath,
			logoPath: row.logoPath
		};
	}

	return {
		format: BACKUP_FORMAT,
		version: BACKUP_VERSION,
		exportedAt: iso(new Date()),
		profile: user,
		films: [...films.values()].sort((a, b) => a.title.localeCompare(b.title)),
		lists: lists.map((list) => ({
			title: list.title,
			description: list.description,
			kind: list.kind,
			isPublic: list.isPublic,
			createdAt: iso(list.createdAt),
			items: list.items.map((item) => ({
				tmdbId: item.movie.id,
				title: item.movie.originalTitle ?? item.movie.titleEn ?? '',
				year: yearOf(item.movie.releaseDate),
				note: item.note
			}))
		})),
		hiddenCollections: hidden.map((row) => ({
			source: row.source === 'TRAKT' ? 'trakt' : 'tmdb',
			id: row.collectionId
		}))
	};
}

// ─── CSV (formato aceito pelo importador do Letterboxd) ──────────────

/** Campo CSV (RFC 4180): aspas quando há vírgula, aspas ou quebra de linha. */
const cell = (value: string | number | null | undefined) => {
	const text = value === null || value === undefined ? '' : String(value);
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = (header: string[], rows: (string | number | null | undefined)[][]) =>
	// BOM: o Excel abre acentos certo.
	'﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';

/** 1–10 → estrelas do Letterboxd (0,5–5). */
const stars = (rating: number | null) => (rating ? rating / 2 : null);

const slug = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 60) || 'lista';

const README = `Super Eight — exportação em CSV

Arquivos no formato aceito pelo importador do Letterboxd (letterboxd.com/import),
identificados pelo ID do TMDb (coluna tmdbID):

- diary.csv      uma linha por sessão do diário (data, nota, rewatch, anotação)
- ratings.csv    nota atual e favorito de cada filme assistido
- watchlist.csv  filmes em "Quero ver" (importe em letterboxd.com/watchlist)
- reviews.csv    suas reviews
- lists/*.csv    uma lista por arquivo, na ordem

Notas: o Super Eight usa 1–10; a coluna Rating tem a metade (estrelas de 0,5 a 5) e Rating10 o valor original.
Para um backup completo (que volta para o Super Eight), use a exportação em JSON.
`;

export function buildCsvZip(backup: Backup) {
	const watched = backup.films.filter((film) => film.status === 'WATCHED');
	const files: Record<string, Uint8Array> = {
		'README.txt': strToU8(README),
		'diary.csv': strToU8(
			csv(
				['tmdbID', 'Title', 'Year', 'WatchedDate', 'Rating', 'Rating10', 'Rewatch', 'Review'],
				backup.films.flatMap((film) =>
					film.sessions.map((session) => [
						film.tmdbId,
						film.title,
						film.year,
						session.date,
						stars(session.rating),
						session.rating,
						session.rewatch ? 'Yes' : '',
						session.note
					])
				)
			)
		),
		'ratings.csv': strToU8(
			csv(
				['tmdbID', 'Title', 'Year', 'Rating', 'Rating10', 'Favorite'],
				watched.map((film) => [
					film.tmdbId,
					film.title,
					film.year,
					stars(film.rating),
					film.rating,
					film.isFavorite ? 'Yes' : ''
				])
			)
		),
		'watchlist.csv': strToU8(
			csv(
				['tmdbID', 'Title', 'Year'],
				backup.films
					.filter((film) => film.status === 'WANT_TO_WATCH')
					.map((film) => [film.tmdbId, film.title, film.year])
			)
		),
		'reviews.csv': strToU8(
			csv(
				['tmdbID', 'Title', 'Year', 'Review', 'Spoilers', 'Date'],
				backup.films
					.filter((film) => film.review)
					.map((film) => [
						film.tmdbId,
						film.title,
						film.year,
						film.review!.content,
						film.review!.containsSpoilers ? 'Yes' : '',
						film.review!.createdAt.slice(0, 10)
					])
			)
		)
	};

	const used = new Set<string>();
	for (const list of backup.lists) {
		let name = slug(list.title);
		for (let n = 2; used.has(name); n++) name = `${slug(list.title)}-${n}`;
		used.add(name);
		files[`lists/${name}.csv`] = strToU8(
			csv(
				['Position', 'tmdbID', 'Title', 'Year', 'Review'],
				list.items.map((item, i) => [i + 1, item.tmdbId, item.title, item.year, item.note])
			)
		);
	}
	return zipSync(files, { level: 6 });
}
