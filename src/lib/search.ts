// Parâmetros de busca compartilhados entre a página, o endpoint de paginação e o cliente.

export const MAX_QUERY_LENGTH = 100;

export function parseSearchQuery(params: URLSearchParams) {
	return (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
}

/** Quantos resultados (as sugestões da busca rápida pedem poucos); padrão: a página inteira. */
export function parseSearchLimit(params: URLSearchParams) {
	const limit = Number(params.get('limit'));
	return Number.isInteger(limit) && limit >= 1 && limit <= 20 ? limit : undefined;
}

export function parseSearchPage(params: URLSearchParams) {
	const page = Number(params.get('page'));
	return Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1;
}
