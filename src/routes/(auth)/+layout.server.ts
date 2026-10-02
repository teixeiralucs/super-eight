import { getPopular } from '$lib/server/tmdb';
import type { LayoutServerLoad } from './$types';

// Fundos dos filmes em alta para o painel de imagem das telas de login/cadastro.
export const load: LayoutServerLoad = async ({ fetch, locals }) => {
	const popular = await getPopular({ locale: locals.locale, region: locals.region, fetch }).catch(
		(err) => {
			console.error('[auth] fundos indisponíveis:', err);
			return [];
		}
	);

	return {
		backdrops: popular
			.filter((movie) => movie.backdropPath)
			.slice(0, 6)
			.map(({ id, title, originalTitle, year, backdropPath }) => ({
				id,
				title,
				originalTitle,
				year,
				backdropPath: backdropPath!
			}))
	};
};
