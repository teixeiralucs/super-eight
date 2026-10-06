import { prisma } from '$lib/server/db';
import { ensureMovie, refreshCollection } from '$lib/server/movies';
import { refreshWatch } from '$lib/server/watch';
import { pruneNotifications } from '$lib/server/notifications';
import { checkMovies, refreshTraktList, traktEnabled, TraktRateLimit } from '$lib/server/trakt';

/**
 * Rotina diária (earlySetup.md §4.4): mantém o banco em dia aos poucos. Cada tarefa pega os
 * itens mais antigos e trabalha até o seu prazo; o que sobrar fica para o dia seguinte. Um
 * erro num item não para a tarefa (filmes e sagas com erro esperam a próxima semana).
 */

const DAY = 24 * 60 * 60 * 1000;
/** Filmes, sagas e listas ficam "velhos" depois disto. */
const STALE_MS = 7 * DAY;
/** De quanto em quanto tempo reperguntar ao Trakt em que listas um filme está. */
const TRAKT_RECHECK_MS = 30 * DAY;
/** "Onde assistir" muda toda semana: renova os filmes das bibliotecas a cada 3 dias. */
const WATCH_STALE_MS = 3 * DAY;

interface TaskResult {
	done: number;
	failed: number;
	/** Ainda havia itens quando o prazo acabou. */
	unfinished: boolean;
}

/** Executa `fn` com até `limit` ao mesmo tempo, sem começar nada depois do prazo. */
async function runUntil<T>(
	items: T[],
	deadline: number,
	limit: number,
	fn: (item: T) => Promise<void>,
	label: string
): Promise<TaskResult> {
	let next = 0;
	let done = 0;
	let failed = 0;
	await Promise.all(
		Array.from({ length: limit }, async () => {
			while (next < items.length && Date.now() < deadline) {
				const item = items[next++];
				try {
					await fn(item);
					done++;
				} catch (err) {
					// Limite do Trakt: não adianta continuar esta tarefa hoje.
					if (err instanceof TraktRateLimit) next = items.length;
					failed++;
					console.error(`[cron] ${label}:`, item, String(err));
				}
			}
		})
	);
	return { done, failed, unfinished: next < items.length };
}

const staleBefore = () => new Date(Date.now() - STALE_MS);

/** 1. Filmes do cache: títulos, pôsteres, logos, saga e IMDb. */
async function refreshMovies(deadline: number, fetchFn?: typeof fetch) {
	const movies = await prisma.movie.findMany({
		where: { updatedAt: { lt: staleBefore() } },
		orderBy: { updatedAt: 'asc' },
		take: 2000,
		select: { id: true }
	});
	return runUntil(
		movies,
		deadline,
		4,
		async ({ id }) => {
			try {
				await ensureMovie(id, fetchFn);
			} catch (err) {
				// Falha persistente (ex.: removido do TMDb) não pode ocupar a frente da fila todo dia.
				await prisma.movie.update({ where: { id }, data: { updatedAt: new Date() } });
				throw err;
			}
		},
		'filme'
	);
}

/** 2. Sagas do TMDb: nomes, partes e dados dos fantasmas. */
async function refreshCollections(deadline: number, fetchFn?: typeof fetch) {
	const collections = await prisma.collection.findMany({
		where: { updatedAt: { lt: staleBefore() } },
		orderBy: { updatedAt: 'asc' },
		take: 500,
		select: { id: true }
	});
	return runUntil(
		collections,
		deadline,
		4,
		async ({ id }) => {
			try {
				await refreshCollection(id, fetchFn);
			} catch (err) {
				await prisma.collection.update({ where: { id }, data: { updatedAt: new Date() } });
				throw err;
			}
		},
		'saga'
	);
}

/** 3. Listas oficiais do Trakt (uma de cada vez: o Trakt limita as chamadas). */
async function refreshTraktLists(deadline: number, fetchFn?: typeof fetch) {
	const lists = await prisma.traktList.findMany({
		where: { updatedAt: { lt: staleBefore() } },
		orderBy: { updatedAt: 'asc' },
		take: 300,
		select: { id: true }
	});
	return runUntil(lists, deadline, 1, ({ id }) => refreshTraktList(id, fetchFn), 'lista Trakt');
}

/**
 * 4. Em que listas oficiais estão os filmes das bibliotecas: primeiro os nunca verificados,
 * depois os verificados há mais de 30 dias (para achar listas novas).
 */
async function checkTraktMovies(deadline: number, fetchFn?: typeof fetch) {
	const inLibrary = { libraryEntries: { some: {} } };
	const select = { id: true, imdbId: true } as const;
	const [unchecked, old] = await Promise.all([
		prisma.movie.findMany({ where: { ...inLibrary, traktCheckedAt: null }, take: 500, select }),
		prisma.movie.findMany({
			where: { ...inLibrary, traktCheckedAt: { lt: new Date(Date.now() - TRAKT_RECHECK_MS) } },
			orderBy: { traktCheckedAt: 'asc' },
			take: 500,
			select
		})
	]);
	const movies = [...unchecked, ...old];
	const { checked, retryAfter } = await checkMovies(movies, deadline, fetchFn);
	return {
		done: checked,
		failed: retryAfter ? 1 : 0,
		unfinished: checked < movies.length
	};
}

/** 5. Onde assistir dos filmes das bibliotecas (nunca buscados primeiro, depois os mais antigos). */
async function refreshWatchProviders(deadline: number, fetchFn?: typeof fetch) {
	const movies = await prisma.movie.findMany({
		where: {
			libraryEntries: { some: {} },
			OR: [
				{ watchCheckedAt: null },
				{ watchCheckedAt: { lt: new Date(Date.now() - WATCH_STALE_MS) } }
			]
		},
		orderBy: { watchCheckedAt: { sort: 'asc', nulls: 'first' } },
		take: 3000,
		select: { id: true }
	});
	return runUntil(movies, deadline, 8, ({ id }) => refreshWatch(id, fetchFn), 'onde assistir');
}

/**
 * Roda as tarefas em sequência, cada uma com sua fatia do orçamento total (o que uma não
 * usar passa para as seguintes). Sem `TRAKT_CLIENT_ID`, as tarefas do Trakt são puladas.
 */
export async function runDailyMaintenance(budgetMs: number, fetchFn?: typeof fetch) {
	const started = Date.now();
	const end = started + budgetMs;
	const tasks = [
		{ name: 'movies', share: 0.35, run: refreshMovies },
		{ name: 'collections', share: 0.1, run: refreshCollections },
		{ name: 'watch', share: 0.3, run: refreshWatchProviders },
		...(traktEnabled()
			? [
					{ name: 'traktLists', share: 0.2, run: refreshTraktLists },
					{ name: 'traktMovies', share: 0.25, run: checkTraktMovies }
				]
			: [])
	];
	const totalShare = tasks.reduce((sum, task) => sum + task.share, 0);

	const results: Record<string, TaskResult & { ms: number }> = {};
	let remainingShare = totalShare;
	for (const task of tasks) {
		const now = Date.now();
		// Fatia proporcional do tempo que ainda resta.
		const deadline = Math.min(end, now + ((end - now) * task.share) / remainingShare);
		remainingShare -= task.share;
		const result = await task.run(deadline, fetchFn);
		results[task.name] = { ...result, ms: Date.now() - now };
	}
	// Faxina rápida: avisos com mais de 90 dias (§6.13).
	const prunedNotifications = await pruneNotifications();
	return { ms: Date.now() - started, trakt: traktEnabled(), results, prunedNotifications };
}
