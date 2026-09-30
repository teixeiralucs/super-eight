import { z } from 'zod';

// Filtros da grade da biblioteca, refletidos na URL (earlySetup.md §6.3.2).

export const LIBRARY_VIEWS = ['all', 'watched', 'watchlist', 'favorites'] as const;
export const LIBRARY_SORTS = ['release', 'recent', 'rating', 'title'] as const;

export type LibraryView = (typeof LIBRARY_VIEWS)[number];
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export const VIEW_LABELS: Record<LibraryView, string> = {
	all: 'Todos',
	watched: 'Assistidos',
	watchlist: 'Quero ver',
	favorites: 'Favoritos'
};

export const DEFAULT_SORT: LibrarySort = 'release';

export const SORT_LABELS: Record<LibrarySort, string> = {
	release: 'Lançamento',
	recent: 'Adicionados recentemente',
	rating: 'Minha nota',
	title: 'Título (A–Z)'
};

export const libraryFiltersSchema = z.object({
	view: z.enum(LIBRARY_VIEWS).catch('all'),
	sort: z.enum(LIBRARY_SORTS).catch(DEFAULT_SORT),
	genre: z.string().trim().max(40).optional().catch(undefined)
});

export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;

export function parseLibraryFilters(params: URLSearchParams): LibraryFilters {
	return libraryFiltersSchema.parse({
		view: params.get('view') ?? undefined,
		sort: params.get('sort') ?? undefined,
		genre: params.get('genre') || undefined
	});
}
