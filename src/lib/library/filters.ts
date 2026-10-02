import { z } from 'zod';

// Filtros da grade da biblioteca, refletidos na URL (earlySetup.md §6.3.2).

export const LIBRARY_VIEWS = ['all', 'watched', 'watchlist', 'favorites'] as const;
export const LIBRARY_SORTS = ['release', 'recent', 'rating', 'title', 'random'] as const;
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type LibraryView = (typeof LIBRARY_VIEWS)[number];
export type LibrarySort = (typeof LIBRARY_SORTS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const VIEW_LABELS: Record<LibraryView, string> = {
	all: 'Todos',
	watched: 'Assistidos',
	watchlist: 'Quero ver',
	favorites: 'Favoritos'
};

export const DEFAULT_SORT: LibrarySort = 'release';

export const SORT_LABELS: Record<LibrarySort, string> = {
	release: 'Lançamento',
	recent: 'Adicionados',
	rating: 'Minha nota',
	title: 'Título',
	random: 'Aleatório'
};

/** Direção natural de cada ordenação (aleatório ignora direção). */
export const DEFAULT_DIRECTION: Record<LibrarySort, SortDirection> = {
	release: 'asc',
	recent: 'desc',
	rating: 'desc',
	title: 'asc',
	random: 'asc'
};

/** Rótulos da direção, no vocabulário de cada ordenação. */
export const DIRECTION_LABELS: Record<
	Exclude<LibrarySort, 'random'>,
	Record<SortDirection, string>
> = {
	release: { asc: 'Mais antigos primeiro', desc: 'Mais recentes primeiro' },
	recent: { asc: 'Adicionados há mais tempo', desc: 'Adicionados recentemente' },
	rating: { asc: 'Menor nota primeiro', desc: 'Maior nota primeiro' },
	title: { asc: 'A → Z', desc: 'Z → A' }
};

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
