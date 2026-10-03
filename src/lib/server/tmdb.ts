import { TMDB_READ_ACCESS_TOKEN } from '$env/static/private';
import { TMDB_LANGUAGE, type Locale } from '$lib/i18n';
import type {
	CollectionData,
	MovieCacheData,
	MovieImages,
	TMDbMovie,
	TMDbMovieFull
} from '$lib/tmdb/types';
import {
	isShowcaseable,
	toMovie,
	toMovieCache,
	toMovieFull,
	toImages,
	toCollection,
	type RawCollection,
	type CrewLabels,
	type RawGenreList,
	type RawImages,
	type RawMovie,
	type RawMovieForCache,
	type RawMovieFull,
	type RawPage
} from '$lib/server/tmdb-normalize';

export {
	isShowcaseable,
	collectionFields,
	localizedLogos,
	pickLogo,
	pickTranslation,
	pickTrailer,
	regionalRelease,
	toMovie,
	toMovieCache,
	toMovieFull,
	type CrewLabels
} from '$lib/server/tmdb-normalize';

const API_BASE = 'https://api.themoviedb.org/3';

/** Catálogos mudam poucas vezes ao dia; gêneros quase nunca. */
const CATALOG_TTL_MS = 30 * 60 * 1000;
const GENRES_TTL_MS = 24 * 60 * 60 * 1000;

/** Idioma e região de quem pede (vêm de `event.locals`). */
export interface TmdbContext {
	locale: Locale;
	region: string;
	fetch?: typeof fetch;
}

export class TMDbError extends Error {
	constructor(
		readonly status: number,
		readonly path: string
	) {
		super(`TMDb respondeu ${status} em ${path}`);
		this.name = 'TMDbError';
	}
}

// ─── Cache em memória por instância (a Vercel reaproveita instâncias) ─
const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;

	const value = load();
	cache.set(key, { expiresAt: Date.now() + ttlMs, value });
	// Falhas não ficam em cache.
	value.catch(() => cache.delete(key));
	return value;
}

/** `language: null` (ou ausente) = sem idioma (ex.: imagens de todos os idiomas). */
async function tmdbFetch<T>(
	path: string,
	params: Record<string, string | number | null> = {},
	fetchFn: typeof fetch = fetch
): Promise<T> {
	const url = new URL(`${API_BASE}${path}`);
	for (const [key, value] of Object.entries(params)) {
		if (value !== null) url.searchParams.set(key, String(value));
	}

	const response = await fetchFn(url, {
		headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`, Accept: 'application/json' }
	});

	if (!response.ok) throw new TMDbError(response.status, path);
	return response.json() as Promise<T>;
}

// ─── API pública do módulo ───────────────────────────────────────────
export function getGenreNames(locale: Locale, fetchFn?: typeof fetch) {
	return cached(`genres:${locale}`, GENRES_TTL_MS, async () => {
		const data = await tmdbFetch<RawGenreList>(
			'/genre/movie/list',
			{ language: TMDB_LANGUAGE[locale] },
			fetchFn
		);
		return new Map(data.genres.map((genre) => [genre.id, genre.name]));
	});
}

async function getCatalog(path: string, { locale, region, fetch: fetchFn }: TmdbContext) {
	return cached(`catalog:${path}:${locale}:${region}`, CATALOG_TTL_MS, async () => {
		const [page, genreNames] = await Promise.all([
			tmdbFetch<RawPage<RawMovie>>(
				path,
				{ language: TMDB_LANGUAGE[locale], region, page: 1 },
				fetchFn
			),
			getGenreNames(locale, fetchFn)
		]);
		return page.results.filter(isShowcaseable).map((raw) => toMovie(raw, genreNames));
	});
}

export const getPopular = (ctx: TmdbContext) => getCatalog('/movie/popular', ctx);
export const getNowPlaying = (ctx: TmdbContext) => getCatalog('/movie/now_playing', ctx);

/** TMDb não serve além da página 500. */
export const MAX_PAGE = 500;
const SEARCH_TTL_MS = 10 * 60 * 1000;

export interface MoviePage {
	results: TMDbMovie[];
	page: number;
	totalPages: number;
}

/**
 * Uma página de resultados: busca por texto (`/search/movie`) ou, sem termo, os filmes em alta
 * na região. Usada pela rolagem infinita da busca (earlySetup.md §4.2.1).
 */
export function getMoviePage(query: string, page: number, ctx: TmdbContext) {
	const term = query.trim();
	const safePage = Math.min(Math.max(1, Math.floor(page) || 1), MAX_PAGE);
	const language = TMDB_LANGUAGE[ctx.locale];
	const [path, params] = term
		? ['/search/movie', { query: term, include_adult: 'false', language, page: safePage }]
		: ['/movie/popular', { region: ctx.region, language, page: safePage }];
	const key = `page:${path}:${ctx.locale}:${term ? term.toLowerCase() : ctx.region}:${safePage}`;

	return cached(key, SEARCH_TTL_MS, async () => {
		const [raw, genreNames] = await Promise.all([
			tmdbFetch<RawPage<RawMovie>>(path, params, ctx.fetch),
			getGenreNames(ctx.locale, ctx.fetch)
		]);
		return {
			results: raw.results.filter(isShowcaseable).map((movie) => toMovie(movie, genreNames)),
			page: raw.page,
			totalPages: Math.min(raw.total_pages, MAX_PAGE)
		} satisfies MoviePage;
	});
}

/**
 * Dados do filme independentes de idioma (com as traduções), para o cache `Movie`
 * e para enriquecer a busca com direção/país/duração.
 */
export function getMovieCacheData(id: number, fetchFn?: typeof fetch): Promise<MovieCacheData> {
	return cached(`movie:${id}`, CATALOG_TTL_MS, async () =>
		toMovieCache(
			await tmdbFetch<RawMovieForCache>(
				`/movie/${id}`,
				{
					language: 'en-US',
					append_to_response: 'credits,translations,images',
					include_image_language: 'pt,en,es'
				},
				fetchFn
			)
		)
	);
}

/** Detalhes no idioma de quem vê; a resposta crua fica em cache por idioma. */
export async function getMovieFull(
	id: number,
	ctx: TmdbContext,
	labels: CrewLabels
): Promise<TMDbMovieFull> {
	const language = TMDB_LANGUAGE[ctx.locale];
	const [raw, images] = await Promise.all([
		cached(`movie-full:${id}:${ctx.locale}`, CATALOG_TTL_MS, () =>
			tmdbFetch<RawMovieFull>(
				`/movie/${id}`,
				{
					language,
					append_to_response: 'credits,videos,release_dates',
					include_video_language: `${language.slice(0, 2)},en,null`
				},
				ctx.fetch
			)
		),
		// Só para a logo do título: se falhar, o título vai em texto.
		getMovieImages(id, ctx.fetch).catch(() => null)
	]);
	return toMovieFull(raw, language.slice(0, 2), ctx.region, labels, images?.logos);
}

// Imagens sem corte: filmes populares passam de 400 pôsteres, e cortar antes do filtro de
// idioma escondia, por exemplo, os pôsteres em português. A galeria desenha aos poucos.

/** Pôsteres, fundos e logos em todos os idiomas — para a galeria e a personalização do filme. */
export function getMovieImages(id: number, fetchFn?: typeof fetch): Promise<MovieImages> {
	return cached(`movie-images:${id}`, CATALOG_TTL_MS, async () => {
		const raw = await tmdbFetch<RawImages>(`/movie/${id}/images`, {}, fetchFn);
		return {
			backdrops: toImages(raw.backdrops),
			posters: toImages(raw.posters),
			logos: toImages(raw.logos ?? [])
		};
	});
}

type SearchHit = Pick<RawMovie, 'id' | 'release_date'>;

/** TMDb limita por segundo: uma nova tentativa depois de uma pausa quando responde 429. */
async function withRetry<T>(load: () => Promise<T>, attempts = 3): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await load();
		} catch (err) {
			if (!(err instanceof TMDbError) || err.status !== 429 || attempt >= attempts) throw err;
			await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
		}
	}
}

/**
 * ID do TMDb de um filme pelo título e ano (importador do Letterboxd, que não exporta o ID).
 * Ordem: estreia no ano exato → lançado naquele ano em algum país → ano vizinho → sem ano.
 * Entre os resultados, o TMDb já ordena por relevância/popularidade.
 */
export function findMovieId(
	title: string,
	year: number | null,
	fetchFn?: typeof fetch
): Promise<number | null> {
	const key = `find:${title.toLowerCase()}:${year ?? ''}`;
	return cached(key, GENRES_TTL_MS, async () => {
		const search = async (params: Record<string, string | number>) =>
			(
				await withRetry(() =>
					tmdbFetch<RawPage<SearchHit>>(
						'/search/movie',
						{ query: title, include_adult: 'false', ...params },
						fetchFn
					)
				)
			).results;

		if (year) {
			const exact = await search({ primary_release_year: year });
			if (exact[0]) return exact[0].id;
			const released = await search({ year });
			if (released[0]) return released[0].id;
		}
		const any = await search({});
		if (!year) return any[0]?.id ?? null;
		const near = any.find((hit) => Math.abs(Number(hit.release_date?.slice(0, 4)) - year) <= 1);
		return near?.id ?? null;
	});
}

/** Coleção (saga) nos três idiomas do app; o nome muda por idioma. */
export function getCollection(id: number, fetchFn?: typeof fetch): Promise<CollectionData> {
	return cached(`collection:${id}`, CATALOG_TTL_MS, async () => {
		const [pt, en, es] = await Promise.all(
			(['pt', 'en', 'es'] as const).map((locale) =>
				withRetry(() =>
					tmdbFetch<RawCollection>(
						`/collection/${id}`,
						{ language: TMDB_LANGUAGE[locale] },
						fetchFn
					)
				)
			)
		);
		return toCollection({ pt, en, es });
	});
}
