import { z } from 'zod';
import { m } from '$lib/paraglide/messages';

// Filtros da grade da biblioteca, refletidos na URL (earlySetup.md §6.3.2).

export const LIBRARY_VIEWS = ['all', 'watched', 'watchlist', 'favorites'] as const;
export const LIBRARY_SORTS = ['release', 'recent', 'rating', 'title', 'random'] as const;
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type LibraryView = (typeof LIBRARY_VIEWS)[number];
export type LibrarySort = (typeof LIBRARY_SORTS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** Rótulos são funções: o texto depende do idioma de cada requisição. */
export const viewLabel = (view: LibraryView) =>
	({
		all: m.view_all,
		watched: m.view_watched,
		watchlist: m.view_watchlist,
		favorites: m.view_favorites
	})[view]();

export const DEFAULT_SORT: LibrarySort = 'release';

export const sortLabel = (sort: LibrarySort) =>
	({
		release: m.sort_release,
		recent: m.sort_recent,
		rating: m.sort_rating,
		title: m.sort_title,
		random: m.sort_random
	})[sort]();

/** Direção natural de cada ordenação (aleatório ignora direção). */
export const DEFAULT_DIRECTION: Record<LibrarySort, SortDirection> = {
	release: 'asc',
	recent: 'desc',
	rating: 'desc',
	title: 'asc',
	random: 'asc'
};

/** Rótulo da direção, no vocabulário de cada ordenação. */
export const directionLabel = (sort: Exclude<LibrarySort, 'random'>, dir: SortDirection) =>
	({
		release: { asc: m.dir_release_asc, desc: m.dir_release_desc },
		recent: { asc: m.dir_recent_asc, desc: m.dir_recent_desc },
		rating: { asc: m.dir_rating_asc, desc: m.dir_rating_desc },
		title: { asc: m.dir_title_asc, desc: m.dir_title_desc }
	})[sort][dir]();

/** Nota mínima ("8" = 8 ou mais) ou "none" (sem nota). */
export const RATING_FILTERS = ['10', '9', '8', '7', '6', '5', 'none'] as const;
export type RatingFilter = (typeof RATING_FILTERS)[number];

const optionalMatch = (pattern: RegExp) => z.string().regex(pattern).optional().catch(undefined);

export const libraryFiltersSchema = z
	.object({
		view: z.enum(LIBRARY_VIEWS).catch('all'),
		sort: z.enum(LIBRARY_SORTS).catch(DEFAULT_SORT),
		dir: z.enum(SORT_DIRECTIONS).optional().catch(undefined),
		/** Busca por título (original ou traduzido) ou diretor, sem acento nem caixa. */
		q: z
			.string()
			.trim()
			.max(100)
			.transform((value) => value || undefined)
			.optional()
			.catch(undefined),
		// ID de gênero do TMDb (o nome é traduzido na UI).
		genre: optionalMatch(/^\d{1,6}$/),
		/** Década de lançamento ("1980"). */
		decade: optionalMatch(/^\d{3}0$/),
		country: optionalMatch(/^[A-Z]{2}$/),
		/** Idioma original (ISO 639-1). */
		lang: optionalMatch(/^[a-z]{2,3}$/),
		rating: z.enum(RATING_FILTERS).optional().catch(undefined),
		/** Ano em que foi assistido (alguma sessão no diário). */
		year: optionalMatch(/^\d{4}$/),
		/** Disponível num streaming da região (ID do serviço) ou "mine" (nos que você assina). */
		stream: optionalMatch(/^(mine|\d{1,6})$/)
	})
	.transform((filters) => ({ ...filters, dir: filters.dir ?? DEFAULT_DIRECTION[filters.sort] }));

export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;

/** Filtros do painel (além da busca), na ordem da URL e dos chips. */
export const EXTRA_FILTERS = [
	'genre',
	'decade',
	'country',
	'lang',
	'rating',
	'year',
	'stream'
] as const;
export type ExtraFilter = (typeof EXTRA_FILTERS)[number];

/** Valores que existem na biblioteca, para as opções do painel de filtros. */
export interface LibraryFilterOptions {
	genres: { id: number; name: string }[];
	decades: number[];
	/** ISO 3166-1 (o nome é traduzido na UI). */
	countries: string[];
	/** ISO 639-1. */
	languages: string[];
	/** Anos com sessões no diário. */
	years: number[];
	/** Streamings da região com algum filme da biblioteca. */
	providers: { id: number; name: string; logoPath: string | null }[];
	/** A pessoa marcou os streamings que assina (habilita "Nos meus streamings"). */
	hasServices: boolean;
}

/** Algum filtro além da aba e da ordenação? */
export const hasActiveFilters = (filters: LibraryFilters) =>
	!!filters.q || EXTRA_FILTERS.some((key) => filters[key]);

export function parseLibraryFilters(params: URLSearchParams): LibraryFilters {
	const get = (key: string) => params.get(key) || undefined;
	return libraryFiltersSchema.parse({
		view: get('view'),
		sort: get('sort'),
		dir: get('dir'),
		q: get('q'),
		genre: get('genre'),
		decade: get('decade'),
		country: get('country'),
		lang: get('lang'),
		rating: get('rating'),
		year: get('year'),
		stream: get('stream')
	});
}

/** Query string com os filtros, omitindo valores padrão para URLs limpas. */
export function filtersQuery(filters: LibraryFilters) {
	const pairs: [string, string][] = [];
	if (filters.view !== 'all') pairs.push(['view', filters.view]);
	if (filters.q) pairs.push(['q', filters.q]);
	for (const key of EXTRA_FILTERS) {
		const value = filters[key];
		if (value) pairs.push([key, value]);
	}
	if (filters.sort !== DEFAULT_SORT) pairs.push(['sort', filters.sort]);
	if (filters.sort !== 'random' && filters.dir !== DEFAULT_DIRECTION[filters.sort]) {
		pairs.push(['dir', filters.dir]);
	}
	const query = pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
	return query ? `?${query}` : '';
}

/** Texto comparável: sem acentos, minúsculo ("Amélie" → "amelie"). */
export const foldText = (text: string) =>
	text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
