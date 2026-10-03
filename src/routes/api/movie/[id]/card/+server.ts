import { error, json } from '@sveltejs/kit';
import { getMovieCacheData, TMDbError } from '$lib/server/tmdb';
import { m } from '$lib/paraglide/messages';
import type { RequestHandler } from './$types';

// Exceção permitida (earlySetup.md §5.2): endpoint só de LEITURA — os fantasmas das listas do
// Trakt (que não têm imagens) buscam pôster e título traduzido quando aparecem na tela.
export const GET: RequestHandler = async ({ params, locals, fetch }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, m.error_movie_not_found());

	try {
		const movie = await getMovieCacheData(id, fetch);
		return json(
			{
				title: movie.titles[locals.locale] ?? movie.originalTitle,
				originalTitle: movie.originalTitle,
				posterPath: movie.posters[locals.locale]
			},
			// Depende do idioma de quem pede (cookie): cache só no navegador.
			{ headers: { 'cache-control': 'private, max-age=86400' } }
		);
	} catch (err) {
		if (err instanceof TMDbError && err.status === 404) error(404, m.error_movie_not_found());
		console.error('[api/movie/card] falha:', err);
		error(502, m.error_images_unavailable());
	}
};
