// Normalização das respostas do Trakt — funções puras, sem `$env`, para poderem rodar
// também nos scripts de linha de comando.
import type { CollectionPart } from '$lib/tmdb/types';

export const TRAKT_API = 'https://api.trakt.tv';

export const traktHeaders = (clientId: string) => ({
	'Content-Type': 'application/json',
	'trakt-api-version': '2',
	'trakt-api-key': clientId,
	'User-Agent': 'SuperEight/1.0'
});

/** Lista em `GET /movies/:id/lists/official`. */
export interface RawTraktList {
	name: string;
	description: string | null;
	item_count?: number;
	type?: string;
	ids: { trakt: number; slug: string };
}

/** Item de `GET /lists/:id/items/movie?extended=full`. */
export interface RawTraktItem {
	rank?: number;
	type: string;
	movie?: {
		title: string;
		year: number | null;
		released?: string | null;
		ids: { trakt: number; tmdb: number | null };
	};
}

export interface TraktListData {
	id: number;
	slug: string;
	name: string;
	description: string | null;
	partIds: number[];
	parts: CollectionPart[];
}

/**
 * Lista + itens → cache `TraktList`. Só filmes com ID do TMDb (os outros não abririam no
 * app), sem repetição, em ordem de lançamento (sem data no fim). O Trakt só tem o título em
 * inglês: os fantasmas buscam pôster e título traduzido no TMDb quando aparecem.
 */
export function toTraktList(list: RawTraktList, items: RawTraktItem[]): TraktListData {
	const seen = new Set<number>();
	const parts: CollectionPart[] = [];
	for (const item of items) {
		const movie = item.movie;
		const tmdb = movie?.ids.tmdb;
		if (item.type !== 'movie' || !movie || !tmdb || seen.has(tmdb)) continue;
		seen.add(tmdb);
		parts.push({
			id: tmdb,
			originalTitle: movie.title,
			titles: { pt: null, en: null, es: null },
			posters: { pt: null, en: null, es: null },
			releaseDate: movie.released || (movie.year ? `${movie.year}-12-31` : null)
		});
	}
	const release = (part: CollectionPart) => part.releaseDate ?? '9999';
	parts.sort((a, b) => release(a).localeCompare(release(b)));
	return {
		id: list.ids.trakt,
		slug: list.ids.slug,
		name: list.name.trim(),
		// Várias listas oficiais repetem o nome na descrição: aí ela não acrescenta nada.
		description:
			list.description?.trim() && list.description.trim() !== list.name.trim()
				? list.description.trim()
				: null,
		partIds: parts.map((part) => part.id),
		parts
	};
}

/** Colunas do cache `TraktList` (servidor e script gravam igual). */
export const traktListFields = (data: TraktListData) => ({
	slug: data.slug,
	name: data.name,
	description: data.description,
	partIds: data.partIds,
	parts: data.parts
});
