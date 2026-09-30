// Parâmetros de busca compartilhados entre a página, o endpoint de paginação e o cliente.

export const MAX_QUERY_LENGTH = 100;

export function parseSearchQuery(params: URLSearchParams) {
	return (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
}

export function parseSearchPage(params: URLSearchParams) {
	const page = Number(params.get('page'));
	return Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1;
}
