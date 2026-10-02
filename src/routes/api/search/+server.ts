import { error, json } from '@sveltejs/kit';
import { parseSearchPage, parseSearchQuery } from '$lib/search';
import { searchPage } from '$lib/server/search';
import type { RequestHandler } from './$types';

// Exceção permitida (earlySetup.md §5.2): endpoint só de LEITURA para a rolagem infinita da busca.
// Mutações continuam exclusivamente em Form Actions.
export const GET: RequestHandler = async ({ url, locals, fetch }) => {
	const q = parseSearchQuery(url.searchParams);
	const page = parseSearchPage(url.searchParams);

	try {
		return json(
			await searchPage(locals.user?.id ?? null, q, page, {
				locale: locals.locale,
				region: locals.region,
				fetch
			}),
			{
				// Contém o estado da biblioteca do usuário: nunca em cache compartilhado.
				headers: { 'cache-control': 'private, no-store' }
			}
		);
	} catch (err) {
		console.error('[api/search] falha:', err);
		error(502, 'Busca indisponível no momento.');
	}
};
