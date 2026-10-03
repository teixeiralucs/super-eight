import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { getMovieCacheData } from '$lib/server/tmdb';
import {
	TRAKT_API,
	toTraktList,
	traktHeaders,
	traktListFields,
	type RawTraktItem,
	type RawTraktList
} from '$lib/server/trakt-normalize';

/**
 * Listas oficiais do Trakt como coleções (earlySetup.md §6.8.5). Só leitura pública (Client
 * ID, sem OAuth). Variável ausente = recurso desligado, sem quebrar nada.
 */
export const traktEnabled = () => Boolean(env.TRAKT_CLIENT_ID);

/** O Trakt limita as chamadas (~1000 a cada 5 min): `retryAfter` em segundos. */
export class TraktRateLimit extends Error {
	constructor(readonly retryAfter: number) {
		super(`Trakt: limite de chamadas (tente em ${retryAfter}s)`);
	}
}

async function traktFetch<T>(path: string, fetchFn: typeof fetch = fetch): Promise<T> {
	const response = await fetchFn(`${TRAKT_API}${path}`, {
		headers: traktHeaders(env.TRAKT_CLIENT_ID ?? '')
	});
	if (response.status === 429) {
		throw new TraktRateLimit(Number(response.headers.get('retry-after')) || 30);
	}
	if (response.status === 404) return [] as T;
	if (!response.ok) throw new Error(`Trakt respondeu ${response.status} em ${path}`);
	return response.json() as Promise<T>;
}

/** ID que o Trakt aceita para o filme: IMDb (do TMDb) ou, sem ele, a busca pelo ID do TMDb. */
async function traktMovieId(movieId: number, imdbId: string | null, fetchFn?: typeof fetch) {
	const imdb = imdbId ?? (await getMovieCacheData(movieId, fetchFn).catch(() => null))?.imdbId;
	if (imdb) return { id: imdb, imdb };
	const hits = await traktFetch<{ movie?: { ids: { trakt: number } } }[]>(
		`/search/tmdb/${movieId}?type=movie`,
		fetchFn
	);
	const trakt = hits.find((hit) => hit.movie)?.movie?.ids.trakt;
	return trakt ? { id: String(trakt), imdb: null } : null;
}

/** Grava (ou renova) uma lista oficial com os filmes dela. */
export async function saveTraktList(list: RawTraktList, fetchFn?: typeof fetch) {
	const items = await traktFetch<RawTraktItem[]>(
		`/lists/${list.ids.trakt}/items/movie?extended=full`,
		fetchFn
	);
	const fields = traktListFields(toTraktList(list, items));
	await prisma.traktList.upsert({
		where: { id: list.ids.trakt },
		create: { id: list.ids.trakt, ...fields },
		update: fields
	});
}

/**
 * Descobre as listas oficiais de um filme e grava as que ainda não conhecemos. Marca o filme
 * como verificado (não volta a perguntar ao Trakt).
 */
async function checkMovie(movie: { id: number; imdbId: string | null }, fetchFn?: typeof fetch) {
	const target = await traktMovieId(movie.id, movie.imdbId, fetchFn);
	if (target) {
		const lists = await traktFetch<RawTraktList[]>(
			`/movies/${encodeURIComponent(target.id)}/lists/official/popular?limit=100`,
			fetchFn
		);
		const known = new Set(
			(
				await prisma.traktList.findMany({
					where: { id: { in: lists.map((list) => list.ids.trakt) } },
					select: { id: true }
				})
			).map((list) => list.id)
		);
		for (const list of lists) {
			if (!known.has(list.ids.trakt)) await saveTraktList(list, fetchFn);
		}
	}
	await prisma.movie.update({
		where: { id: movie.id },
		data: { traktCheckedAt: new Date(), ...(target?.imdb && { imdbId: target.imdb }) }
	});
}

/** Filmes da biblioteca ainda não verificados no Trakt. */
export function countTraktPending(userId: string) {
	if (!traktEnabled()) return Promise.resolve(0);
	return prisma.libraryEntry.count({ where: { userId, movie: { traktCheckedAt: null } } });
}

/**
 * Verifica no Trakt um lote de filmes da biblioteca (os mais recentes primeiro) dentro de um
 * orçamento de tempo — a aba Coleções chama em sequência até acabar. Limite do Trakt:
 * para e devolve quanto esperar.
 */
export async function syncTraktForUser(userId: string, fetchFn?: typeof fetch, budgetMs = 8000) {
	if (!traktEnabled()) return { remaining: 0, retryAfter: null };
	const started = Date.now();
	const pending = await prisma.libraryEntry.findMany({
		where: { userId, movie: { traktCheckedAt: null } },
		orderBy: { addedAt: 'desc' },
		take: 40,
		select: { movie: { select: { id: true, imdbId: true } } }
	});

	let retryAfter: number | null = null;
	for (const { movie } of pending) {
		if (Date.now() - started > budgetMs) break;
		try {
			await checkMovie(movie, fetchFn);
		} catch (err) {
			// Limite ou instabilidade do Trakt: para o lote e tenta de novo mais tarde (filme
			// inexistente no Trakt não chega aqui: o 404 vira "nenhuma lista").
			console.error('[trakt] filme', movie.id, String(err));
			retryAfter = err instanceof TraktRateLimit ? err.retryAfter : 60;
			break;
		}
	}
	return { remaining: await countTraktPending(userId), retryAfter };
}
