import { prisma } from '$lib/server/db';
import { ensureMovie } from '$lib/server/movies';
import { findMovieId } from '$lib/server/tmdb';
import type { ImportStats } from '$lib/import/types';
import type { ImportFilmsInput, ImportListInput, ResolveInput } from '$lib/schemas/import';

/**
 * Importador do Letterboxd (earlySetup.md §6.7). O navegador lê o .zip e manda lotes
 * pequenos: cada chamada termina em poucos segundos (limite de tempo da Vercel) e pode ser
 * repetida sem duplicar nada.
 */

/** Executa `fn` em `items` com no máximo `limit` ao mesmo tempo. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
	const results: R[] = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (next < items.length) {
				const index = next++;
				results[index] = await fn(items[index]);
			}
		})
	);
	return results;
}

/** Nome + ano → ID do TMDb (nulo = não encontrado). */
export function resolveFilms(films: ResolveInput['films'], fetchFn?: typeof fetch) {
	return mapLimit(films, 8, async (film) => ({
		key: film.key,
		tmdbId: await findMovieId(film.name, film.year, fetchFn).catch((err) => {
			console.error('[import] busca falhou:', film.name, film.year, String(err));
			return null;
		})
	}));
}

/** Garante o cache `Movie` só dos filmes que ainda não estão nele. */
async function ensureMovies(ids: number[], fetchFn?: typeof fetch) {
	const unique = [...new Set(ids)];
	const known = await prisma.movie.findMany({
		where: { id: { in: unique } },
		select: { id: true }
	});
	const have = new Set(known.map((movie) => movie.id));
	const failed = new Set<number>();
	await mapLimit(
		unique.filter((id) => !have.has(id)),
		6,
		(id) =>
			ensureMovie(id, fetchFn).catch((err) => {
				console.error('[import] filme não cacheado:', id, String(err));
				failed.add(id);
			})
	);
	return unique.filter((id) => !failed.has(id));
}

const NOTE_MAX = 500;
const REVIEW_MAX = 5000;
const clip = (text: string, max: number) =>
	text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Grava um lote de filmes já resolvidos. Regras para não duplicar nem apagar nada:
 * - sessão com a mesma data de uma que já existe no filme é ignorada;
 * - nota, favorito e review que você já tem no Super Eight são mantidos;
 * - "Quero ver" só entra se o filme ainda não está na biblioteca.
 */
export async function importFilms(
	userId: string,
	films: ImportFilmsInput['films'],
	fetchFn?: typeof fetch
): Promise<ImportStats> {
	const stats: ImportStats = {
		films: 0,
		sessions: 0,
		watchlist: 0,
		favorites: 0,
		reviews: 0,
		lists: 0
	};
	const relevant = films.filter(
		(film) =>
			film.sessions.length ||
			film.watchlist ||
			film.review ||
			film.rating ||
			film.liked ||
			film.artwork
	);
	const available = new Set(
		await ensureMovies(
			relevant.map((film) => film.tmdbId),
			fetchFn
		)
	);

	for (const film of relevant) {
		if (!available.has(film.tmdbId)) continue;
		const movieId = film.tmdbId;
		const where = { userId_movieId: { userId, movieId } };

		await prisma.$transaction(async (tx) => {
			const [existing, entry, review, artwork] = await Promise.all([
				tx.diaryEntry.findMany({ where: { userId, movieId }, select: { watchedAt: true } }),
				tx.libraryEntry.findUnique({ where, select: { rating: true, isFavorite: true } }),
				tx.review.findUnique({ where, select: { id: true } }),
				tx.movieArtwork.findUnique({ where, select: { userId: true } })
			]);

			const known = new Set(existing.map((s) => s.watchedAt.toISOString().slice(0, 10)));
			const fresh = film.sessions.filter((session) => !known.has(session.date));
			// Rewatch: marcado no Letterboxd ou com alguma sessão anterior (já existente ou importada).
			const dates = [...known, ...fresh.map((s) => s.date)].sort();
			if (fresh.length) {
				await tx.diaryEntry.createMany({
					data: fresh.map((session) => ({
						userId,
						movieId,
						watchedAt: day(session.date),
						rating: session.rating,
						isRewatch: session.rewatch || dates.indexOf(session.date) > 0,
						note: session.note ? clip(session.note, NOTE_MAX) : null
					}))
				});
				stats.sessions += fresh.length;
			}

			const watched = dates.length > 0;
			if (watched) {
				// Nota: a sua (se já tinha) > a atual do Letterboxd > a da última sessão com nota.
				const lastRated = [...film.sessions].reverse().find((s) => s.rating)?.rating ?? null;
				const rating = entry?.rating ?? film.rating ?? lastRated;
				const isFavorite = Boolean(entry?.isFavorite) || film.liked;
				await tx.libraryEntry.upsert({
					where,
					create: { userId, movieId, status: 'WATCHED', rating, isFavorite },
					update: { status: 'WATCHED', rating, isFavorite }
				});
				if (isFavorite && !entry?.isFavorite) stats.favorites++;
			} else if (film.watchlist && !entry) {
				await tx.libraryEntry.create({ data: { userId, movieId, status: 'WANT_TO_WATCH' } });
				stats.watchlist++;
			}

			if (film.review && !review) {
				const date = film.review.date ? day(film.review.date) : undefined;
				await tx.review.create({
					data: {
						userId,
						movieId,
						content: clip(film.review.text, REVIEW_MAX),
						containsSpoilers: film.review.spoilers ?? false,
						...(date && { createdAt: date })
					}
				});
				stats.reviews++;
			}

			// Imagens da Galeria (backup): só se você ainda não escolheu outras aqui.
			const art = film.artwork;
			if (art && !artwork && (art.posterPath || art.backdropPath || art.logoPath)) {
				await tx.movieArtwork.create({ data: { userId, movieId, ...art } });
			}
		});
		stats.films++;
	}
	return stats;
}

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;

/**
 * Uma lista (ou uma parte dela): do Letterboxd entra privada e livre; do backup, com o tipo e
 * a visibilidade originais. Se você já tem uma lista com o
 * mesmo nome, os filmes que faltam entram no fim dela — importar de novo não cria cópias, e
 * listas grandes chegam em partes.
 */
export async function importList(userId: string, list: ImportListInput, fetchFn?: typeof fetch) {
	const available = new Set(await ensureMovies(list.movieIds, fetchFn));
	const title = clip(list.title.trim(), TITLE_MAX);
	const target =
		(await prisma.list.findFirst({
			where: { userId, title: { equals: title, mode: 'insensitive' } },
			select: { id: true }
		})) ??
		(await prisma.list.create({
			data: {
				userId,
				title,
				description: list.description ? clip(list.description, DESCRIPTION_MAX) : null,
				kind: list.kind ?? 'COLLECTION',
				isPublic: list.isPublic ?? false
			},
			select: { id: true }
		}));

	const present = await prisma.listMovie.findMany({
		where: { listId: target.id },
		select: { movieId: true, position: true }
	});
	const inList = new Set(present.map((item) => item.movieId));
	let position = present.reduce((max, item) => Math.max(max, item.position), 0);
	const additions = [...new Set(list.movieIds)].filter(
		(id) => available.has(id) && !inList.has(id)
	);
	if (additions.length) {
		await prisma.listMovie.createMany({
			data: additions.map((movieId) => ({ listId: target.id, movieId, position: ++position })),
			skipDuplicates: true
		});
	}
	return additions.length;
}

/** Coleções ocultas (backup): volta a ocultá-las. */
export async function importHiddenCollections(
	userId: string,
	collections: { source: 'tmdb' | 'trakt'; id: number }[]
) {
	const result = await prisma.hiddenCollection.createMany({
		data: collections.map((c) => ({
			userId,
			source: c.source === 'trakt' ? ('TRAKT' as const) : ('TMDB' as const),
			collectionId: c.id
		})),
		skipDuplicates: true
	});
	return result.count;
}
