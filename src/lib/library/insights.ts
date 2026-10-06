// Estatísticas da página /stats (earlySetup.md §6.11): cálculo puro, testável, sem banco.
// O período é um ano (sessões daquele ano) ou "all" (todas as sessões).

export type InsightPeriod = number | 'all';

export interface InsightSession {
	movieId: number;
	watchedAt: Date;
	isRewatch: boolean;
}

export interface InsightMovie {
	id: number;
	runtime: number | null;
	releaseYear: number | null;
	genreIds: number[];
	countries: string[];
	originalLanguage: string | null;
	directorIds: number[];
	writerIds: number[];
	castIds: number[];
	composerIds: number[];
	studioIds: number[];
}

export interface InsightEntry {
	rating: number | null;
	isFavorite: boolean;
}

/** Rankings: pessoas por função, estúdios, países, idiomas, gêneros e décadas. */
export const RANKS = [
	'director',
	'cast',
	'writer',
	'composer',
	'studio',
	'country',
	'language',
	'genre',
	'decade'
] as const;
export type RankKind = (typeof RANKS)[number];

export interface RankItem<K = string | number> {
	key: K;
	/** Filmes (distintos) no período. */
	count: number;
	/** Nota média que você deu a eles (nula = nenhum avaliado). */
	averageRating: number | null;
}

export interface TimeBucket {
	/** `YYYY-MM` (período de um ano) ou `YYYY` (todos os anos). */
	key: string;
	sessions: number;
	minutes: number;
}

export interface Insights {
	sessions: number;
	films: number;
	/** Filmes vistos pela primeira vez no período. */
	newFilms: number;
	/** Sessões de revisão (marcadas como tal ou de filme já visto antes). */
	rewatches: number;
	minutes: number;
	averageRating: number | null;
	favorites: number;
	timeline: TimeBucket[];
	/** Sessões por dia da semana (0 = domingo). */
	weekdays: number[];
	ratingHistogram: { rating: number; count: number }[];
	ranks: { [K in RankKind]: RankItem<K extends 'country' | 'language' ? string : number>[] };
	highlights: {
		topRated: number[];
		longest: number | null;
		oldest: number | null;
		mostWatched: { movieId: number; sessions: number } | null;
		first: { movieId: number; date: Date } | null;
		last: { movieId: number; date: Date } | null;
	};
}

/** Quantos itens cada ranking mostra. */
const RANK_SIZE: Record<RankKind, number> = {
	director: 10,
	cast: 10,
	writer: 10,
	composer: 6,
	studio: 8,
	country: 8,
	language: 8,
	genre: 10,
	decade: 12
};

/** Elenco considerado no ranking: os papéis principais (não figurantes). */
const CAST_FOR_RANK = 15;

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Anos com sessões, do mais recente ao mais antigo. */
export const sessionYears = (sessions: InsightSession[]) =>
	[...new Set(sessions.map((s) => s.watchedAt.getUTCFullYear()))].sort((a, b) => b - a);

export function computeInsights(
	allSessions: InsightSession[],
	movies: Map<number, InsightMovie>,
	entries: Map<number, InsightEntry>,
	period: InsightPeriod
): Insights {
	// Ordem cronológica: a primeira sessão de cada filme decide se é revisão.
	const chronological = [...allSessions].sort(
		(a, b) => a.watchedAt.getTime() - b.watchedAt.getTime()
	);
	const inPeriod = (date: Date) => period === 'all' || date.getUTCFullYear() === period;

	const seen = new Set<number>();
	const sessions: (InsightSession & { rewatch: boolean })[] = [];
	for (const session of chronological) {
		const rewatch = session.isRewatch || seen.has(session.movieId);
		seen.add(session.movieId);
		if (inPeriod(session.watchedAt)) sessions.push({ ...session, rewatch });
	}

	const timeline = buildTimeline(sessions, period);
	const timelineByKey = new Map(timeline.map((bucket) => [bucket.key, bucket]));
	const weekdays = Array.from({ length: 7 }, () => 0);
	const sessionsPerFilm = new Map<number, number>();
	const newFilms = new Set<number>();
	let minutes = 0;
	let rewatches = 0;

	for (const session of sessions) {
		const runtime = movies.get(session.movieId)?.runtime ?? 0;
		minutes += runtime;
		if (session.rewatch) rewatches++;
		else newFilms.add(session.movieId);
		weekdays[session.watchedAt.getUTCDay()]++;
		sessionsPerFilm.set(session.movieId, (sessionsPerFilm.get(session.movieId) ?? 0) + 1);
		const key =
			period === 'all'
				? String(session.watchedAt.getUTCFullYear())
				: session.watchedAt.toISOString().slice(0, 7);
		const bucket = timelineByKey.get(key);
		if (bucket) {
			bucket.sessions++;
			bucket.minutes += runtime;
		}
	}

	const films = [...sessionsPerFilm.keys()].flatMap((id) => movies.get(id) ?? []);
	const ratingOf = (id: number) => entries.get(id)?.rating ?? null;
	const rated = films.filter((movie) => ratingOf(movie.id) !== null);
	const histogram = Array.from({ length: 10 }, (_, i) => ({ rating: i + 1, count: 0 }));
	for (const movie of rated) histogram[ratingOf(movie.id)! - 1].count++;

	const byRuntime = films.filter((movie) => movie.runtime);
	const byRelease = films.filter((movie) => movie.releaseYear);
	const [mostWatchedId, mostWatchedCount] = [...sessionsPerFilm].reduce<[number, number]>(
		(best, current) => (current[1] > best[1] ? current : best),
		[0, 0]
	);

	return {
		sessions: sessions.length,
		films: films.length,
		newFilms: newFilms.size,
		rewatches,
		minutes,
		averageRating: rated.length
			? round1(rated.reduce((sum, movie) => sum + ratingOf(movie.id)!, 0) / rated.length)
			: null,
		favorites: films.filter((movie) => entries.get(movie.id)?.isFavorite).length,
		timeline,
		weekdays,
		ratingHistogram: histogram,
		ranks: {
			director: rank(films, (m) => m.directorIds, ratingOf, RANK_SIZE.director),
			cast: rank(films, (m) => m.castIds.slice(0, CAST_FOR_RANK), ratingOf, RANK_SIZE.cast),
			writer: rank(films, (m) => m.writerIds, ratingOf, RANK_SIZE.writer),
			composer: rank(films, (m) => m.composerIds, ratingOf, RANK_SIZE.composer),
			studio: rank(films, (m) => m.studioIds, ratingOf, RANK_SIZE.studio),
			country: rank(films, (m) => m.countries, ratingOf, RANK_SIZE.country),
			language: rank(
				films,
				(m) => (m.originalLanguage ? [m.originalLanguage] : []),
				ratingOf,
				RANK_SIZE.language
			),
			genre: rank(films, (m) => m.genreIds, ratingOf, RANK_SIZE.genre),
			decade: rank(
				films,
				(m) => (m.releaseYear ? [Math.floor(m.releaseYear / 10) * 10] : []),
				ratingOf,
				RANK_SIZE.decade
			).sort((a, b) => a.key - b.key)
		},
		highlights: {
			topRated: rated
				.sort(
					(a, b) =>
						ratingOf(b.id)! - ratingOf(a.id)! ||
						Number(entries.get(b.id)?.isFavorite) - Number(entries.get(a.id)?.isFavorite) ||
						(sessionsPerFilm.get(b.id) ?? 0) - (sessionsPerFilm.get(a.id) ?? 0)
				)
				.slice(0, 6)
				.map((movie) => movie.id),
			longest: byRuntime.length
				? byRuntime.reduce((a, b) => (b.runtime! > a.runtime! ? b : a)).id
				: null,
			oldest: byRelease.length
				? byRelease.reduce((a, b) => (b.releaseYear! < a.releaseYear! ? b : a)).id
				: null,
			mostWatched:
				mostWatchedCount > 1 ? { movieId: mostWatchedId, sessions: mostWatchedCount } : null,
			first: sessions.length ? { movieId: sessions[0].movieId, date: sessions[0].watchedAt } : null,
			last: sessions.length
				? { movieId: sessions.at(-1)!.movieId, date: sessions.at(-1)!.watchedAt }
				: null
		}
	};
}

/** Um ano: os 12 meses. Todos: de o primeiro ano com sessão até o último. */
function buildTimeline(sessions: InsightSession[], period: InsightPeriod): TimeBucket[] {
	if (period !== 'all') {
		return Array.from({ length: 12 }, (_, month) => ({
			key: `${period}-${String(month + 1).padStart(2, '0')}`,
			sessions: 0,
			minutes: 0
		}));
	}
	if (!sessions.length) return [];
	const years = sessions.map((s) => s.watchedAt.getUTCFullYear());
	const first = Math.min(...years);
	const last = Math.max(...years);
	return Array.from({ length: last - first + 1 }, (_, i) => ({
		key: String(first + i),
		sessions: 0,
		minutes: 0
	}));
}

/** Contagem de filmes por chave; desempate pela nota média e depois pela chave. */
function rank<K extends string | number>(
	films: InsightMovie[],
	keysOf: (movie: InsightMovie) => K[],
	ratingOf: (id: number) => number | null,
	size: number
): RankItem<K>[] {
	const totals = new Map<K, { count: number; ratingSum: number; rated: number }>();
	for (const movie of films) {
		const rating = ratingOf(movie.id);
		for (const key of new Set(keysOf(movie))) {
			const total = totals.get(key) ?? { count: 0, ratingSum: 0, rated: 0 };
			total.count++;
			if (rating !== null) {
				total.ratingSum += rating;
				total.rated++;
			}
			totals.set(key, total);
		}
	}
	return [...totals]
		.map(([key, total]) => ({
			key,
			count: total.count,
			averageRating: total.rated ? round1(total.ratingSum / total.rated) : null
		}))
		.sort(
			(a, b) =>
				b.count - a.count ||
				(b.averageRating ?? 0) - (a.averageRating ?? 0) ||
				String(a.key).localeCompare(String(b.key))
		)
		.slice(0, size);
}
