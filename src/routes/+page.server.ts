import { getNowPlaying, getPopular } from '$lib/server/tmdb';
import type { TMDbMovie } from '$lib/tmdb/types';
import type { PageServerLoad } from './$types';

// Fase 1: consulta o TMDb direto (com cache em memória).
// Fase 2: passará a ler CatalogEntry, alimentado pelo cron (earlySetup.md §4.4).
export const load: PageServerLoad = async ({ fetch }) => {
	const [popular, nowPlaying] = await Promise.all([
		getPopular(fetch).catch(logAndEmpty('popular')),
		getNowPlaying(fetch).catch(logAndEmpty('now_playing'))
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
