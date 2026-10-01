import { error, json } from '@sveltejs/kit';
import { getMovieImages, TMDbError } from '$lib/server/tmdb';
import type { RequestHandler } from './$types';

// Exceção permitida (earlySetup.md §5.2): endpoint só de LEITURA — a galeria carrega
// pôsteres/fundos de todos os idiomas apenas quando a aba é aberta.
export const GET: RequestHandler = async ({ params, fetch }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Filme não encontrado.');

	try {
		return json(await getMovieImages(id, fetch), {
			headers: { 'cache-control': 'public, max-age=3600' }
		});
	} catch (err) {
		if (err instanceof TMDbError && err.status === 404) error(404, 'Filme não encontrado.');
		console.error('[api/movie/images] falha:', err);
		error(502, 'Imagens indisponíveis no momento.');
	}
};
