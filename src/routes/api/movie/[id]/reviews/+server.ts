import { error, json } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { getMovieReviews } from '$lib/server/reviews';
import type { RequestHandler } from './$types';

// Exceção permitida (earlySetup.md §5.2): endpoint só de LEITURA — a aba Reviews carrega
// sob demanda e recarrega depois de cada action.
export const GET: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, m.error_movie_not_found());
	return json(await getMovieReviews(id, locals.user?.id ?? null), {
		headers: { 'cache-control': 'private, no-store' }
	});
};
