import { goto, preloadData, pushState } from '$app/navigation';
import { resolve } from '$app/paths';
import type { MovieDetailData } from './types';

/** Filme sendo aberto (mostra a barra de carregamento enquanto os dados chegam). */
export const movieOpening = $state({ id: null as number | null });

/**
 * Abre os detalhes por cima da página atual (shallow routing), como no vídeo de referência.
 * A URL vira /movie/[id]; "voltar" fecha o painel; abrir o link direto mostra a página completa.
 * Cliques com modificador (nova aba etc.) seguem o comportamento normal do link.
 */
export async function openMovie(event: MouseEvent, movieId: number) {
	if (event.defaultPrevented || event.button !== 0) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

	event.preventDefault();
	movieOpening.id = movieId;
	try {
		const result = await preloadData(resolve('/movie/[id]', { id: String(movieId) }));
		if (result.type === 'loaded' && result.status === 200) {
			pushState(resolve('/movie/[id]', { id: String(movieId) }), {
				movie: result.data as unknown as MovieDetailData
			});
		} else {
			await goto(resolve('/movie/[id]', { id: String(movieId) }));
		}
	} catch {
		await goto(resolve('/movie/[id]', { id: String(movieId) }));
	} finally {
		movieOpening.id = null;
	}
}
