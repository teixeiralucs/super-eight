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

export const libraryFiltersSchema = z
	.object({
		view: z.enum(LIBRARY_VIEWS).catch('all'),
		sort: z.enum(LIBRARY_SORTS).catch(DEFAULT_SORT),
		dir: z.enum(SORT_DIRECTIONS).optional().catch(undefined),
		// ID de gênero do TMDb (o nome é traduzido na UI).
		genre: z
			.string()
			.regex(/^\d{1,6}$/)
			.optional()
			.catch(undefined)
	})
	.transform((filters) => ({ ...filters, dir: filters.dir ?? DEFAULT_DIRECTION[filters.sort] }));

export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;

export function parseLibraryFilters(params: URLSearchParams): LibraryFilters {
	return libraryFiltersSchema.parse({
		view: params.get('view') ?? undefined,
		sort: params.get('sort') ?? undefined,
		dir: params.get('dir') ?? undefined,
		genre: params.get('genre') || undefined
	});
}

/** Query string com os filtros, omitindo valores padrão para URLs limpas. */
export function filtersQuery(filters: LibraryFilters) {
	const pairs: [string, string][] = [];
	if (filters.view !== 'all') pairs.push(['view', filters.view]);
	if (filters.genre) pairs.push(['genre', filters.genre]);
	if (filters.sort !== DEFAULT_SORT) pairs.push(['sort', filters.sort]);
	if (filters.sort !== 'random' && filters.dir !== DEFAULT_DIRECTION[filters.sort]) {
		pairs.push(['dir', filters.dir]);
	}
	const query = pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
	return query ? `?${query}` : '';
}
