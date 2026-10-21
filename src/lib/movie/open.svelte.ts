import { tick } from 'svelte';
import { goto, preloadData, pushState } from '$app/navigation';
import { resolve } from '$app/paths';
import type { MovieDetailData } from './types';

/** Filme sendo aberto (mostra a barra de carregamento enquanto os dados chegam). */
export const movieOpening = $state({ id: null as number | null });

/**
 * Zoom do pôster (earlySetup.md §6.4.8): o pôster clicado cresce até ocupar a tela e vira o
 * fundo do filme (View Transitions API); ao fechar, o fundo volta para dentro do pôster.
 * `active` desliga a entrada própria do painel enquanto o zoom acontece.
 */
export const heroTransition = $state({ active: false });

const HERO = 'movie-hero';
/** Pôster de onde o painel aberto saiu (para o zoom de volta). */
let origin: { element: HTMLElement; movieId: number } | null = null;

const canZoom = () =>
	typeof document !== 'undefined' &&
	'startViewTransition' in document &&
	!matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fundo do painel aberto (o alvo do zoom). */
const overlayHero = () => document.querySelector<HTMLElement>('[role="dialog"] [data-movie-hero]');

/** Pôster visível dentro do link clicado (cards de pôster, carrossel, diário…). */
function posterIn(link: Element | null) {
	const poster = link?.querySelector<HTMLElement>('[data-poster], img');
	if (!poster) return null;
	const rect = poster.getBoundingClientRect();
	const visible = rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
	return visible ? poster : null;
}

/** Roda `update` dentro de uma transição em que `from` (estado atual) vira `to` (estado novo). */
async function morph(
	from: () => HTMLElement | null,
	to: () => HTMLElement | null,
	update: () => Promise<void>
) {
	const start = from();
	if (!start || !canZoom()) return update();
	heroTransition.active = true;
	start.style.viewTransitionName = HERO;
	let end: HTMLElement | null = null;
	const transition = document.startViewTransition(async () => {
		// Cada nome só pode existir uma vez em cada estado: sai do início, entra no fim.
		start.style.viewTransitionName = '';
		await update();
		await tick();
		end = to();
		if (end) end.style.viewTransitionName = HERO;
	});
	try {
		await transition.finished;
	} catch {
		// Transição pulada (ex.: aba em segundo plano): a mudança já foi aplicada.
	} finally {
		if (end) (end as HTMLElement).style.viewTransitionName = '';
		heroTransition.active = false;
	}
}

/**
 * Abre os detalhes por cima da página atual (shallow routing), como no vídeo de referência.
 * A URL vira /movie/[id]; "voltar" fecha o painel; abrir o link direto mostra a página completa.
 * Cliques com modificador (nova aba etc.) seguem o comportamento normal do link.
 */
export async function openMovie(event: MouseEvent, movieId: number) {
	if (event.defaultPrevented || event.button !== 0) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

	event.preventDefault();
	const link = event.currentTarget instanceof Element ? event.currentTarget : null;
	movieOpening.id = movieId;
	try {
		const href = resolve('/movie/[id]', { id: String(movieId) });
		// Os dados chegam antes do zoom: a tela não fica congelada esperando a rede.
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			const poster = posterIn(link);
			origin = poster ? { element: poster, movieId } : null;
			await morph(
				() => poster,
				overlayHero,
				async () => pushState(href, { movie: result.data as unknown as MovieDetailData })
			);
		} else {
			await goto(href);
		}
	} catch {
		await goto(resolve('/movie/[id]', { id: String(movieId) }));
	} finally {
		movieOpening.id = null;
	}
}

/** Fecha o painel (voltar no histórico), com o fundo voltando para o pôster de origem. */
export async function closeMovie(movieId: number) {
	const back = origin?.movieId === movieId && origin.element.isConnected ? origin.element : null;
	origin = null;
	await morph(
		overlayHero,
		() => back,
		() =>
			new Promise<void>((done) => {
				addEventListener('popstate', () => done(), { once: true });
				history.back();
			})
	);
}
