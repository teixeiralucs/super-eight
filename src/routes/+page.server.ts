import { getNowPlaying, getPopular } from '$lib/server/tmdb';
import type { TMDbMovie } from '$lib/tmdb/types';
import type { PageServerLoad } from './$types';

// Consulta o TMDb direto (com cache em memória): os catálogos dependem da região e do idioma
// de quem vê, com sinopse traduzida (por isso não vêm de CatalogEntry; earlySetup.md §4.4.4).
export const load: PageServerLoad = async ({ fetch, locals }) => {
	const ctx = { locale: locals.locale, region: locals.region, fetch };
	const [popular, nowPlaying] = await Promise.all([
		getPopular(ctx).catch(logAndEmpty('popular')),
		getNowPlaying(ctx).catch(logAndEmpty('now_playing'))
	]);

	return {
		featured: popular.filter((movie) => movie.backdropPath).slice(0, 5),
		popular,
		nowPlaying
	};
};

function logAndEmpty(catalog: string) {
	return (error: unknown): TMDbMovie[] => {
		console.error(`[landing] falha ao carregar ${catalog}:`, error);
		return [];
	};
}
